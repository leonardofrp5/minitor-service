import { parentPort, workerData } from 'worker_threads';
import { DateTime } from 'luxon';
import { sendSMS } from '../../integrations/sns.js';
import { logger } from "../../utils/logger.js";

const processSessions = async (batch, workerId) => {
  const bulkOps = [];
  const smsPromises = [];
  const sessionMap = [];
  const currentTime = DateTime.utc();

  logger.info(`Processing ${batch.length} sessions`);
  logger.info(`Current time: ${currentTime.toISO()}`);

  for (const session of batch) {
    const sessionTime = DateTime.fromJSDate(session.scheduledTime, { zone: 'utc' });

    if (currentTime > sessionTime) {
      if (!session.verificationAttemps || !session.verificationAttemps.length) {
        smsPromises.push(
          sendSMS(`+57${session.phoneNumber}`, `Hola ${session.name} si ya finalizaste tu rutina, por favor ingresa a este enlace https://tinyurl.com/4cnx7b6h y finaliza la sesión.`)
        );
        sessionMap.push({ session, to: session.phoneNumber, type: 'regular' });
      } else if (session.verificationAttemps.length && currentTime > sessionTime.plus({ minutes: 10 })) {
        smsPromises.push(
          sendSMS(`+57${session.emergencyPhoneNumber}`, `Hola, desde WWWR te informamos que eres el contacto de emergencia de ${session.name}. Esta persona finalizo su entrenamiento`)
        );
        sessionMap.push({ session, to: session.emergencyPhoneNumber, type: 'emergency' });
      }
    }
  }

  if (smsPromises.length) {
    const results2 = await Promise.allSettled(smsPromises);
    results2.forEach((result, index) => {
      const { session, to, type } = sessionMap[index];
      const attempt = {
        to,
        status: result.status === 'fulfilled' ? 'sent' : 'failed',
        time: currentTime.toISO(),
        error: result.status === 'rejected' ? result.reason.message : null,
        sid: result.value?.sid || result.value?.MessageId || null,
        messageStatus: result.value?.status || null,
      };

      bulkOps.push({
        updateOne: {
          filter: { _id: session._id },
          update: {
            $set: type === 'regular' 
              ? { verificationAttemps: [attempt] } 
              : { isVerified: true, verificationAttemps: [...session.verificationAttemps, attempt] }
          }
        }
      });

      sessionMap[index] = null;
      smsPromises[index] = null;
    });
  }

  parentPort.postMessage({ processedCount: batch.length, bulkOps });
  bulkOps = [];

  if (global && global.gc) {
    logger.info(`Worker ${workerId} is running garbage collection...`);
    global.gc();
  }
};

processSessions(workerData.batch, workerData.workerId);
