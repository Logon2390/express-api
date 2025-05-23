import { SlashCommandBuilder, ChatInputCommandInteraction, SlashCommandOptionsOnlyBuilder } from 'discord.js';
import { IChromaService, ILogger, AskCommandOptions, AppError } from '../models/types';

export interface Command {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export class AskCommand implements Command {
  public data: SlashCommandOptionsOnlyBuilder;

  constructor(
    private chromaService: IChromaService,
    private logger: ILogger
  ) {
    this.data = new SlashCommandBuilder()
      .setName('ask')
      .setDescription('Ask a question to the AI')
      .addStringOption(option =>
        option
          .setName('question')
          .setDescription('Your question for the AI')
          .setRequired(true)
          .setMaxLength(2000)
      );
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const options = this.extractOptions(interaction);
    
    try {
      await interaction.deferReply();
      
      this.logger.info('Processing ask command', { 
        userId: interaction.user.id,
        question: options.question 
      });

      if (!options.question?.trim()) {
        await interaction.editReply({
          content: '❌ Please provide a valid question.'
        });
        return;
      }

      const answer = await this.chromaService.askQuestion(options.question);

      if (!answer?.trim()) {
        await interaction.editReply({
          content: '❌ I received an empty response from the Chroma-API. Please try again.'
        });
        return;
      }

      // Discord messages have a 2000 character limit
      const truncatedAnswer = this.truncateMessage(answer, 1900);

      await interaction.editReply({
        content: `**Question:** ${options.question}\n\n**Answer:** ${truncatedAnswer}`
      });

      this.logger.info('Successfully responded to ask command', { 
        userId: interaction.user.id 
      });

    } catch (error) {
      this.logger.error('Error executing ask command:', error);
      
      let errorMessage = '❌ An unexpected error occurred. Please try again later.';
      
      if (error instanceof AppError) {
        switch (error.statusCode) {
          case 408:
            errorMessage = '⏱️ The Chroma-API is taking too long to respond. Please try again.';
            break;
          case 503:
            errorMessage = '🔌 Unable to connect to the Chroma-API. Please try again later.';
            break;
          case 400:
            errorMessage = '❌ Invalid question format. Please rephrase your question.';
            break;
          default:
            errorMessage = `❌ Error: ${error.message}`;
        }
      }

      try {
        await interaction.editReply({ content: errorMessage });
      } catch (replyError) {
        this.logger.error('Failed to send error message:', replyError);
      }
    }
  }

  private extractOptions(interaction: ChatInputCommandInteraction): AskCommandOptions {
    return {
      question: interaction.options.getString('question', true),
    };
  }

  private truncateMessage(message: string, maxLength: number): string {
    if (message.length <= maxLength) {
      return message;
    }
    
    return message.substring(0, maxLength - 3) + '...';
  }
}

export function createCommands(chromaService: IChromaService, logger: ILogger): Command[] {
  return [
    new AskCommand(chromaService, logger),
  ];
} 