import { faker } from '@faker-js/faker';
import { DateTime } from 'luxon';
import { connectDB, closeDB } from "../mongo.js";
import { SessionModel } from '../../models/session.js';
import { logger } from "../../utils/logger.js";

const generateSessions = async () => {
  const sessions = [];
  const currentTime = DateTime.utc();

  logger.info('Generating sessions...');
  logger.info(`Current time: ${currentTime.toISO()}`);

  /** USE REAL CELLPHONE NUMBERS, THIS ONES ARE JUST AN EXAMPLE */
  const realUsers = [
    { name: 'Joe Doe', email: 'joe@example.com', phoneNumber: '0123456789', emergencyPhoneNumber: '0987654321' },
    { name: 'Jane Doe', email: 'jane@example.com', phoneNumber: '0987654321', emergencyPhoneNumber: '0123456789' },
  ];

  realUsers.map(user => {
    const futureMinutes = Math.floor(Math.random() * (5 - 2 + 1)) + 2;
    const scheduledTime = currentTime.plus({ minutes: futureMinutes }).toJSDate();

    const session = new SessionModel({
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      emergencyPhoneNumber: user.emergencyPhoneNumber,
      countryCode: '+57',
      scheduledTime,
      isVerified: false
    });
    sessions.push(session);
  });

  return sessions;
};

const populateRealUserSessions = async () => {
  try {
    const sessions = await generateSessions();
    await SessionModel.insertMany(sessions);
    logger.info('Sessions populated successfully');
  } catch (error) {
    logger.error('Error populating sessions:', error);
  } finally {
    process.exit();
  }
};

(async () => {
  connectDB();
  await populateRealUserSessions(10000);
  closeDB();
})();