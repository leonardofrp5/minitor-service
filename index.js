import { cpus } from 'os';
import cron from 'node-cron';
import { connectDB, closeDB } from "./database/mongo.js";
import SessionRepository from "./DAL/session.js";
import WorkerManager from "./workers/workerManager.js";
import { logger } from './utils/logger.js';

const BATCH_SIZE = 1000;

async function processSessionsInParallel() {
  const cpuList = cpus();
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
    logger.info(`CPU quantities ${cpuList.length}`);

    const workers = [];
    const chunkSize = Math.ceil(batch.length / cpuList.length);

    for (let i = 0; i < cpuList.length; i++) {
      const chunk = batch.slice(i * chunkSize, (i + 1) * chunkSize);
      if (chunk.length > 0) {
        workers.push(WorkerManager.runWorker('session', chunk, cpuList[i].times.sys));
      }
    }

    const results = await Promise.all(workers);
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