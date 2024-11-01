import { parentPort, workerData } from 'worker_threads';
import { DateTime } from 'luxon';
import { Types } from 'mongoose';
import SessionRepository from '../../DAL/session.js';
import { connectDB, closeDB } from '../../database/mongo.js';
import { sendSMS } from '../../integrations/sns.js';
import { logger } from "../../utils/logger.js";

const processSessions = async (batch, workerId) => {
  const bulkOps = [];
  const smsPromises2 = [];
  const sessionMap = [];
  const currentTime = DateTime.utc();

  logger.info(`Processing ${batch.length} sessions`);
  logger.info(`Current time: ${currentTime.toISO()}`);

  await connectDB(workerId);

  for (const session of batch) {
    const sessionTime = DateTime.fromJSDate(session.scheduledTime, { zone: 'utc' });

    if (currentTime > sessionTime) {
      if (!session.verificationAttemps || !session.verificationAttemps.length) {
        const smsPromise2 = sendSMS(
          `+57${session.phoneNumber}`,
          `Hola ${session.name} si ya finalizaste tu rutina, por favor ingresa a este enlace https://tinyurl.com/4cnx7b6h y finaliza la sesión.`
        );

        smsPromises2.push(smsPromise2);
        sessionMap.push({ session, to: session.phoneNumber, type: 'regular' });

      } else if (session.verificationAttemps.length && currentTime > sessionTime.plus({ minutes: 10 }).toJSDate()) {
        const smsPromise2 = sendSMS(
          `+57${session.emergencyPhoneNumber}`,
          `Hola, desde WWWR te informamos que eres el contacto de emergencia de ${session.name}. Esta persona finalizo su entrenamiento`
        );
        smsPromises2.push(smsPromise2);
        sessionMap.push({ session, to: session.emergencyPhoneNumber, type: 'emergency' });
      }
    }
  }

  if (smsPromises2.length) {
    const results2 = await Promise.allSettled(smsPromises2);
    results2.forEach((result, index) => {
      console.log(JSON.stringify(result));
      const { session, to, type } = sessionMap[index];
      const attempt = {
        to,
        status: result.status === 'fulfilled' ? 'sent' : 'failed',
        time: currentTime.toISO(),
        error: result.status === 'rejected' ? result.reason.message : null,
        sid: result.status === 'fulfilled' &&
          result.value.sid ? 
            result.value.sid : 
            result.value.MessageId ? 
              result.value.MessageId :
              null,
        messageStatus: result.status === 'fulfilled' && result.value.status ? result.value.status : null,
      };

      if (type === 'regular') {
        bulkOps.push({
          updateOne: {
            filter: { _id: new Types.ObjectId(session._id) },
            update: {
              $set: { verificationAttemps: [attempt] }
            }
          }
        });
      } else if (type === 'emergency') {
        bulkOps.push({
          updateOne: {
            filter: { _id: new Types.ObjectId(session._id) },
            update: {
              $set: {
                isVerified: true,
                verificationAttemps: [...session.verificationAttemps, attempt]
              }
            }
          }
        });
      }
    });
  }

  if (bulkOps.length) {
    logger.info(`WorkerID: ${workerId} Updating ${bulkOps.length} sessions`);
    await SessionRepository.bulkUpdateDocuments(bulkOps);
  }

  await closeDB(workerId);

  parentPort.postMessage({ processedCount: batch.length });
};

processSessions(workerData.batch, workerData.workerId);
