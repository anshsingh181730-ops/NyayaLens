/**
 * Web Speech API utilities for browser speech synthesis and voice recognition.
 */

export function cleanTextForSpeech(text: string): string {
  return text
    .replace(/\*\*/g, '')
    .replace(/[*#`_\[\]()]/g, '')
    .replace(/^[•\-\*]\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export const speechService = {
  // Speech Synthesis (Read Aloud)
  speak(text: string, lang: string = 'en-IN', onEnd?: () => void) {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported in this browser.');
      if (onEnd) onEnd();
      return;
    }

    this.stopSpeaking();

    const clean = cleanTextForSpeech(text);
    if (!clean) {
      if (onEnd) onEnd();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(clean);
    // Select appropriate language tag
    if (lang === 'hi') {
      utterance.lang = 'hi-IN';
    } else if (lang === 'mr') {
      utterance.lang = 'mr-IN';
    } else {
      utterance.lang = 'en-IN';
    }

    utterance.rate = 0.95; // Calm, deliberate pace for judicial readings
    utterance.pitch = 1.0;

    let finished = false;
    const finishHandler = () => {
      if (!finished) {
        finished = true;
        if (onEnd) onEnd();
      }
    };

    utterance.onend = finishHandler;
    utterance.onerror = finishHandler;

    window.speechSynthesis.speak(utterance);
  },

  isSpeaking(): boolean {
    if ('speechSynthesis' in window) {
      return window.speechSynthesis.speaking;
    }
    return false;
  },

  stopSpeaking() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        window.speechSynthesis.cancel();
      }
    }
  },

  // Speech Recognition (Voice Input)
  createRecognition(
    onResult: (transcript: string) => void,
    onError: (err: any) => void,
    lang: string = 'en-IN'
  ) {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-IN';

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    };

    recognition.onerror = (event: any) => {
      onError(event.error);
    };

    return recognition;
  },
};
