import express from 'express';
import { AppServer } from './AppServer';

describe('AppServer', () => {
  let app: express.Application;
  let server: AppServer;

  beforeEach(() => {
    app = express();
    server = new AppServer(app);
  });

  describe('initialize', () => {
    it('should initialize server without errors', async () => {
      await expect(server.initialize()).resolves.not.toThrow();
    });

    it('should setup middleware and routes', async () => {
      await server.initialize();
      
      // Verify that the app has middleware and routes configured
      expect(app._router).toBeDefined();
    });
  });
});