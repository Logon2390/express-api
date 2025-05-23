import express, { Application } from 'express';
import cors from 'cors';
import { ServerConfig } from './core/config';
import { ILogger, IChromaService } from './models/types';
import { ApiRoutes, errorHandler, requestLogger } from './routes/api';

export class ExpressServer {
  private app: Application;
  private config: ServerConfig;
  private logger: ILogger;

  constructor(
    config: ServerConfig,
    chromaService: IChromaService,
    logger: ILogger
  ) {
    this.config = config;
    this.logger = logger;
    this.app = express();
    
    this.setupMiddleware();
    this.setupRoutes(chromaService);
    this.setupErrorHandling();
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      const server = this.app.listen(this.config.port, () => {
        this.logger.info(`Express server running on port ${this.config.port}`);
        this.logger.info(`Environment: ${this.config.nodeEnv}`);
        resolve();
      });

      server.on('error', (error) => {
        this.logger.error('Failed to start Express server:', error);
        reject(error);
      });
    });
  }

  public getApp(): Application {
    return this.app;
  }

  private setupMiddleware(): void {
    // Request logging
    this.app.use(requestLogger(this.logger));

    // CORS configuration
    this.app.use(cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (this.config.allowedOrigins.includes('*') || 
            this.config.allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        
        const msg = `The CORS policy for this site does not allow access from the specified origin: ${origin}`;
        return callback(new Error(msg), false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }));

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Security headers
    this.app.use((req, res, next) => {
      res.header('X-Content-Type-Options', 'nosniff');
      res.header('X-Frame-Options', 'DENY');
      res.header('X-XSS-Protection', '1; mode=block');
      next();
    });

    // Health check endpoint (before API routes)
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'Discord AI Bot API is running',
        timestamp: new Date().toISOString(),
      });
    });
  }

  private setupRoutes(chromaService: IChromaService): void {
    const apiRoutes = new ApiRoutes(chromaService, this.logger);
    this.app.use('/api', apiRoutes.getRouter());
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use(errorHandler);

    // Graceful shutdown handling
    process.on('SIGTERM', this.gracefulShutdown.bind(this));
    process.on('SIGINT', this.gracefulShutdown.bind(this));
  }

  private gracefulShutdown(): void {
    this.logger.info('Received shutdown signal, closing server gracefully...');
    
    process.exit(0);
  }
} 