import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import * as Minio from 'minio';
import { Chunker } from '../core/ingestion/Chunker';
import { env } from '../config/env';

const redisConnection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

const minioClient = new Minio.Client({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: false,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

const worker = new Worker('ingestion_jobs', async (job: Job) => {
  const { userId, objectKey, projectId } = job.data;
  
  // 1. Fetch file from Minio
  const dataStream = await minioClient.getObject('aion-documents', objectKey);
  let documentText = '';
  
  for await (const chunk of dataStream) {
    documentText += chunk.toString();
  }

  // 2. Chunk document
  const chunks = await Chunker.chunkDocument(documentText);

  // 3. Generate embeddings & Store in Chroma (Stub for demonstration)
  // for (const chunk of chunks) {
  //   const embedding = await generateEmbedding(chunk);
  //   await saveToChroma(embedding, chunk, { userId, projectId, document: objectKey });
  // }

  return { status: 'completed', chunkCount: chunks.length };

}, { connection: redisConnection });

worker.on('failed', (job: Job | undefined, err: Error) => {
  console.error(`Ingestion Job ${job?.id} failed:`, err);
});

console.log('Worker is listening for ingestion_jobs...');
