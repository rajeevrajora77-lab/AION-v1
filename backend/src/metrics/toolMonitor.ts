export const toolStats = new Map<string, { health: number, fails: number }>();

export function recordToolResult(toolName: string, success: boolean) {
  const stats = toolStats.get(toolName) || { health: 100, fails: 0 };
  if (success) {
    stats.health = Math.min(100, stats.health + 2);
    stats.fails = 0;
  } else {
    stats.health -= 15;
    stats.fails++;
  }
  toolStats.set(toolName, stats);
}

export function isToolHealthy(toolName: string): boolean {
  const stats = toolStats.get(toolName) || { health: 100, fails: 0 };
  return stats.health > 50;
}
