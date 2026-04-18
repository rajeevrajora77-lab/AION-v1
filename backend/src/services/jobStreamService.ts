import { getRedis } from '../config/redis';
import { logger } from '../utils/logger';

export const jobStreamService = {
  async addEvent(jobId: string, eventType: string, payload: any) {
    const redis = getRedis();
    const streamKey = `job_stream:${jobId}`;
    try {
      // XADD key * eventType "exec_start" payload "{...}"
      const eventId = await redis.xadd(
        streamKey,
        '*', 
        'event', eventType,
        'payload', JSON.stringify(payload)
      );
      return eventId;
    } catch (err) {
      logger.error('Redis Stream XADD Failed', { jobId, eventType, err });
    }
  },

  async getEventsSince(jobId: string, lastEventId: string = '0-0') {
    const redis = getRedis();
    const streamKey = `job_stream:${jobId}`;
    try {
       // XREAD BLOCK 0 STREAMS streamKey lastEventId
       const results = await redis.xread('STREAMS', streamKey, lastEventId);
       if (!results) return [];

       const events = results[0][1].map((raw: any) => {
          const id = raw[0];
          const fields = raw[1];
          const event: any = { id };
          for (let i = 0; i < fields.length; i += 2) {
             event[fields[i]] = fields[i+1] === 'payload' ? JSON.parse(fields[i+1]) : fields[i+1];
          }
          return event;
       });
       return events;
    } catch (err) {
       logger.error('Redis Stream XREAD Failed', { jobId, err });
       return [];
    }
  }
};
