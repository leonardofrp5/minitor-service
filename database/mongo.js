import mongoose from "mongoose";
import { logger } from "../utils/logger.js";
import config from "../config/index.js";

export const connectDB = async (workerId = null) => {
  try {
    const conn = await mongoose.connect(config.MONGO_DB_URL, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      connectTimeoutMS: 30000
    });
    logger.info(`WorkerID: ${workerId || 'MAIN'} \nMongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export const closeDB = async (workerId = null) => {
  try {
    await mongoose.connection.close();
    logger.info(`WorkerID: ${workerId || 'MAIN'} \nMongoDB connection closed`);
  } catch (error) {
    logger.error(`Error closing MongoDB connection: ${error.message}`);
    process.exit(1);
  }
};