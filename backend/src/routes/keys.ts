import { Router } from 'express';
// import { protect } from '../middleware/auth';
const protect = (req: any, res: any, next: any) => next();

const router = Router();

router.get('/', protect, (req, res) => {
  // Mocking list of keys (AES encrypted in real implementation)
  res.json([
    { provider: 'groq', configured: true },
    { provider: 'openai', configured: false },
    { provider: 'serpapi', configured: false }
  ]);
});

router.post('/', protect, (req, res) => {
  // Mocking key validation and save
  res.json({ provider: req.body.provider, configured: true });
});

router.delete('/:provider', protect, (req, res) => {
  res.json({ success: true });
});

export default router;
