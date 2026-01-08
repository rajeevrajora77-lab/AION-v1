import express from 'express';
import { performSearch } from '../utils/search.js';

const router = express.Router();

// POST /api/search - Execute web search
router.post('/', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Search query cannot be empty' });
    }

    const results = await performSearch(query);

    res.json({
      query,
      resultCount: results.length,
      results: results.map((result) => ({
        title: result.title,
        snippet: result.snippet,
        link: result.link,
        source: result.source,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to perform search' });
  }
});

// GET /api/search/suggestions - Get search suggestions
router.get('/suggestions', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || !q.trim()) {
      return res.status(400).json({ error: 'Query parameter required' });
    }

    // Return simple suggestions based on query
    const suggestions = [
      `${q} definition`,
      `${q} tutorial`,
      `${q} guide`,
      `${q} examples`,
      `${q} best practices`,
    ];

    res.json({
      query: q,
      suggestions,
    });
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

export default router;
