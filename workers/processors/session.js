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
  const currentTime = DateTime.utc();

  logger.info(`Processing ${batch.length} sessions`);
  logger.info(`Current time: ${currentTime.toISO()}`);

  await connectDB(workerId);

  for (const session of batch) {
    const sessionTime = DateTime.fromJSDate(session.scheduledTime, { zone: 'utc' });

    if (currentTime > sessionTime) {
      if (!session.verificationAttemps || !session.verificationAttemps.length) {
        smsPromises.push(
          TwilioService.sendSMS(session.phoneNumber, `Hola ${session.name}, tu sesión ha finalizado. Por favor, confirmalo dentro de la plataforma.`)
        );

        bulkOps.push({
          updateOne: {
            filter: { _id: new Types.ObjectId(session._id) },
            update: {
              $set: {
                verificationAttemps: [{
                  to: session.phoneNumber,
                  status: 'sent',
                  time: currentTime.toISO()
                }]
              }
            }
          }
        });
      } else {
        smsPromises.push(
          TwilioService.sendSMS(session.emergencyPhoneNumber, `Hola, queremos dejarte saber que ${session.name} finalizo su sesion de entrenamiento pero no nos lo ha confirmado a traves de nuestra plataforma. Intenta contactarle para asegurarnos que todo esta bien.`)
        );

        bulkOps.push({
          updateOne: {
            filter: { _id: new Types.ObjectId(session._id) },
            update: {
              $set: {
                isVerified: true,
                verificationAttemps: [
                  ...session.verificationAttemps,
                  {
                    to: session.emergencyPhoneNumber,
                    status: 'sent',
                    time: currentTime.toISO()
                  }
                ]
              },
            }
          }
        });
      }
    }
  }

  if (bulkOps.length) {
    logger.info(`WorkerID: ${workerId} Updating ${bulkOps.length} sessions`);
    await SessionRepository.bulkUpdateDocuments(bulkOps);
  }

  await closeDB(workerId);

  if (smsPromises.length) {
    const result = await Promise.allSettled(smsPromises);
    logger.info(`WorkerID: ${workerId} Whatsapp messages sent to ${result.length} users`);
  }

  parentPort.postMessage({ processedCount: batch.length });
};

processSessions(workerData.batch, workerData.workerId);