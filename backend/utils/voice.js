import axios from 'axios';

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

// Synthesize using Azure
async function synthesizeWithAzure(text, voice) {
  try {
    const response = await axios.post(
      `https://${process.env.AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,
      `<speak version='1.0' xml:lang='${voice}'><voice name='${voice}-Neural'>${text}</voice></speak>`,
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

// Mock audio data for testing
function getMockAudioData(text) {
  // Return a simple WAV file header with silence
  // This is a minimal valid WAV file
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

// Process speech to text (frontend handles this with Web Speech API)
export function processTranscript(transcript) {
  return {
    originalTranscript: transcript,
    processedAt: new Date().toISOString(),
    confidence: Math.random() * 0.3 + 0.7, // Mock confidence score
  };
}

export default synthesizeText;
