/**
 * Voice Service: Web Speech API Integration for Chatbot & Queue Announcements
 * Strictly decoupled from queue business logic with graceful fallbacks
 */

export const isSpeechSynthesisSupported = () => {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
};

export const isSpeechRecognitionSupported = () => {
  return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
};

// Speech Synthesis (Text to Speech)
export function speakText(text, options = {}) {
  if (!isSpeechSynthesisSupported()) {
    console.warn('Speech synthesis not supported in this browser.');
    return null;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  // Strip markdown formatting for cleaner natural speech
  const cleanText = text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/•/g, '')
    .replace(/#+\s/g, '')
    .replace(/`{1,3}.*?`{1,3}/g, '')
    .replace(/📍|⚠️|🚨|🧪|👨‍⚕️|👩‍💼|🩺|✅|💡|📊|📺|🗺️/g, '')
    .trim();

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = options.lang || 'en-US';
  utterance.rate = options.rate || 1.0;
  utterance.pitch = options.pitch || 1.0;

  if (options.onEnd) {
    utterance.onend = options.onEnd;
  }
  if (options.onError) {
    utterance.onerror = options.onError;
  }

  window.speechSynthesis.speak(utterance);
  return utterance;
}

export function stopSpeaking() {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
}

// Speech Recognition (Voice to Text)
export function createSpeechRecognizer({ onResult, onError, onEnd, onStart, lang = 'en-US' }) {
  if (!isSpeechRecognitionSupported()) {
    if (onError) onError(new Error('Voice recognition is not supported in this browser. Please use keyboard input.'));
    return null;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = lang;

  recognition.onstart = () => {
    if (onStart) onStart();
  };

  recognition.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }

    if (onResult) {
      onResult({
        final: finalTranscript.trim(),
        interim: interimTranscript.trim(),
      });
    }
  };

  recognition.onerror = (event) => {
    let errorMsg = 'Microphone error.';
    if (event.error === 'not-allowed') {
      errorMsg = 'Microphone permission denied. Please allow microphone access in your browser.';
    } else if (event.error === 'no-speech') {
      errorMsg = 'No speech detected. Please speak clearly into your microphone.';
    }
    if (onError) onError(new Error(errorMsg));
  };

  recognition.onend = () => {
    if (onEnd) onEnd();
  };

  return recognition;
}

// Queue Voice Announcement Generator
export function announceTicketCall(ticket, options = {}) {
  const privacyMode = options.privacyMode || 'FIRST_NAME_AND_TICKET';
  const language = options.lang || 'en-US';

  const ticketNum = ticket.ticket_number || 'Ticket';
  const room = ticket.room_number || 'Consultation Room';
  const dept = ticket.department_name || 'Clinic';
  const firstName = ticket.first_name || '';
  const lastName = ticket.last_name || '';

  let announcementText = '';

  if (privacyMode === 'FULL_NAME' && firstName && lastName) {
    announcementText = `Queue number ${ticketNum}. Patient ${firstName} ${lastName}, please proceed to ${dept}, ${room}.`;
  } else if (privacyMode === 'FIRST_NAME_AND_TICKET' && firstName) {
    announcementText = `Queue number ${ticketNum}. Patient ${firstName}, please proceed to ${dept}, ${room}.`;
  } else {
    // TICKET_ONLY (Maximum public privacy)
    announcementText = `Queue number ${ticketNum}. Please proceed to ${dept}, ${room}.`;
  }

  return speakText(announcementText, { lang: language, rate: 0.95 });
}
