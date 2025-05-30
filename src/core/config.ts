import dotenv from 'dotenv';

dotenv.config();

export interface DiscordConfig {
  token: string;
  clientId: string;
}

export interface ChromaApiConfig {
  url: string;
  timeout: number;
}

export interface OllamaApiConfig {
  url: string;
  model: string;
}

export interface ServerConfig {
  port: number;
  nodeEnv: string;
  allowedOrigins: string[];
}

export interface AppConfig {
  discord: DiscordConfig;
  chromaApi: ChromaApiConfig;
  ollamaApi: OllamaApiConfig;
  server: ServerConfig;
}

class ConfigService {
  private static instance: ConfigService;
  private config: AppConfig;

  private constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  public getConfig(): AppConfig {
    return this.config;
  }

  private loadConfig(): AppConfig {
    return {
      discord: {
        token: process.env.DISCORD_TOKEN || '',
        clientId: process.env.DISCORD_CLIENT_ID || '',
      },
      chromaApi: {
        url: process.env.CHROMA_API_URL || 'http://localhost:9000/api/v1/',
        timeout: parseInt(process.env.CHROMA_API_TIMEOUT || '30000', 10),
      },
      ollamaApi: {
        url: process.env.OLLAMA_API_URL || 'http://localhost:11434/api/generate',
        model: process.env.OLLAMA_MODEL || 'gemma3',
      },
      server: {
        port: parseInt(process.env.PORT || '3000', 10),
        nodeEnv: process.env.NODE_ENV || 'development',
        allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
      },
    };
  }

  private validateConfig(): void {
    const { discord, chromaApi, server, ollamaApi } = this.config;

    if (!discord.token) {
      throw new Error('DISCORD_TOKEN is required');
    }

    if (!discord.clientId) {
      throw new Error('DISCORD_CLIENT_ID is required');
    }

    if (!chromaApi.url) {
      throw new Error('CHROMA_API_URL is required');
    }

    if (isNaN(server.port) || server.port <= 0) {
      throw new Error('PORT must be a valid positive number');
    }

    if (!ollamaApi.url) {
      throw new Error('OLLAMA_API_URL is required');
    }

    if (!ollamaApi.model) {
      throw new Error('OLLAMA_MODEL is required');
    }
  }
}

export const config = ConfigService.getInstance().getConfig();
