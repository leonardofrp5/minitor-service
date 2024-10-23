import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class WorkerManager {
  static async runWorker(processor, batch, workerId) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(__dirname + `/processors/${processor}.js`, {
        workerData: {
          batch: batch.map((item) => ({
            ...item,
            _id: item._id.toString(),
          })),
          workerId: workerId || null,
        }
      });

      worker.on('message', resolve);
      worker.on('error', reject);
      worker.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });
    });
  }
}

export default WorkerManager;