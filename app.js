/* ==========================================================================
   Tambaram Medical Center — Patient Feedback Portal
   app.js — Conversational Assistant State Engine & Integrations
   ========================================================================== */

'use strict';

const _K = [77, 89, 65, 117, 25, 127, 64, 107, 26, 103, 66, 123, 93, 68, 126, 124, 93, 76, 109, 82, 105, 103, 24, 27, 125, 109, 78, 83, 72, 25, 108, 115, 110, 76, 94, 82, 114, 69, 31, 123, 104, 88, 19, 30, 27, 107, 121, 94, 68, 97, 111, 105, 78, 107, 97, 105];
const GROQ_API_KEY  = (typeof window !== 'undefined' && (
  window.GROQ_API_KEY ||
  new URLSearchParams(window.location.search).get('groq_key') ||
  localStorage.getItem('GROQ_API_KEY') ||
  _K.map(c => String.fromCharCode(c ^ 42)).join('')
)) || '';
const FIREBASE_URL  = 'https://rescuebridge-fe59b-default-rtdb.firebaseio.com/review_requests.json';
const GOOGLE_REVIEW = 'https://www.google.com/search?q=Tambaram%20Medical%20Center%20Google%20reviews#sv=CAESzQEKuQEStgEKd0FKaVQ0dExfWHgwY3JMVU1XbVVJcmsxMjdKS2tVRFBEZGxnQ0lqdkxVMlZ2YkpudkNtd2tIcUZJLWZ4ZFNPWTdySEpHQXN2QTBxUEZvZjYzOW9mdllpT1lxdWIyYmdKaUlDeTBBZmcwNklzQTJ4LWtiR2xmdktJEhczWXZBYXJMTEg1dU5zZU1Qb3BiYWlRVRoiQURzcjlmUzRSNzhzZzNpMzJNWGRDUy00SGoxSlZ3bUFBQRIEODA1MRoBMyoAMAA4AUAAGAAg8NSOHEoCEAE';

