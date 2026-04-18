export const toolStats = new Map<string, { health: number, fails: number }>();

export function recordToolResult(toolName: string, success: boolean) {
  const stats = toolStats.get(toolName) || { health: 100, fails: 0 };
  if (success) {
    stats.health = Math.min(100, stats.health + 5);
    stats.fails = 0;
  } else {
    // Phase 1: Aggressive mathematical decay prevents Replan starvation
    stats.health -= 40;
    stats.fails++;
  }
  toolStats.set(toolName, stats);
}

// Any tool failing TWICE or dropping < 50 health is fully blacklisted in the registry run
export function isToolHealthy(toolName: string): boolean {
  const stats = toolStats.get(toolName) || { health: 100, fails: 0 };
  return stats.health > 50 && stats.fails < 2;
}
