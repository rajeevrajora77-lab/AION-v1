import axios from 'axios';
import { createChatCompletion } from './openai.js';

// ============================================================================
// XML ESCAPE — Prevents injection in SSML payloads
// ============================================================================
function escapeXml(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Synthesize text to speech
export async function synthesizeText(text, voice = 'en-US') {
  try {
    // Use Google Cloud Text-to-Speech API
    if (process.env.GOOGLE_TTS_KEY) {
      return await synthesizeWithGoogle(text, voice);
    }

    // Fallback to Azure
    if (process.env.AZURE_SPEECH_KEY) {
      return await synthesizeWithAzure(text, voice);
    }

    // Return mock audio
    return getMockAudioData(text);
  } catch (error) {
    console.error('Text-to-speech error:', error);
    return getMockAudioData(text);
  }
}

// Synthesize using Google Cloud
async function synthesizeWithGoogle(text, voice) {
  try {
    const response = await axios.post(
      `https://texttospeech.googleapis.com/v1/text:synthesize`,
      {
        input: { text },
        voice: {
          languageCode: voice,
          name: `${voice}-Neural2-A`,
        },
        audioConfig: {
          audioEncoding: 'MP3',
          pitch: 0,
          speakingRate: 1,
        },
      },
      {
        params: {
          key: process.env.GOOGLE_TTS_KEY,
        },
      }
    );

    return Buffer.from(response.data.audioContent, 'base64');
  } catch (error) {
    console.error('Google TTS error:', error.message);
    throw error;
  }
}

// Synthesize using Azure — XML-safe SSML
async function synthesizeWithAzure(text, voice) {
  try {
    const escapedText = escapeXml(text);
    const response = await axios.post(
      `https://${process.env.AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,
      `<speak version='1.0' xml:lang='${voice}'><voice name='${voice}-Neural'>${escapedText}</voice></speak>`,
      {
        headers: {
          'Ocp-Apim-Subscription-Key': process.env.AZURE_SPEECH_KEY,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-16khz-32kbitrate-mono-mp3',
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Azure TTS error:', error.message);
    throw error;
  }
}

// Mock audio data for testing — returns WAV format
function getMockAudioData(text) {
  const sampleRate = 16000;
  const duration = 1; // 1 second
  const numSamples = sampleRate * duration;
  const channels = 1;
  const bitsPerSample = 16;

  const wavHeader = Buffer.alloc(44);

  // RIFF identifier
  wavHeader.write('RIFF', 0);
  // File size
  wavHeader.writeUInt32LE(36 + numSamples * channels * bitsPerSample / 8, 4);
  // RIFF type
  wavHeader.write('WAVE', 8);
  // Format subchunk
  wavHeader.write('fmt ', 12);
  // Subchunk1 size
  wavHeader.writeUInt32LE(16, 16);
  // Audio format (1 for PCM)
  wavHeader.writeUInt16LE(1, 20);
  // Number of channels
  wavHeader.writeUInt16LE(channels, 22);
  // Sample rate
  wavHeader.writeUInt32LE(sampleRate, 24);
  // Byte rate
  wavHeader.writeUInt32LE(sampleRate * channels * bitsPerSample / 8, 28);
  // Block align
  wavHeader.writeUInt16LE(channels * bitsPerSample / 8, 32);
  // Bits per sample
  wavHeader.writeUInt16LE(bitsPerSample, 34);
  // Data subchunk
  wavHeader.write('data', 36);
  // Subchunk2 size
  wavHeader.writeUInt32LE(numSamples * channels * bitsPerSample / 8, 40);

  return wavHeader;
}

// Process voice transcript — send to LLM for AI response
export async function processVoiceTranscript(transcript) {
  try {
    const messages = [
      { role: 'system', content: 'You are AION, a helpful AI voice assistant. Respond concisely and naturally for voice output.' },
      { role: 'user', content: transcript },
    ];
    const completion = await createChatCompletion(messages);
    const reply = completion.choices[0].message.content;
    return {
      reply,
      originalTranscript: transcript,
      processedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Voice LLM processing error:', error.message);
    return {
      reply: 'Sorry, I encountered an error processing your request. Please try again.',
      originalTranscript: transcript,
      processedAt: new Date().toISOString(),
    };
  }
}

export default synthesizeText;
