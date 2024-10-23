import { faker } from '@faker-js/faker';
import { DateTime } from 'luxon';
import { connectDB, closeDB } from "../mongo.js";
import { SessionModel } from '../../models/session.js';
import { logger } from "../../utils/logger.js";

const generateSessions = async (count) => {
  const sessions = [];
  const currentTime = DateTime.utc();

  logger.info('Generating sessions...');
  logger.info(`Number of sessions to generate: ${count}`);
  logger.info(`Current time: ${currentTime.toISO()}`);

  for (let i = 0; i < count; i++) {
    const name = faker.person.fullName();
    const futureMinutes = Math.floor(Math.random() * (5 - 2 + 1)) + 2;
    const scheduledTime = currentTime.plus({ minutes: futureMinutes }).toJSDate();

    const session = new SessionModel({
      name,
      email: faker.internet.email(name),
      phoneNumber: faker.phone.number(),
      countryCode: faker.location.countryCode(),
      scheduledTime,
      isVerified: false
    });
    sessions.push(session);
  }
  return sessions;
};

const populateSessions = async (sessionsQty) => {
  try {
    const sessions = await generateSessions(sessionsQty);
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
  await populateSessions(10000);
  closeDB();
})();