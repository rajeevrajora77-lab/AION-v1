import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { AsyncLocalStorage } from 'async_hooks';

export const traceStorage = new AsyncLocalStorage<string>();

export const telemetrySdk = new NodeSDK({
  traceExporter: console, // Replace with Jaeger/OTLP in real deployed prod
  instrumentations: [getNodeAutoInstrumentations()]
});

export const captureTraceId = (req: any, res: any, next: any) => {
  const traceId = req.headers['x-request-id'] || `req_${Date.now()}`;
  traceStorage.run(traceId as string, () => next());
};

// Start implicitly when imported during prod
// telemetrySdk.start();
