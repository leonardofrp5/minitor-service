import AWS from 'aws-sdk';
import config from '../config/index.js';
import {logger} from '../utils/logger.js';

AWS.config.update({
  accessKeyId: config.AWS_ACCESS_KEY_ID,
  secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
  region: 'us-east-1',
});

const sns = new AWS.SNS();

export async function sendSMS(phoneNumber, message) {
  try {
    const params = {
      Message: message,
      PhoneNumber: phoneNumber,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Promotional',
        },
      },
    };

    const result = await sns.publish(params).promise();
    logger.info('Message sent:', result);
    return result;
  } catch (error) {
    logger.error('Error sending message:', error);
    throw error;
  }
}