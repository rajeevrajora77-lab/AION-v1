export type PromiseFactory<T> = () => Promise<T>;

export function pLimit(concurrency: number) {
  const queue: PromiseFactory<any>[] = [];
  let activeCount = 0;

  const next = () => {
    activeCount--;
    if (queue.length > 0) {
      const task = queue.shift();
      if (task) run(task);
    }
  };

  const run = async (fn: PromiseFactory<any>) => {
    activeCount++;
    try {
      await fn();
    } finally {
      next();
    }
  };

  return <T>(fn: PromiseFactory<T>): Promise<T> => {
    return new Promise((resolve, reject) => {
      const task = async () => {
        try {
          resolve(await fn());
        } catch (err) {
          reject(err);
        }
      };

      if (activeCount < concurrency) {
        run(task);
      } else {
        queue.push(task);
      }
    });
  };
}
