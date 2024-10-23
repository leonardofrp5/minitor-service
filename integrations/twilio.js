import twilio from 'twilio';
import { logger } from '../utils/logger.js';
import config from "../config/index.js";

class TwilioService {
  constructor() {
    this.client = new twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);
  }

  async sendSMS(to, body) {
    try {
      return await this.client.messages.create({
          body: body,
          from: `whatsapp:${config.TWILIO_FROM_PHONE}`,
          to: `whatsapp:+57${to}`
      });
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }
}

export default new TwilioService();