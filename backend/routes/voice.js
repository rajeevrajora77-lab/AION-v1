import express from 'express';
import { synthesizeText } from '../utils/voice.js';

const router = express.Router();

// POST /api/voice/process - Process voice transcription
router.post('/process', async (req, res) => {
  try {
    const { transcript } = req.body;

    if (!transcript || !transcript.trim()) {
      return res.status(400).json({ error: 'Transcript cannot be empty' });
    }

    // Process transcribed text
    res.json({
      originalTranscript: transcript,
      processed: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Voice processing error:', error);
    res.status(500).json({ error: 'Failed to process voice' });
  }
});

// POST /api/voice/synthesize - Text-to-speech endpoint
router.post('/synthesize', async (req, res) => {
  try {
    const { text, voice = 'en-US' } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text cannot be empty' });
    }

    // Generate audio from text
    const audioData = await synthesizeText(text, voice);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', 'attachment; filename="speech.mp3"');
    res.send(audioData);
  } catch (error) {
    console.error('Voice synthesis error:', error);
    res.status(500).json({ error: 'Failed to synthesize voice' });
  }
});

// GET /api/voice/config - Get voice configuration
router.get('/config', (req, res) => {
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
