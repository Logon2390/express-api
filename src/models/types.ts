// Chroma API Response Types
export interface DocumentMetadata {
  filename?: string;
  file_type?: string;
  content_length?: number;
  upload_timestamp?: string;
  additional_metadata?: {
    character_count?: number;
    content_length?: number;
    doc_id?: string;
    extracted_at?: string;
    file_size?: number;
    file_type?: string;
    filename?: string;
    line_count?: number;
    parent_doc_id?: string;
    upload_timestamp?: string;
    word_count?: number;
  };
  [key: string]: any;
}

export interface DocumentChunk {
  id: string;
  text: string;
  metadata: DocumentMetadata;
  embedding_id?: string;
}

// Array of DocumentChunk
export type ChromaApiResponse = DocumentChunk[];

// Discord Command Types
export interface AskCommandOptions {
  question: string;
}

// HTTP Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Error Types
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Service Interface Types
export interface IChromaService {
  askQuestion(question: string): Promise<string>;
}

export interface IDiscordService {
  start(): Promise<void>;
  stop(): Promise<void>;
}

export interface ILogger {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}
