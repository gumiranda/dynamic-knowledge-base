import express, { Application } from 'express';
import { Router } from 'express';
import { FileDatabase } from '../../infrastructure/database/FileDatabase';
import { TopicController } from '../../infrastructure/controllers/TopicController';
import { ResourceController } from '../../infrastructure/controllers/ResourceController';
import { UserController } from '../../infrastructure/controllers/UserController';
import { PathController } from '../../infrastructure/controllers/PathController';
import { TopicService } from '../../application/services/TopicService';
import { ResourceService } from '../../application/services/ResourceService';
import { UserService } from '../../application/services/UserService';
import { TopicPathFinder } from '../../application/services/TopicPathFinder';
import { TopicRepository } from '../../infrastructure/repositories/TopicRepository';
import { ResourceRepository } from '../../infrastructure/repositories/ResourceRepository';
import { UserRepository } from '../../infrastructure/repositories/UserRepository';
import { TopicVersionFactory } from '../../domain/factories/TopicVersionFactory';
import { ValidationMiddleware } from '../../infrastructure/middleware/ValidationMiddleware';
import { AuthMiddleware } from '../../infrastructure/middleware/AuthMiddleware';
import { ErrorHandler } from '../../infrastructure/middleware/ErrorHandler';
import { LoggingMiddleware } from '../../infrastructure/middleware/LoggingMiddleware';
import { UserRole } from '../../domain/enums/UserRole';

/**
 * Test server that allows dependency injection for integration tests
 */
export class TestServer {
  private app: Application;
  private database: FileDatabase;

  constructor(database: FileDatabase) {
    this.app = express();
    this.database = database;
  }

  async initialize(): Promise<Application> {
    this.setupMiddleware();
    await this.setupRoutes();
    this.setupErrorHandling();
    return this.app;
  }

  private setupMiddleware(): void {
    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Custom middleware
    this.app.use(LoggingMiddleware.log);
    this.app.use(ValidationMiddleware.validateContentType);

    // CORS middleware (basic implementation)
    this.app.use((req, res, next) => {
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

    // Initialize authentication middleware with test database
    AuthMiddleware.initialize(this.database);
  }

  private async setupRoutes(): Promise<void> {
    const router = Router();

    // Initialize repositories
    const topicRepository = new TopicRepository(this.database);
    const resourceRepository = new ResourceRepository(this.database);
    const userRepository = new UserRepository(this.database);

    // Initialize services
    const versionFactory = new TopicVersionFactory();
    const topicService = new TopicService(topicRepository, versionFactory);
    const resourceService = new ResourceService(
      resourceRepository,
      topicRepository
    );
    const userService = new UserService(userRepository);
    const topicPathFinder = new TopicPathFinder(topicRepository);

    // Initialize controllers
    const topicController = new TopicController(topicService);
    const resourceController = new ResourceController(resourceService);
    const userController = new UserController(userService);
    const pathController = new PathController(topicPathFinder);

    // API information endpoint
    router.get('/', (_req, res) => {
      res.json({
        message: 'Dynamic Knowledge Base API v1',
        endpoints: {
          topics: '/topics',
          resources: '/resources',
          users: '/users',
          path: '/path',
        },
      });
    });

    // Topic routes
    const topicRouter = Router();
    topicRouter.use(AuthMiddleware.authenticate);
    
    const validateCreateTopic = ValidationMiddleware.validateRequiredFields([
      'name',
      'content',
    ]);
    
    topicRouter.post('/', 
      AuthMiddleware.requireAnyRole([UserRole.ADMIN, UserRole.EDITOR]),
      validateCreateTopic,
      topicController.createTopic
    );
    
    topicRouter.get('/', topicController.getTopics);
    // Search endpoint needs to be implemented or removed
    topicRouter.get('/:id', topicController.getTopic);
    topicRouter.get('/:id/hierarchy', topicController.getTopicHierarchy);
    
    topicRouter.put('/:id',
      AuthMiddleware.requireAnyRole([UserRole.ADMIN, UserRole.EDITOR]),
      topicController.updateTopic
    );
    
    topicRouter.delete('/:id',
      AuthMiddleware.requireRole(UserRole.ADMIN),
      topicController.deleteTopic
    );

    router.use('/topics', topicRouter);

    // Resource routes
    const resourceRouter = Router();
    resourceRouter.use(AuthMiddleware.authenticate);
    
    const validateCreateResource = ValidationMiddleware.validateRequiredFields([
      'topicId',
      'name',
      'url',
      'type',
    ]);
    
    resourceRouter.post('/',
      AuthMiddleware.requireAnyRole([UserRole.ADMIN, UserRole.EDITOR]),
      validateCreateResource,
      resourceController.createResource
    );
    
    resourceRouter.get('/', resourceController.getResources);
    resourceRouter.get('/:id', resourceController.getResource);
    
    resourceRouter.put('/:id',
      AuthMiddleware.requireAnyRole([UserRole.ADMIN, UserRole.EDITOR]),
      resourceController.updateResource
    );
    
    resourceRouter.delete('/:id',
      AuthMiddleware.requireRole(UserRole.ADMIN),
      resourceController.deleteResource
    );

    router.use('/resources', resourceRouter);

    // User routes
    const userRouter = Router();
    
    const validateRegisterUser = ValidationMiddleware.validateRequiredFields([
      'name',
      'email',
      'role',
    ]);
    
    const validateLogin = ValidationMiddleware.validateRequiredFields([
      'email',
      'password',
    ]);
    
    userRouter.post('/register',
      validateRegisterUser,
      userController.registerUser
    );
    
    userRouter.post('/login',
      validateLogin,
      userController.loginUser
    );
    
    userRouter.use(AuthMiddleware.authenticate);
    userRouter.get('/', userController.getUsers);
    userRouter.get('/:id', userController.getUser);
    
    userRouter.put('/:id',
      userController.updateUser
    );
    
    userRouter.delete('/:id',
      AuthMiddleware.requireRole(UserRole.ADMIN),
      userController.deleteUser
    );

    router.use('/users', userRouter);

    // Path routes
    const pathRouter = Router();
    pathRouter.use(AuthMiddleware.authenticate);
    
    const validatePathRequest = ValidationMiddleware.validateRequiredFields([
      'startTopicId',
      'endTopicId',
    ]);
    
    pathRouter.get('/find', validatePathRequest, pathController.findShortestPath);
    router.use('/path', pathRouter);

    this.app.use('/api/v1', router);
    this.app.use('/', router);
  }

  private setupErrorHandling(): void {
    this.app.use(ErrorHandler.handle);
  }
}