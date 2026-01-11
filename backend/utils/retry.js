export async function withRetry(fn, retries = 2, delay = 500) {
  let lastError;

  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      console.warn(`Attempt ${i + 1} failed, retrying...`, err.message);
      if (i < retries) {
        await new Promise(r => setTimeout(r, delay * (i + 1)));
      }
    }
  }

  throw lastError;
}

export default withRetry;
