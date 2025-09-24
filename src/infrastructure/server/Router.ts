import { Router as ExpressRouter } from 'express';

export class Router {
  private router: ExpressRouter;

  constructor() {
    this.router = ExpressRouter();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Placeholder routes - will be implemented in later tasks
    this.router.get('/', (_req, res) => {
      res.json({
        message: 'Dynamic Knowledge Base API v1',
        endpoints: {
          topics: '/api/v1/topics',
          resources: '/api/v1/resources',
          users: '/api/v1/users',
        },
      });
    });

    // Route placeholders for future implementation
    this.router.use('/topics', this.createPlaceholderRouter('Topics'));
    this.router.use('/resources', this.createPlaceholderRouter('Resources'));
    this.router.use('/users', this.createPlaceholderRouter('Users'));
  }

  private createPlaceholderRouter(entityName: string): ExpressRouter {
    const router = ExpressRouter();

    router.all('*', (req, res) => {
      res.status(501).json({
        status: 'not_implemented',
        message: `${entityName} endpoints will be implemented in future tasks`,
        method: req.method,
        path: req.path,
      });
    });

    return router;
  }

  public getRoutes(): ExpressRouter {
    return this.router;
  }
}
