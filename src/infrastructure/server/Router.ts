import { Router as ExpressRouter } from 'express';
import { createTopicRoutes } from '../routes/topicRoutes';
import { createResourceRoutes } from '../routes/resourceRoutes';
import { createUserRoutes } from '../routes/userRoutes';
import { createPathRoutes } from '../routes/pathRoutes';

export class Router {
  private router: ExpressRouter;

  constructor() {
    this.router = ExpressRouter();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // API information endpoint
    this.router.get('/', (_req, res) => {
      res.json({
        message: 'Dynamic Knowledge Base API v1',
        endpoints: {
          topics: '/api/v1/topics',
          resources: '/api/v1/resources',
          users: '/api/v1/users',
          path: '/api/v1/path',
        },
      });
    });

    // Topic routes (implemented)
    this.router.use('/topics', createTopicRoutes());

    // Resource routes (implemented)
    this.router.use('/resources', createResourceRoutes());

    // User routes (implemented)
    this.router.use('/users', createUserRoutes());

    // Path routes (implemented)
    this.router.use('/path', createPathRoutes());
  }

  public getRoutes(): ExpressRouter {
    return this.router;
  }
}
