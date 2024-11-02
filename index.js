import { cpus } from 'os';
import cron from 'node-cron';
import { connectDB, closeDB } from "./database/mongo.js";
import SessionRepository from "./DAL/session.js";
import WorkerManager from "./workers/workerManager.js";
import { logger } from './utils/logger.js';

const BATCH_SIZE = 500;
const MAX_PARALLEL_WORKERS = 3;

async function processSessionsInParallel() {
  let lastId = null;
  let totalProcessed = 0;

  await connectDB();

  while (true) {
    const batch = await SessionRepository.findUnverifiedSessions(lastId, BATCH_SIZE);

    if (batch.length === 0) {
      await closeDB();
      break;
    };

    lastId = batch[batch.length - 1]._id;

    const workers = [];
    const chunkSize = Math.ceil(batch.length / MAX_PARALLEL_WORKERS);

    for (let i = 0; i < MAX_PARALLEL_WORKERS; i++) {
      const chunk = batch.slice(i * chunkSize, (i + 1) * chunkSize);
      if (chunk.length > 0) {
        workers.push(WorkerManager.runWorker('sessionV2', chunk, i));
      }
    }

    const results = await Promise.all(workers);
    const bulkOps = results.flatMap(result => result.bulkOps);

    if (bulkOps.length > 0) {
      await SessionRepository.bulkUpdateDocuments(bulkOps);
    }

    totalProcessed += results.reduce((acc, result) => acc + result.processedCount, 0);
    logger.info(`Processed ${totalProcessed} sessions`);
  }
}

cron.schedule('*/1 * * * *', async () => {
  try {
    logger.info('Starting to process sessions');
    
    await processSessionsInParallel();
    
    logger.info('All sessions processed');
  } catch (error) {
    logger.error('Error processing sessions:', error);
  }
});