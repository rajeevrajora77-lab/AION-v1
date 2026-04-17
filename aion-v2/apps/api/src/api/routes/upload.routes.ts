import { FastifyInstance } from 'fastify';
import * as Minio from 'minio';
import { Queue } from 'bullmq';
import { env } from '../../../config/env';

export default async function uploadRoutes(fastify: FastifyInstance) {
  const minioClient = new Minio.Client({
    endPoint: env.MINIO_ENDPOINT,
    port: env.MINIO_PORT,
    useSSL: false,
    accessKey: env.MINIO_ACCESS_KEY,
    secretKey: env.MINIO_SECRET_KEY,
  });

  let ingestionQueue: Queue;

  fastify.addHook('onReady', async () => {
    ingestionQueue = new Queue('ingestion_jobs', { connection: fastify.redis });
    const exists = await minioClient.bucketExists('aion-documents');
    if (!exists) {
      await minioClient.makeBucket('aion-documents', 'us-east-1');
    }
  });

  fastify.post('/', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    // Requires @fastify/multipart plugin registered in index.ts
    // For this mock plan, we stub the multipart upload stream
    // const data = await request.file()
    const objectKey = `doc_${Date.now()}.pdf`; 

    // Directly streaming upload to MinIO
    // await minioClient.putObject('aion-documents', objectKey, data.file, data.file.bytesRead);

    // Queue ingestion
    const job = await ingestionQueue.add('ingestion_task', {
      userId: request.user.id,
      objectKey,
      projectId: 'default'
    });

    return { success: true, data: { objectKey, jobId: job.id } };
  });
}
