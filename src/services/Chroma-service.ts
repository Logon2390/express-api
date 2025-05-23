import axios, { AxiosInstance } from 'axios';
import { ChromaApiConfig } from '../core/config';
import { IChromaService, ChromaApiResponse, AppError, ILogger } from '../models/types';

export class ChromaService implements IChromaService {
  private httpClient: AxiosInstance;
  private logger: ILogger;

  constructor(
    private config: ChromaApiConfig,
    logger: ILogger
  ) {
    this.logger = logger;
    this.httpClient = axios.create({
      baseURL: this.config.url,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  public async askQuestion(question: string): Promise<string> {
    try {
      this.logger.info('Sending question to Chroma API', { question });
      
      const response = await this.httpClient.get<ChromaApiResponse>('/search', {
        params: {
          query: question.trim(),
          limit: 1,
        },
      });

      this.logger.info('Chroma API response', { 
        responseLength: response.data?.length || 0,
        firstResult: response.data?.[0]?.id || 'none' 
      });

      // Check if we have results
      if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
        throw new AppError('No results found for your question', 404);
      }

      // Get the first (most relevant) result
      const firstResult = response.data[0];
      
      if (!firstResult.text || !firstResult.text.trim()) {
        throw new AppError('Found result but no text content available', 400);
      }

      this.logger.info('Successfully received response from Chroma API', {
        resultId: firstResult.id,
        textLength: firstResult.text.length
      });

      // Aquí llamamos a la API de Ollama usando el contexto de Chroma
    const ollamaPrompt = `Contexto:\n${firstResult.text}\n\nPregunta:\n${question}`;
    const ollamaResponse = await axios.post(
      process.env.API_OLLAMA || 'https://host.docker.internal:11434/api/generate',
      {
        model: process.env.OLLAMA_MODEL || 'gemma3',
        prompt: ollamaPrompt,
        stream: false
      }
    );

    if (!ollamaResponse.data || !ollamaResponse.data.response) {
      throw new AppError('No response from Ollama', 500);
    }
    console.log('Ollama response:', ollamaResponse.data.response);
    return ollamaResponse.data.response;
      
    } catch (error) {
      this.logger.error('Error calling Chroma API:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new AppError('Chroma API request timeout', 408);
        }
        
        if (error.response?.status === 404) {
          throw new AppError('No matching documents found in the knowledge base', 404);
        }
        
        if (error.response?.status) {
          throw new AppError(
            `Chroma API error: ${error.response.statusText}`,
            error.response.status
          );
        }
        
        if (error.request) {
          throw new AppError('Unable to reach Chroma API', 503);
        }
      }
      
      throw new AppError('Unexpected error occurred while calling Chroma API', 500);
    }
  }

  private setupInterceptors(): void {
    this.httpClient.interceptors.request.use(
      (config) => {
        this.logger.info(`Making request to: ${config.url}`);
        return config;
      },
      (error) => {
        this.logger.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    this.httpClient.interceptors.response.use(
      (response) => {
        this.logger.info(`Response received: ${response.status}`);
        return response;
      },
      (error) => {
        this.logger.error('Response interceptor error:', error?.response?.status || 'Unknown');
        return Promise.reject(error);
      }
    );
  }
} 