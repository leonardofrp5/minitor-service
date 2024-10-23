import { SessionModel } from '../models/session.js';

class SessionRepository {
  async createSession(session) {
    const newSession = new SessionModel(session);
    return await newSession.save();
  }

  async getSessionById(sessionId) {
    return await SessionModel.findById(sessionId);
  }

  async updateSession(sessionId, session) {
    return await SessionModel.findByIdAndUpdate(sessionId, session, { new: true });
  }

  async deleteSession(sessionId) {
    return await SessionModel.findByIdAndDelete(sessionId);
  }

  async findUnverifiedSessions(lastId, batchSize) {
    const query = { isVerified: false };
    
    if (lastId) {
      query._id = { $gt: lastId };
    }
    return await SessionModel.find(query)
      .sort({ _id: 1 })
      .limit(batchSize)
      .lean();
  }

  async bulkUpdateDocuments(operations) {
    return await SessionModel.bulkWrite(operations);
  }
}

export default new SessionRepository();