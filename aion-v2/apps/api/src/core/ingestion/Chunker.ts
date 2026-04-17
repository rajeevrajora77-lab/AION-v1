export class Chunker {
  static async chunkDocument(text: string, maxTokens: number = 512): Promise<string[]> {
    // Basic greedy token chunker implementation
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    let currentChunk: string[] = [];
    let currentLength = 0;

    for (const word of words) {
      if (currentLength + word.length > maxTokens * 4) { // Approximating 1 token = 4 chars
        chunks.push(currentChunk.join(' '));
        currentChunk = [word];
        currentLength = word.length;
      } else {
        currentChunk.push(word);
        currentLength += word.length + 1;
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
    }

    return chunks;
  }
}
