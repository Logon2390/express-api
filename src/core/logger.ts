import { ILogger } from '../models/types';

export class Logger implements ILogger {
  private static instance: Logger;

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public info(message: string, ...args: any[]): void {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
  }

  public warn(message: string, ...args: any[]): void {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
  }

  public error(message: string, ...args: any[]): void {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...args);
  }
}

export const logger = Logger.getInstance(); 