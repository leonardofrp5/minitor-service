import { parentPort, workerData } from 'worker_threads';
import { DateTime } from 'luxon';
import { Types } from 'mongoose';
import SessionRepository from '../../DAL/session.js';
import { connectDB, closeDB } from '../../database/mongo.js';
import TwilioService from '../../integrations/twilio.js';
import { logger } from "../../utils/logger.js";

const processSessions = async (batch, workerId) => {
  const bulkOps = [];
  const smsPromises = [];
  const sessionMap = [];
  const currentTime = DateTime.utc();

  logger.info(`Processing ${batch.length} sessions`);
  logger.info(`Current time: ${currentTime.toISO()}`);

  await connectDB(workerId);

  for (const session of batch) {
    const sessionTime = DateTime.fromJSDate(session.scheduledTime, { zone: 'utc' });

    if (currentTime > sessionTime) {
      if (!session.verificationAttemps || !session.verificationAttemps.length) {
        const smsPromise = TwilioService.sendSMS(
          session.phoneNumber, 
          `Hola ${session.name}, tu sesión ha finalizado. Por favor, confirmalo dentro de la plataforma.`
        );
        smsPromises.push(smsPromise);
        sessionMap.push({ session, to: session.phoneNumber, type: 'regular' });

      } else if (session.verificationAttemps.length && currentTime > sessionTime.plus({ minutes: 10 }).toJSDate()) {
        const smsPromise = TwilioService.sendSMS(
          session.emergencyPhoneNumber,
          `Hola, queremos dejarte saber que ${session.name} finalizo su sesion de entrenamiento pero no nos lo ha confirmado a traves de nuestra plataforma. Intenta contactarle para asegurarnos que todo esta bien.`
        );
        smsPromises.push(smsPromise);
        sessionMap.push({ session, to: session.emergencyPhoneNumber, type: 'emergency' });
      }
    }
  }

  if (smsPromises.length) {
    const results = await Promise.allSettled(smsPromises);

    results.forEach((result, index) => {
      const { session, to, type } = sessionMap[index];
      const attempt = {
        to,
        status: result.status === 'fulfilled' ? 'sent' : 'failed',
        time: currentTime.toISO(),
        error: result.status === 'rejected' ? result.reason.message : null,
        sid: result.status === 'fulfilled' && result.value.sid ? result.value.sid : null,
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
