import { useEffect, useState } from 'react';

export function useAgentStream(taskId: string | null) {
  const [stream, setStream] = useState<any[]>([]);
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');

  useEffect(() => {
    if (!taskId) return;

    setStatus('running');
    const token = localStorage.getItem('token'); // In real app, standard cookie mapping or JWT fetch
    const eventSource = new EventSource(`http://localhost:4000/api/v1/chat/stream/${taskId}`);

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        setStream((prev) => [...prev, parsed]);

        if (parsed.event === 'done') {
          setStatus('done');
          eventSource.close();
        }
        if (parsed.event === 'error') {
          setStatus('error');
          eventSource.close();
        }
      } catch (err) {
        console.error('Failed parsing SSE:', err);
      }
    };

    eventSource.onerror = (err) => {
      setStatus('error');
      eventSource.close();
    };

    return () => eventSource.close();
  }, [taskId]);

  return { stream, status };
}
