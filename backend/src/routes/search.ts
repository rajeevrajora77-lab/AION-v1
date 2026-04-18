import { Router, Request, Response } from 'express';
import { executeWebSearch } from '../agent/tools/webSearch.tool';
import { searchLimiter } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';

// Mock protect for now
const protect = (req: any, res: any, next: any) => next();

const router = Router();

router.post('/', protect, searchLimiter, async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Query required' });
    
    // Instead of legacy performSearch, use the new exact ReAct Tool we built!
    const result = await executeWebSearch({ query });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

router.get('/suggestions', protect, async (req: Request, res: Response) => {
  try {
    const { q } = req.query as { q: string };
    if (!q) return res.status(400).json({ error: 'Query required' });
    res.json({
      query: q,
      suggestions: [`${q} summary`, `${q} news`, `${q} guide`]
    });
  } catch (err) {
    res.status(500).json({ error: 'Suggestions failed' });
  }
});

export default router;
