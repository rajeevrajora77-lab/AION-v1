import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { jobStreamService } from '../services/jobStreamService';
import { logger } from '../utils/logger';

export let io: Server;

export const initWebSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: '*', // Restrict to specific frontend domain in strict prod
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket: Socket) => {
    logger.info('WebSocket client connected', { id: socket.id });

    // Sync state for a specific job id to prevent data loss on disconnects
    socket.on('sync', async (data: { jobId: string, lastEventId?: string }) => {
      const { jobId, lastEventId = '0-0' } = data;
      logger.info(`Client re-syncing stream for job ${jobId} from ${lastEventId}`);
      
      const missedEvents = await jobStreamService.getEventsSince(jobId, lastEventId);
      missedEvents.forEach((e: any) => {
        socket.emit('event', e); // Replay chronologically
      });

      // Join room for real-time future push updates mapped by BullMQ Worker
      socket.join(`job_${jobId}`);
    });

    socket.on('disconnect', () => {
      logger.info('WebSocket client disconnected', { id: socket.id });
    });
  });
};
