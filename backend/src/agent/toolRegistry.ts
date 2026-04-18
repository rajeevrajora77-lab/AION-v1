import { ToolCall, ToolResult } from '../types';
import { runCodeTool } from './tools/runCode.tool';
import { webSearchTool } from './tools/webSearch.tool';
import { logger } from '../utils/logger';

export interface ToolDefinition {
  name: string;
  description: string;
  execute: (args: any) => Promise<any>;
  healthScore: number;
  avgLatencyMs: number;
  failCount: number;
}

export const availableTools: ToolDefinition[] = [
  { ...webSearchTool, healthScore: 100, avgLatencyMs: 0, failCount: 0 },
  { ...runCodeTool, healthScore: 100, avgLatencyMs: 0, failCount: 0 }
];

const toolStats = new Map<string, { health: number, fails: number, totalLatency: number, calls: number }>();

export function recordToolResult(toolName: string, success: boolean, latency: number) {
  const stats = toolStats.get(toolName) || { health: 100, fails: 0, totalLatency: 0, calls: 0 };
  stats.calls++;
  stats.totalLatency += latency;
  
  if (success) {
    stats.health = Math.min(100, stats.health + 5);
    stats.fails = Math.max(0, stats.fails - 1);
  } else {
    stats.health -= 20;
    stats.fails++;
  }
  toolStats.set(toolName, stats);
}

export function getActiveTools() {
  return availableTools.map(tool => {
    const stats = toolStats.get(tool.name);
    if (stats) {
      tool.healthScore = stats.health;
      tool.failCount = stats.fails;
      tool.avgLatencyMs = stats.totalLatency / stats.calls;
    }
    return tool;
  }).filter(t => t.healthScore > 40); // Disable if health < 40
}

export async function executeTool(call: ToolCall): Promise<ToolResult> {
  const startTime = Date.now();
  const tool = availableTools.find(t => t.name === call.name);
  if (!tool) {
    logger.error(`Tool not found: ${call.name}`);
    return { name: call.name, success: false, result: `Tool ${call.name} not found or deactivated` };
  }

  try {
    const result = await tool.execute(call.arguments);
    const latency = Date.now() - startTime;
    recordToolResult(tool.name, true, latency);
    return { name: call.name, success: true, result };
  } catch (err: any) {
    const latency = Date.now() - startTime;
    recordToolResult(tool.name, false, latency);
    logger.error(`Tool execution failed [${tool.name}]`, { error: err.message, latency });
    throw new Error(err.message || 'Tool execution failed');
  }
}
