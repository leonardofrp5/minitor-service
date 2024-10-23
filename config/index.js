import dotenv from 'dotenv';

dotenv.config();

export default {
  ENVIRONMENT: process.env.ENVIRONMENT || 'STAGING',
  PORT: process.env.PORT || '3002',
  MONGO_DB_URL: process.env.MONGO_DB_URL || '',
  TWILIO_FROM_PHONE: process.env.TWILIO_FROM_PHONE || '', 
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
  LOG_IN_CONSOLE: process.env.LOG_IN_CONSOLE || 'false'
};