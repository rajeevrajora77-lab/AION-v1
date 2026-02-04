import express from 'express';
import { synthesizeText } from '../../../utils/voice.js';

const router = express.Router();

router.post('/process', async (req: any, res: any) => {
  try {
    const { transcript } = req.body;

    if (!transcript || !transcript.trim()) {
      return res.status(400).json({ error: 'Transcript cannot be empty' });
    }

    res.json({ originalTranscript: transcript, processed: true, timestamp: new Date().toISOString() });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('Voice processing error:', error);
    res.status(500).json({ error: 'Failed to process voice' });
  }
});

router.post('/synthesize', async (req: any, res: any) => {
  try {
    const { text, voice = 'en-US' } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text cannot be empty' });
    }

    const audioData = await synthesizeText(text, voice);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', 'attachment; filename="speech.mp3"');
    res.send(audioData);
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('Voice synthesis error:', error);
    res.status(500).json({ error: 'Failed to synthesize voice' });
  }
});

router.get('/config', (req: any, res: any) => {
  try {
    res.json({
      supportedLanguages: ['en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR', 'ja-JP', 'zh-CN'],
      voiceOptions: ['male', 'female', 'neutral'],
      audioFormat: 'mp3',
      sampleRate: 16000,
      features: {
        speechToText: true,
        textToSpeech: true,
        languageDetection: true,
        voiceModulation: true,
      },
    });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('Config error:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

export default router;
