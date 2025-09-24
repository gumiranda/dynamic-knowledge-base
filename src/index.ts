import 'reflect-metadata';
import express from 'express';
import { AppServer } from './infrastructure/server/AppServer';
import { config } from './infrastructure/config/config';

async function bootstrap(): Promise<void> {
  try {
    const app = express();
    const server = new AppServer(app);
    
    await server.initialize();
    
    const port = config.port || 3000;
    app.listen(port, () => {
      console.log(`🚀 Dynamic Knowledge Base API running on port ${port}`);
      console.log(`📚 Environment: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();