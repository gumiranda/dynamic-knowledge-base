import { Request, Response, NextFunction } from 'express';

export class LoggingMiddleware {
  static log(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    
    // Log request
    console.log(`📥 ${req.method} ${req.url} - ${new Date().toISOString()}`);
    
    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any): Response {
      const duration = Date.now() - startTime;
      console.log(`📤 ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
      
      // Call original end method
      originalEnd.call(this, chunk, encoding);
      return this;
    };

    next();
  }
}