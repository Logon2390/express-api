import { config } from "./core/config";
import { logger } from "./core/logger";
import { ChromaService } from "./services/Chroma-service";
import { DiscordService } from "./bot/client";
import { ExpressServer } from "./server";

class Application {
  private chromaService: ChromaService;
  private discordService: DiscordService;
  private expressServer: ExpressServer;

  constructor() {
    // Initialize services with dependency injection
    this.chromaService = new ChromaService(
      config.chromaApi,
      config.ollamaApi,
      logger
    );
    this.discordService = new DiscordService(
      config.discord,
      this.chromaService,
      logger
    );
    this.expressServer = new ExpressServer(
      config.server,
      this.chromaService,
      logger
    );
  }

  public async start(): Promise<void> {
    try {
      logger.info("Starting Discord AI Bot Application...");

      // Start Express server
      await this.expressServer.start();

      // Start Discord bot
      await this.discordService.start();

      logger.info("🚀 Application started successfully!");
      logger.info("┌─────────────────────────────────────────┐");
      logger.info("│  Discord AI Bot is now running!         │");
      logger.info("│                                         │");
      logger.info(
        `│  Express API: http://localhost:${config.server.port
          .toString()
          .padEnd(4)} │`
      );
      logger.info("│  Discord Bot: Connected                 │");
      logger.info("│                                         │");
      logger.info("│  Available Commands:                    │");
      logger.info("│  • /ask <question> - Ask the Chroma-API │");
      logger.info("│                                         │");
      logger.info("│  API Endpoints:                         │");
      logger.info("│  • GET  / - Health check                │");
      logger.info("│  • GET  /api/health - API health        │");
      logger.info("│  • GET  /api/status - Service status    │");
      logger.info("│  • POST /api/ask - Ask question         │");
      logger.info("└─────────────────────────────────────────┘");
    } catch (error) {
      logger.error("Failed to start application:", error);
      await this.shutdown();
      process.exit(1);
    }
  }

  public async shutdown(): Promise<void> {
    try {
      logger.info("Shutting down application...");

      // Stop Discord bot
      await this.discordService.stop();

      logger.info("Application shut down successfully");
    } catch (error) {
      logger.error("Error during shutdown:", error);
    }
  }
}

// Global error handling
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully...");
  await app.shutdown();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully...");
  await app.shutdown();
  process.exit(0);
});

// Start the application
const app = new Application();
app.start().catch((error) => {
  logger.error("Failed to start application:", error);
  process.exit(1);
});