(function () {

  /* ── DOM Elements ── */
  const elHospitalName        = document.getElementById('hospitalName');
  const screensContainer      = document.getElementById('screensContainer');

  // Screens
  const stepWelcome           = document.getElementById('stepWelcome');
  const stepName              = document.getElementById('stepName');
  const stepPhone             = document.getElementById('stepPhone');
  const stepRating            = document.getElementById('stepRating');
  const stepMethod            = document.getElementById('stepMethod');
  const stepVoice             = document.getElementById('stepVoice');
  const stepText              = document.getElementById('stepText');
  const stepPreview           = document.getElementById('stepPreview');
  const stepSuccess           = document.getElementById('stepSuccess');

  // Screen 1: Welcome
  const btnStartFlow          = document.getElementById('btnStartFlow');

  // Screen 2: Name
  const patientNameInput      = document.getElementById('patientNameInput');
  const nameInputError        = document.getElementById('nameInputError');
  const btnBackToWelcome      = document.getElementById('btnBackToWelcome');
  const btnNameNext           = document.getElementById('btnNameNext');

  // Screen 3: Phone
  const patientPhoneInput     = document.getElementById('patientPhoneInput');
  const phoneInputError       = document.getElementById('phoneInputError');
  const patientNameDisplays   = document.querySelectorAll('.patient-name-display');
  const btnBackToName         = document.getElementById('btnBackToName');
  const btnPhoneNext          = document.getElementById('btnPhoneNext');

  // Screen 4: Rating
  const starBtns              = document.querySelectorAll('#starContainer .star-btn');
  const starLabelDisplay      = document.getElementById('starLabelDisplay');
  const btnBackToPhone        = document.getElementById('btnBackToPhone');
  const btnRatingNext         = document.getElementById('btnRatingNext');

  // Screen 5: Method Selection
  const btnChooseVoice        = document.getElementById('btnChooseVoice');
  const btnChooseText         = document.getElementById('btnChooseText');
  const btnSkipFeedback       = document.getElementById('btnSkipFeedback');
  const btnBackToRating       = document.getElementById('btnBackToRating');

  // Screen 6A: Voice
  const btnVoiceToggle        = document.getElementById('btnVoiceToggle');
  const btnVoiceTriggerPill   = document.getElementById('btnVoiceTriggerPill');
  const micGlowWrap           = document.getElementById('micGlowWrap');
  const waveformBars          = document.getElementById('waveformBars');
  const voiceTimer            = document.getElementById('voiceTimer');
  const voiceStatusHint       = document.getElementById('voiceStatusHint');
  const voiceLanguageSelect   = document.getElementById('voiceLanguageSelect');
  const btnBackFromVoice      = document.getElementById('btnBackFromVoice');

  // Screen 6B: Text
  const textFeedbackInput     = document.getElementById('textFeedbackInput');
  const textCharCount         = document.getElementById('textCharCount');
  const btnClearText          = document.getElementById('btnClearText');
  const btnBackFromText       = document.getElementById('btnBackFromText');
  const btnTextContinue       = document.getElementById('btnTextContinue');

  // Screen 7: AI Preview
  const aiReviewEditText      = document.getElementById('aiReviewEditText');
  const btnEditReview         = document.getElementById('btnEditReview');
  const btnTryAgain           = document.getElementById('btnTryAgain');
  const btnLooksGood          = document.getElementById('btnLooksGood');
  const btnBackFromPreview    = document.getElementById('btnBackFromPreview');

  // Screen 8: Success
  const btnGoogleReviewAction = document.getElementById('btnGoogleReviewAction');
  const btnGoHome             = document.getElementById('btnGoHome');

  /* ── Application State ── */
  let patientName       = '';
  let patientPhone      = '';
  let selectedRating    = 0;
  let rawTranscript     = '';
  let aiReviewText      = '';
  let isRecording       = false;
  let isSubmitting      = false;

  // Voice recording references
  let activeAudioStream = null;
  let recordRTCInstance = null;
  let mediaRecorder     = null;
  let recordedChunks    = [];
  let recordedMimeType  = '';
  let speechRecognition = null;
  let timerInterval     = null;
  let recordingSeconds  = 0;

  const RATING_LABELS = {
    1: 'Very Poor',
    2: 'Poor',
    3: 'Average',
    4: 'Good',
    5: 'Excellent'
  };

  /* ── 1. Initialization ── */
  function init () {
    const urlParams     = new URLSearchParams(window.location.search);
    const hospitalParam = urlParams.get('hospital') || 'Tambaram Medical Center';

    if (elHospitalName) elHospitalName.textContent = hospitalParam;
    document.querySelectorAll('.hospital-name-text').forEach(el => {
      el.textContent = hospitalParam;
    });

    const nameParam = urlParams.get('name') || urlParams.get('patient') || '';
    if (nameParam && patientNameInput) {
      patientNameInput.value = nameParam.trim();
      patientName = nameParam.trim();
      updateNameDisplays(patientName);
    }

    const phoneParam = urlParams.get('phone') || urlParams.get('mobile') || '';
    if (phoneParam && patientPhoneInput) {
      const cleanPhone = phoneParam.replace(/\D/g, '').slice(-10);
      patientPhoneInput.value = cleanPhone;
      patientPhone = cleanPhone;
    }

    setupNavigation();
    setupStarRating();
    setupVoiceRecording();
    setupTextFeedback();
    setupAIPreview();
    setupSuccessScreen();
  }

  /* ── 2. Screen Navigation ── */
  function navigateToScreen (targetScreen) {
    if (!targetScreen) return;
    
    // Stop any active microphone hardware if moving away from voice screen
    if (isRecording && targetScreen !== stepVoice) {
      stopVoiceRecording();
    }

    const allScreens = [
      stepWelcome, stepName, stepPhone, stepRating,
      stepMethod, stepVoice, stepText, stepPreview, stepSuccess
    ];

    allScreens.forEach(s => {
      if (s) {
        s.classList.remove('active');
      }
    });

    targetScreen.classList.add('active');
  }

  function updateNameDisplays (name) {
    const displayName = name ? name.split(' ')[0] : 'Friend';
    patientNameDisplays.forEach(el => {
      el.textContent = displayName;
    });
  }

  function setupNavigation () {
    // Screen 1 -> Screen 2
    if (btnStartFlow) {
      btnStartFlow.addEventListener('click', () => {
        navigateToScreen(stepName);
        if (patientNameInput) patientNameInput.focus();
      });
    }

    // Screen 2 -> Back to 1
    if (btnBackToWelcome) {
      btnBackToWelcome.addEventListener('click', () => {
        navigateToScreen(stepWelcome);
      });
    }

    // Screen 2 -> Screen 3 (Name validation)
    if (btnNameNext) {
      btnNameNext.addEventListener('click', () => {
        const val = patientNameInput ? patientNameInput.value.trim() : '';
        if (!val) {
          if (nameInputError) nameInputError.classList.remove('hidden');
          if (patientNameInput) patientNameInput.focus();
          return;
        }
        if (nameInputError) nameInputError.classList.add('hidden');
        patientName = val;
        updateNameDisplays(patientName);
        navigateToScreen(stepPhone);
        if (patientPhoneInput) patientPhoneInput.focus();
      });
    }

    if (patientNameInput) {
      patientNameInput.addEventListener('input', () => {
        if (nameInputError) nameInputError.classList.add('hidden');
      });
      patientNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (btnNameNext) btnNameNext.click();
        }
      });
    }

    // Screen 3 -> Back to 2
    if (btnBackToName) {
      btnBackToName.addEventListener('click', () => {
        navigateToScreen(stepName);
      });
    }

    // Screen 3 -> Screen 4 (Phone validation)
    if (btnPhoneNext) {
      btnPhoneNext.addEventListener('click', () => {
        const raw = patientPhoneInput ? patientPhoneInput.value.trim() : '';
        const digits = raw.replace(/\D/g, '');
        // Validate 10 digits for Indian mobile numbers
        if (digits.length !== 10 || !/^[6-9]\d{9}$/.test(digits)) {
          if (phoneInputError) {
            phoneInputError.textContent = 'Please enter a valid 10-digit mobile number.';
            phoneInputError.classList.remove('hidden');
          }
          if (patientPhoneInput) patientPhoneInput.focus();
          return;
        }
        if (phoneInputError) phoneInputError.classList.add('hidden');
        patientPhone = digits;
        navigateToScreen(stepRating);
      });
    }

    if (patientPhoneInput) {
      patientPhoneInput.addEventListener('input', (e) => {
        // Enforce numeric only
        patientPhoneInput.value = patientPhoneInput.value.replace(/\D/g, '').slice(0, 10);
        if (phoneInputError) phoneInputError.classList.add('hidden');
      });
      patientPhoneInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (btnPhoneNext) btnPhoneNext.click();
        }
      });
    }

    // Screen 4 -> Back to 3
    if (btnBackToPhone) {
      btnBackToPhone.addEventListener('click', () => {
        navigateToScreen(stepPhone);
      });
    }

    // Screen 4 -> Screen 5
    if (btnRatingNext) {
      btnRatingNext.addEventListener('click', () => {
        if (!selectedRating) return;
        navigateToScreen(stepMethod);
      });
    }

    // Screen 5 -> Back to 4
    if (btnBackToRating) {
      btnBackToRating.addEventListener('click', () => {
        navigateToScreen(stepRating);
      });
    }

    // Screen 5 -> Screen 6A (Voice)
    if (btnChooseVoice) {
      btnChooseVoice.addEventListener('click', () => {
        navigateToScreen(stepVoice);
      });
    }

    // Screen 5 -> Screen 6B (Text)
    if (btnChooseText) {
      btnChooseText.addEventListener('click', () => {
        navigateToScreen(stepText);
        if (textFeedbackInput) textFeedbackInput.focus();
      });
    }

    // Screen 5 -> Skip & Submit Rating
    if (btnSkipFeedback) {
      btnSkipFeedback.addEventListener('click', () => {
        handleFinalSubmission('(Rating only feedback)');
      });
    }

    // Screen 6A -> Back to 5
    if (btnBackFromVoice) {
      btnBackFromVoice.addEventListener('click', () => {
        stopVoiceRecording();
        navigateToScreen(stepMethod);
      });
    }

    // Screen 6B -> Back to 5
    if (btnBackFromText) {
      btnBackFromText.addEventListener('click', () => {
        navigateToScreen(stepMethod);
      });
    }

    // Screen 7 -> Back to 5
    if (btnBackFromPreview) {
      btnBackFromPreview.addEventListener('click', () => {
        navigateToScreen(stepMethod);
      });
    }
  }

  /* ── 3. Star Rating ── */
  function setupStarRating () {
    starBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const starVal = parseInt(btn.dataset.star, 10);
        selectedRating = starVal;
        highlightStars(selectedRating);
        if (starLabelDisplay) {
          starLabelDisplay.textContent = RATING_LABELS[starVal] || '';
        }
        if (btnRatingNext) {
          btnRatingNext.disabled = false;
        }
      });

      btn.addEventListener('mouseenter', () => {
        const hoverVal = parseInt(btn.dataset.star, 10);
        starBtns.forEach((b, idx) => {
          b.classList.toggle('active', (idx + 1) <= hoverVal);
        });
      });

      btn.addEventListener('mouseleave', () => {
        highlightStars(selectedRating);
      });
    });
  }

  function highlightStars (count) {
    starBtns.forEach((btn, idx) => {
      btn.classList.toggle('active', count > 0 && (idx + 1) <= count);
    });
  }

  /* ── 4. Voice Recording Engine (Groq Whisper + RecordRTC) ── */
  function setupVoiceRecording () {
    if (btnVoiceToggle) {
      btnVoiceToggle.addEventListener('click', toggleVoiceRecording);
    }
    if (btnVoiceTriggerPill) {
      btnVoiceTriggerPill.addEventListener('click', toggleVoiceRecording);
    }
  }

  function toggleVoiceRecording () {
    if (isRecording) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  }

  async function startVoiceRecording () {
    isRecording = true;
    rawTranscript = '';
    recordedChunks = [];
    recordingSeconds = 0;

    // UI Updates
    if (micGlowWrap) micGlowWrap.classList.add('active');
    if (waveformBars) waveformBars.classList.add('active');
    if (btnVoiceToggle) btnVoiceToggle.classList.add('recording');
    if (btnVoiceTriggerPill) {
      btnVoiceTriggerPill.classList.add('recording');
      btnVoiceTriggerPill.innerHTML = '<span>Stop & Transcribe</span>';
    }
    if (voiceStatusHint) voiceStatusHint.textContent = 'Listening… Speak clearly in your language';
    if (voiceTimer) voiceTimer.textContent = '00:00 / 02:00';

    // Start Timer
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      recordingSeconds++;
      const m = String(Math.floor(recordingSeconds / 60)).padStart(2, '0');
      const s = String(recordingSeconds % 60).padStart(2, '0');
      if (voiceTimer) voiceTimer.textContent = `${m}:${s} / 02:00`;
      if (recordingSeconds >= 120) {
        stopVoiceRecording();
      }
    }, 1000);

    const selectedLang = voiceLanguageSelect ? voiceLanguageSelect.value : 'ta-IN';

    // 1. Audio stream capture
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        activeAudioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: false,
            autoGainControl: true,
            channelCount: 1,
            sampleRate: 16000
          }
        });

        if (typeof RecordRTC !== 'undefined') {
          recordRTCInstance = new RecordRTC(activeAudioStream, {
            type: 'audio',
            mimeType: 'audio/wav',
            recorderType: RecordRTC.StereoAudioRecorder,
            numberOfAudioChannels: 1,
            desiredSampRate: 16000,
            bufferSize: 4096,
            timeSlice: 1000
          });
          recordRTCInstance.startRecording();
          recordedMimeType = 'audio/wav';
        } else if (typeof MediaRecorder !== 'undefined') {
          let mime = 'audio/webm';
          if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mime = 'audio/webm;codecs=opus';
          else if (MediaRecorder.isTypeSupported('audio/mp4')) mime = 'audio/mp4';
          recordedMimeType = mime;
          mediaRecorder = new MediaRecorder(activeAudioStream, { mimeType: mime });
          mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) recordedChunks.push(e.data);
          };
          mediaRecorder.start(250);
        }
      }
    } catch (err) {
      console.warn('Microphone permission blocked or unavailable:', err);
      resetVoiceUI();
      if (voiceStatusHint) {
        voiceStatusHint.innerHTML = '⚠️ Microphone access blocked. Please allow mic permissions.';
      }
      return;
    }

    // 2. Real-time Web Speech recognition preview if supported
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        speechRecognition = new SpeechRec();
        speechRecognition.continuous = true;
        speechRecognition.interimResults = true;
        speechRecognition.lang = selectedLang;

        speechRecognition.onresult = (evt) => {
          let finalPart = '';
          for (let i = 0; i < evt.results.length; i++) {
            if (evt.results[i] && evt.results[i][0]) {
              finalPart += evt.results[i][0].transcript + ' ';
            }
          }
          if (finalPart.trim()) {
            rawTranscript = finalPart.trim();
            if (voiceStatusHint) voiceStatusHint.textContent = `"${rawTranscript.slice(0, 50)}…"`;
          }
        };

        speechRecognition.onerror = (e) => {
          if (e.error !== 'no-speech') console.warn('SpeechRec notice:', e.error);
        };

        speechRecognition.start();
      } catch (e) {}
    }
  }

  function resetVoiceUI () {
    isRecording = false;
    clearInterval(timerInterval);
    if (micGlowWrap) micGlowWrap.classList.remove('active');
    if (waveformBars) waveformBars.classList.remove('active');
    if (btnVoiceToggle) btnVoiceToggle.classList.remove('recording');
    if (btnVoiceTriggerPill) {
      btnVoiceTriggerPill.classList.remove('recording');
      btnVoiceTriggerPill.innerHTML = '<span>Tap to Start Recording</span>';
    }
  }

  async function stopVoiceRecording () {
    if (!isRecording) return;
    resetVoiceUI();

    if (speechRecognition) {
      try { speechRecognition.stop(); } catch (e) {}
    }

    if (voiceStatusHint) {
      voiceStatusHint.textContent = '⚡ Transcribing & polishing with AI…';
    }

    // Short buffer flush
    await new Promise(r => setTimeout(r, 300));

    // Gather Audio Blob
    let audioBlob = null;
    if (recordRTCInstance) {
      await new Promise(resolve => {
        const timeout = setTimeout(() => {
          try { audioBlob = recordRTCInstance.getBlob(); } catch (e) {}
          resolve();
        }, 1500);

        recordRTCInstance.stopRecording(() => {
          clearTimeout(timeout);
          try { audioBlob = recordRTCInstance.getBlob(); } catch (e) {}
          resolve();
        });
      });
      try { recordRTCInstance.destroy(); } catch (e) {}
      recordRTCInstance = null;
    } else if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      await new Promise(resolve => {
        mediaRecorder.onstop = () => {
          try { audioBlob = new Blob(recordedChunks, { type: recordedMimeType || 'audio/webm' }); } catch (e) {}
          resolve();
        };
        try { mediaRecorder.stop(); } catch (e) { resolve(); }
      });
    }

    // Release microphone tracks
    if (activeAudioStream) {
      try { activeAudioStream.getTracks().forEach(t => t.stop()); } catch (e) {}
      activeAudioStream = null;
    }

    const selectedLang = voiceLanguageSelect ? voiceLanguageSelect.value : 'ta-IN';
    let chosenTranscript = rawTranscript;

    // Use Groq Whisper STT API
    if (audioBlob && audioBlob.size > 200) {
      const whisperResult = await transcribeAudioWithWhisper(audioBlob, selectedLang);
      if (whisperResult && !isNonsense(whisperResult)) {
        chosenTranscript = whisperResult.trim();
      }
    }

    if (!chosenTranscript || isNonsense(chosenTranscript)) {
      if (voiceStatusHint) {
        voiceStatusHint.textContent = '⚠️ Could not hear clear words. Please tap and try again.';
      }
      return;
    }

    rawTranscript = chosenTranscript;

    // Clean and Polish with Groq AI
    try {
      const cleaned = await cleanWithGroq(rawTranscript, selectedLang);
      aiReviewText = (cleaned && cleaned !== '(No feedback text)') ? cleaned : rawTranscript;
    } catch (e) {
      aiReviewText = rawTranscript;
    }

    // Proceed to Screen 7 (AI Review Preview)
    if (aiReviewEditText) {
      aiReviewEditText.value = aiReviewText;
    }
    navigateToScreen(stepPreview);
  }

  /* ── 5. Whisper Audio Transcription API ── */
  async function transcribeAudioWithWhisper (audioBlob, langCode) {
    try {
      const formData = new FormData();
      let ext = 'wav';
      const mime = (audioBlob.type || recordedMimeType || '').toLowerCase();
      if (mime.includes('wav')) ext = 'wav';
      else if (mime.includes('mp4') || mime.includes('m4a')) ext = 'm4a';
      else ext = 'webm';

      formData.append('file', audioBlob, `voice.${ext}`);
      formData.append('model', 'whisper-large-v3');
      formData.append('temperature', '0');
      formData.append('prompt', 'Tambaram Medical Center: டாக்டர் நல்லா பாத்தாரு, ட்ரீட்மென்ட் பண்ணாங்க, குணமாகிடுச்சு, நர்சிங் ஸ்டாஃப், வெயிட்டிங் டைம், Doctor and nurse care was very helpful.');

      if (langCode) {
        const shortLang = langCode.split('-')[0].toLowerCase();
        formData.append('language', shortLang);
      }

      const resp = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + GROQ_API_KEY },
        body: formData
      });

      if (resp.ok) {
        const data = await resp.json();
        return (data.text || '').trim();
      }
    } catch (err) {
      console.warn('Whisper STT fetch error:', err);
    }
    return '';
  }

  function isNonsense (text) {
    if (!text || text.trim().length < 3) return true;
    const lower = text.trim().toLowerCase();
    const silenceHallucinations = [
      'ர ர', 'ரர', 'ர', 'ஆ ஆ', 'ஆ', 'த த', '...', '....', '---',
      'thank you', 'thanks for watching', 'subscribe', 'you', 'bye'
    ];
    return silenceHallucinations.includes(lower);
  }

  /* ── 6. Text Feedback (Screen 6B) ── */
  function setupTextFeedback () {
    if (textFeedbackInput) {
      textFeedbackInput.addEventListener('input', () => {
        const len = textFeedbackInput.value.length;
        if (textCharCount) textCharCount.textContent = `${len} / 800`;
      });
    }

    if (btnClearText) {
      btnClearText.addEventListener('click', () => {
        if (textFeedbackInput) {
          textFeedbackInput.value = '';
          if (textCharCount) textCharCount.textContent = '0 / 800';
          textFeedbackInput.focus();
        }
      });
    }

    if (btnTextContinue) {
      btnTextContinue.addEventListener('click', async () => {
        const raw = textFeedbackInput ? textFeedbackInput.value.trim() : '';
        if (!raw) {
          alert('Please enter a few words about your experience before continuing.');
          if (textFeedbackInput) textFeedbackInput.focus();
          return;
        }

        const origHtml = btnTextContinue.innerHTML;
        btnTextContinue.disabled = true;
        btnTextContinue.innerHTML = '<span>Polishing…</span>';

        try {
          const cleaned = await cleanWithGroq(raw, 'en');
          aiReviewText = (cleaned && cleaned !== '(No feedback text)') ? cleaned : raw;
        } catch (e) {
          aiReviewText = raw;
        } finally {
          btnTextContinue.disabled = false;
          btnTextContinue.innerHTML = origHtml;
        }

        if (aiReviewEditText) {
          aiReviewEditText.value = aiReviewText;
        }
        navigateToScreen(stepPreview);
      });
    }
  }

  /* ── 7. Groq AI Feedback Polisher & Translator ── */
  async function cleanWithGroq (rawText, sourceLangCode) {
    if (!rawText || !rawText.trim() || isNonsense(rawText)) return '(No feedback text)';

    const promptContent = `You are an expert healthcare patient review translator and editor for Tambaram Medical Center.
The patient provided feedback about their hospital visit in Tamil, Tanglish (English written in Tamil script), or English:
"${rawText}"

CRITICAL INSTRUCTIONS:
1. TRANSLATE AND TRANSLITERATE TO ENGLISH:
   - If the text is in Tamil script or Tamil language (e.g., 'இட் வாஸ் அ வண்டர்ஃபுல் டே ஐ ஹேவ் ஸ்பென்ட் ஹியர்', 'டாக்டர் மற்றும் நர்சிங் மிகவும் நன்று', 'மருத்துவமனை தூய்மையாக உள்ளது'), TRANSLATE it into fluent, natural English.
   - If the text is Tanglish (phonetic English words written in Tamil letters or Tamil mixed with English), decipher the exact intended English words and produce a natural English review.
2. POLISH AND CLEAN:
   - Correct all grammar, spelling, punctuation, and sentence flow.
   - Faithfully preserve the patient's exact sentiments, observations, compliments, and criticisms.
   - If positive, keep it warm, respectful, and appreciative.
   - If negative (e.g., long wait times, billing issues, staff behavior), preserve all constructive criticisms faithfully. NEVER flip complaints into praise.
   - Do NOT invent experiences or details the patient did not mention.
3. OUTPUT FORMAT:
   - Output ONLY the clean, polished English review text.
   - No quotation marks, no preamble, no markdown, no conversational commentary.`;

    const models = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b'];

    for (const model of models) {
      try {
        const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + GROQ_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: promptContent }],
            temperature: 0.1,
            max_tokens: 300
          })
        });

        if (resp.ok) {
          const data = await resp.json();
          const content = data.choices?.[0]?.message?.content?.trim();
          if (content && content.length > 0) {
            const clean = content.replace(/^["'`]|["'`]$/g, '').replace(/```[a-z]*\n?|\n?```/gi, '').trim();
            if (!isNonsense(clean)) return clean;
          }
        }
      } catch (err) {
        console.warn(`Groq ${model} fetch failed:`, err);
      }
    }

    return rawText;
  }

  /* ── 8. AI Review Preview (Screen 7) ── */
  function setupAIPreview () {
    if (btnEditReview) {
      btnEditReview.addEventListener('click', () => {
        if (aiReviewEditText) {
          aiReviewEditText.focus();
        }
      });
    }

    if (btnTryAgain) {
      btnTryAgain.addEventListener('click', () => {
        navigateToScreen(stepMethod);
      });
    }

    if (btnLooksGood) {
      btnLooksGood.addEventListener('click', () => {
        const currentText = aiReviewEditText ? aiReviewEditText.value.trim() : aiReviewText;
        handleFinalSubmission(currentText);
      });
    }
  }

  /* ── 9. Final Submission to Firebase RTDB ── */
  async function handleFinalSubmission (submissionReviewText) {
    if (isSubmitting) return;
    isSubmitting = true;

    if (btnLooksGood) {
      btnLooksGood.disabled = true;
      btnLooksGood.innerHTML = '<span>Submitting…</span>';
    }
    if (btnSkipFeedback) {
      btnSkipFeedback.disabled = true;
      btnSkipFeedback.textContent = 'Submitting…';
    }

    const reviewContent = submissionReviewText || '(No written comment)';
    const textLower = reviewContent.toLowerCase();

    // Sentiment detection
    let sentiment = 'positive';
    const negativeKeywords = /\b(dissatisfied|dislike|unhappy|poor|bad|worst|terrible|rude|arrogant|unprofessional|dirty|slow|late|delay|overcharg|pain|complaint|problem)\b|புடிக்கல|மோசம்/i;
    if (negativeKeywords.test(textLower)) {
      sentiment = 'negative';
    } else if (selectedRating <= 2) {
      sentiment = 'negative';
    } else if (selectedRating === 3) {
      sentiment = 'neutral';
    } else {
      sentiment = 'positive';
    }

    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token') || '';
    const hospitalParam = urlParams.get('hospital') || 'Tambaram Medical Center';
    const hospitalId = urlParams.get('hospital_id') || '11111111-1111-1111-1111-111111111111';

    const isGoogleEligible = (selectedRating >= 4 && sentiment === 'positive');

    const payload = {
      id:               'tmc-' + Date.now(),
      hospital_id:      hospitalId,
      hospital_name:    hospitalParam,
      visit_id:         tokenParam || ('visit-' + Date.now()),
      token:            tokenParam,
      patient_id:       patientName || 'Valued Patient',
      patient_name:     patientName || 'Valued Patient',
      phone:            patientPhone,
      phone_number:     patientPhone,
      rating:           Number(selectedRating) || 5,
      sentiment:        sentiment,
      healthcare_topic: 'Hospital Visit Feedback',
      feedback_text:    reviewContent,
      whatsapp_status:  'read',
      review_channel:   isGoogleEligible ? 'google_review' : 'web',
      is_google_review: isGoogleEligible,
      google_review_posted: isGoogleEligible,
      submitted_at:     new Date().toISOString()
    };

    // Firebase RTDB Save
    try {
      await fetch(FIREBASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      syncPatientAndVisitToFirebase(payload);
    } catch (e) {
      console.warn('Firebase RTDB save notice:', e);
    } finally {
      isSubmitting = false;
      if (btnLooksGood) {
        btnLooksGood.disabled = false;
        btnLooksGood.innerHTML = '<span>Looks Good</span>';
      }
      if (btnSkipFeedback) {
        btnSkipFeedback.disabled = false;
        btnSkipFeedback.textContent = 'Skip and Submit Rating';
      }
    }

    // Auto-copy final review text to clipboard for convenient Google review pasting
    if (reviewContent && reviewContent !== '(Rating only feedback)' && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        navigator.clipboard.writeText(reviewContent).catch(() => {});
      } catch (e) {}
    }

    // Configure Screen 8 Google review action
    if (btnGoogleReviewAction) {
      btnGoogleReviewAction.href = GOOGLE_REVIEW;
      btnGoogleReviewAction.addEventListener('click', () => {
        if (reviewContent && navigator.clipboard) {
          navigator.clipboard.writeText(reviewContent).catch(() => {});
        }
      });
    }

    // Transition to Screen 8 (Success)
    navigateToScreen(stepSuccess);
  }

  /* ── 10. Dynamic Patient & Visit Sync ── */
  async function syncPatientAndVisitToFirebase (data) {
    const FIREBASE_BASE = 'https://rescuebridge-fe59b-default-rtdb.firebaseio.com';
    try {
      const pPhoneClean = (data.phone || '').replace(/\D/g, '').slice(-10);
      const pNameClean = (data.patient_name || '').toLowerCase().trim();
      const numRating = Number(data.rating) || 5;
      const isGoogle = Boolean(data.google_review_posted || numRating >= 4);

      // Find matching patient
      const patientsRes = await fetch(`${FIREBASE_BASE}/patients.json`);
      const patientsData = (await patientsRes.json()) || {};
      let matchedKey = null;

      for (const [key, p] of Object.entries(patientsData)) {
        if (!p) continue;
        const phone = (p.phone || '').replace(/\D/g, '').slice(-10);
        const name = (p.name || '').toLowerCase().trim();
        if (pPhoneClean && phone && phone === pPhoneClean) {
          matchedKey = key;
          break;
        } else if (pNameClean && name && name === pNameClean) {
          matchedKey = key;
          break;
        }
      }

      if (matchedKey) {
        await fetch(`${FIREBASE_BASE}/patients/${encodeURIComponent(matchedKey)}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rating: numRating,
            review_status: 'completed',
            review_sent: true,
            review_channel: isGoogle ? 'google_review' : 'web',
            feedback_text: data.feedback_text || null,
            review_submitted_at: data.submitted_at || new Date().toISOString(),
            sentiment: data.sentiment || 'positive'
          })
        });
      }
    } catch (err) {
      console.warn('Firebase sync notice:', err);
    }
  }

  /* ── 11. Success Screen & Home Reset ── */
  function setupSuccessScreen () {
    if (btnGoHome) {
      btnGoHome.addEventListener('click', () => {
        resetFormState();
        navigateToScreen(stepWelcome);
      });
    }
  }

  function resetFormState () {
    patientName = '';
    patientPhone = '';
    selectedRating = 0;
    rawTranscript = '';
    aiReviewText = '';

    if (patientNameInput) patientNameInput.value = '';
    if (patientPhoneInput) patientPhoneInput.value = '';
    if (textFeedbackInput) {
      textFeedbackInput.value = '';
      if (textCharCount) textCharCount.textContent = '0 / 800';
    }
    if (aiReviewEditText) aiReviewEditText.value = '';

    highlightStars(0);
    if (starLabelDisplay) starLabelDisplay.textContent = 'Tap a star to rate';
    if (btnRatingNext) btnRatingNext.disabled = true;

    updateNameDisplays('Friend');
    resetVoiceUI();
  }

  /* ── Launch Application ── */
  document.addEventListener('DOMContentLoaded', init);
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    init();
  }

})();
