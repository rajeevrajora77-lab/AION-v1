import express from 'express';
import { synthesizeText, processVoiceTranscript } from '../utils/voice.js';
import { protect } from '../middleware/auth.js';
import { voiceLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// POST /api/voice/process - Process voice transcription via LLM
// PROTECTED + RATE LIMITED
router.post('/process', protect, voiceLimiter, async (req, res) => {
  try {
    const { transcript } = req.body;

    if (!transcript || !transcript.trim()) {
      return res.status(400).json({ error: 'Transcript cannot be empty' });
    }

    // Process transcript through LLM — returns { reply, originalTranscript, processedAt }
    const result = await processVoiceTranscript(transcript.trim());

    res.json(result);
  } catch (error) {
    console.error('Voice processing error:', error);
    res.status(500).json({ error: 'Failed to process voice' });
  }
});

// POST /api/voice/synthesize - Text-to-speech endpoint
// PROTECTED + RATE LIMITED
router.post('/synthesize', protect, voiceLimiter, async (req, res) => {
  try {
    const { text, voice = 'en-US' } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text cannot be empty' });
    }

    // Generate audio from text
    const audioData = await synthesizeText(text, voice);

    // Set correct Content-Type based on actual audio format
    // If using real TTS provider: audio/mpeg
    // If mock fallback: audio/wav (mock returns WAV header)
    const isMock = !process.env.GOOGLE_TTS_KEY && !process.env.AZURE_SPEECH_KEY;
    res.setHeader('Content-Type', isMock ? 'audio/wav' : 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="speech.${isMock ? 'wav' : 'mp3'}"`);
    res.send(audioData);
  } catch (error) {
    console.error('Voice synthesis error:', error);
    res.status(500).json({ error: 'Failed to synthesize voice' });
  }
});

// GET /api/voice/config - Get voice configuration
// PROTECTED
router.get('/config', protect, (req, res) => {
  try {
    const config = {
      supportedLanguages: [
        'en-US',
        'en-GB',
        'es-ES',
        'fr-FR',
        'de-DE',
        'it-IT',
        'pt-BR',
        'ja-JP',
        'zh-CN',
      ],
      voiceOptions: ['male', 'female', 'neutral'],
      audioFormat: 'mp3',
      sampleRate: 16000,
      features: {
        speechToText: true,
        textToSpeech: true,
        languageDetection: true,
        voiceModulation: true,
      },
    };

    res.json(config);
  } catch (error) {
    console.error('Config error:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

export default router;
