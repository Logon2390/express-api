import { Client, GatewayIntentBits, Collection, REST, Routes } from 'discord.js';
import { DiscordConfig } from '../core/config';
import { IDiscordService, IChromaService, ILogger } from '../models/types';
import { Command, createCommands } from './commands';

export class DiscordService implements IDiscordService {
  private client: Client;
  private commands: Collection<string, Command>;
  private logger: ILogger;
  private chromaService: IChromaService;
  private config: DiscordConfig;

  constructor(
    config: DiscordConfig,
    chromaService: IChromaService,
    logger: ILogger
  ) {
    this.config = config;
    this.chromaService = chromaService;
    this.logger = logger;
    this.commands = new Collection();

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
      ],
    });

    this.setupEventHandlers();
    this.loadCommands();
  }

  public async start(): Promise<void> {
    try {
      this.logger.info('Starting Discord bot...');
      
      await this.registerCommands();
      await this.client.login(this.config.token);
      
      this.logger.info('Discord bot started successfully');
    } catch (error) {
      this.logger.error('Failed to start Discord bot:', error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    try {
      this.logger.info('Stopping Discord bot...');
      
      this.client.destroy();
      
      this.logger.info('Discord bot stopped successfully');
    } catch (error) {
      this.logger.error('Error stopping Discord bot:', error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    this.client.once('ready', () => {
      this.logger.info(`Discord bot logged in as ${this.client.user?.tag}`);
    });

    this.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      const command = this.commands.get(interaction.commandName);

      if (!command) {
        this.logger.warn(`Unknown command: ${interaction.commandName}`);
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        this.logger.error(`Error executing command ${interaction.commandName}:`, error);
        
        const errorMessage = '❌ There was an error while executing this command!';
        
        try {
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: errorMessage, ephemeral: true });
          } else {
            await interaction.reply({ content: errorMessage, ephemeral: true });
          }
        } catch (replyError) {
          this.logger.error('Failed to send error message:', replyError);
        }
      }
    });

    this.client.on('error', (error) => {
      this.logger.error('Discord client error:', error);
    });

    this.client.on('warn', (warning) => {
      this.logger.warn('Discord client warning:', warning);
    });
  }

  private loadCommands(): void {
    const commandInstances = createCommands(this.chromaService, this.logger);
    
    for (const command of commandInstances) {
      this.commands.set(command.data.name, command);
      this.logger.info(`Loaded command: ${command.data.name}`);
    }
  }

  private async registerCommands(): Promise<void> {
    try {
      this.logger.info('Registering slash commands...');

      const rest = new REST().setToken(this.config.token);
      const commandData = Array.from(this.commands.values()).map(command => 
        command.data.toJSON()
      );

      await rest.put(
        Routes.applicationCommands(this.config.clientId),
        { body: commandData }
      );

      this.logger.info(`Successfully registered ${commandData.length} slash commands`);
    } catch (error) {
      this.logger.error('Failed to register slash commands:', error);
      throw error;
    }
  }
}
