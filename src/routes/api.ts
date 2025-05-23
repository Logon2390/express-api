import { Router, Request, Response, NextFunction } from 'express';
import { IChromaService, ILogger, ApiResponse, AppError } from '../models/types';

export class ApiRoutes {
  private router: Router;
  private chromaService: IChromaService;
  private logger: ILogger;

  constructor(chromaService: IChromaService, logger: ILogger) {
    this.chromaService = chromaService;
    this.logger = logger;
    this.router = Router();
    this.setupRoutes();
  }

  public getRouter(): Router {
    return this.router;
  }

  private setupRoutes(): void {
    this.router.get('/health', this.healthCheck.bind(this));
    this.router.post('/ask', this.askQuestion.bind(this));
    this.router.get('/status', this.getStatus.bind(this));
  }

  private async healthCheck(req: Request, res: Response): Promise<void> {
    const response: ApiResponse = {
      success: true,
      message: 'Service is healthy',
      data: {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
    };

    res.status(200).json(response);
  }

  private async askQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { question } = req.body;

      if (!question || typeof question !== 'string' || !question.trim()) {
        throw new AppError('Question is required and must be a non-empty string', 400);
      }

      this.logger.info('API ask question request', { 
        question: question.trim(),
        ip: req.ip 
      });

      const answer = await this.chromaService.askQuestion(question.trim());

      const response: ApiResponse = {
        success: true,
        data: {
          question: question.trim(),
          answer,
          timestamp: new Date().toISOString(),
        },
      };

      this.logger.info('API ask question response sent successfully');
      res.status(200).json(response);

    } catch (error) {
      next(error);
    }
  }

  private async getStatus(req: Request, res: Response): Promise<void> {
    const response: ApiResponse = {
      success: true,
      data: {
        service: 'Discord AI Bot API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      },
    };

    res.status(200).json(response);
  }
}

// Error handling middleware
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (res.headersSent) {
    return next(error);
  }

  let statusCode = 500;
  let message = 'Internal server error';

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  }

  const response: ApiResponse = {
    success: false,
    error: message,
  };

  res.status(statusCode).json(response);
}

// Request logging middleware
export function requestLogger(logger: ILogger) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info(`${req.method} ${req.originalUrl}`, {
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
    });

    next();
  };
}
