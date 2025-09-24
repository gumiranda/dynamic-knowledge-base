import express, { Application, Request, Response, NextFunction } from 'express';
import { ErrorHandler } from '../middleware/ErrorHandler';
import { LoggingMiddleware } from '../middleware/LoggingMiddleware';
import { ValidationMiddleware } from '../middleware/ValidationMiddleware';
import { Router } from './Router';

export class AppServer {
  private app: Application;
  private router: Router;

  constructor(app: Application) {
    this.app = app;
    this.router = new Router();
  }

  public async initialize(): Promise<void> {
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Custom middleware
    this.app.use(LoggingMiddleware.log);
    this.app.use(ValidationMiddleware.validateContentType);

    // CORS middleware (basic implementation)
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS'
      );
      res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization'
      );

      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (_req: Request, res: Response) => {
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'Dynamic Knowledge Base API',
      });
    });

    // API routes
    this.app.use('/api/v1', this.router.getRoutes());

    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        status: 'error',
        message: `Route ${req.originalUrl} not found`,
      });
    });
  }

  private setupErrorHandling(): void {
    this.app.use(ErrorHandler.handle);
  }
}
