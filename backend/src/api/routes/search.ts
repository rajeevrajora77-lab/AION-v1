import express from 'express';
import { performSearch } from '../../../utils/search.js';

const router = express.Router();

router.post('/', async (req: any, res: any) => {
  try {
    const { query } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Search query cannot be empty' });
    }

    const results = await performSearch(query);

    res.json({
      query,
      resultCount: results.length,
      results: results.map((result: any) => ({
        title: result.title,
        snippet: result.snippet,
        link: result.link,
        source: result.source,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to perform search' });
  }
});

router.get('/suggestions', async (req: any, res: any) => {
  try {
    const { q } = req.query;

    if (!q || !String(q).trim()) {
      return res.status(400).json({ error: 'Query parameter required' });
    }

    const qs = String(q);
    const suggestions = [`${qs} definition`, `${qs} tutorial`, `${qs} guide`, `${qs} examples`, `${qs} best practices`];

    res.json({ query: qs, suggestions });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('Suggestions error:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

export default router;
