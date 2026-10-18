/* ==========================================================================
   Doctor Character Rig — Image-Backed 2D Animated Cartoon Engine
   Tambaram Medical Center Patient Feedback Portal
   ========================================================================== */

(function (global) {
  'use strict';

  // Check for reduced motion preference
  const prefersReducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let prefersReducedMotion = prefersReducedMotionQuery.matches;
  prefersReducedMotionQuery.addEventListener('change', (e) => {
    prefersReducedMotion = e.matches;
  });

  /* ── Math & Interpolation Utilities ── */
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function damp(current, target, smoothing, dt) {
    return lerp(current, target, 1 - Math.exp(-smoothing * dt));
  }

  /* ── Asset Preloader ── */
  const ASSET_PATHS = {
    // High-Resolution Authentic Base Artwork
    welcome: 'assets/assistant_welcome.png',
    pointing: 'assets/assistant_pointing.png',
    thumbsup: 'assets/assistant_thumbsup.png',
    namaste: 'assets/assistant_namaste.png',

    // Seamless Mouth Visemes for Audible Speech
    viseme_open: 'assets/rig/viseme_open.png',
    viseme_mid: 'assets/rig/viseme_mid.png',
    viseme_round: 'assets/rig/viseme_round.png'
  };

  const ASSET_IMAGES = {};
  let assetsLoaded = false;
  let loadCallbacks = [];

  function preloadAssets() {
    let pending = Object.keys(ASSET_PATHS).length;
    for (const [key, src] of Object.entries(ASSET_PATHS)) {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        ASSET_IMAGES[key] = img;
        pending--;
        if (pending === 0) {
          assetsLoaded = true;
          loadCallbacks.forEach((cb) => cb());
          loadCallbacks = [];
        }
      };
      img.onerror = () => {
        console.warn(`[DoctorRig] Failed to load character asset: ${src}`);
        pending--;
        if (pending === 0) {
          assetsLoaded = true;
          loadCallbacks.forEach((cb) => cb());
          loadCallbacks = [];
        }
      };
      ASSET_IMAGES[key] = img;
    }
  }

  // Kick off image loading immediately
  if (typeof window !== 'undefined') {
    preloadAssets();
  }

  /* ── Character Pose Configurations ── */
  // Coordinates are defined in the source artwork coordinate space (approx 360x365 to 360x453)
  const POSE_CONFIGS = {
    welcome: {
      imageKey: 'welcome',
      aspectRatio: 360 / 365,
      eyes: [{ x: 145, y: 107 }, { x: 203, y: 107 }],
      mouth: { x: 170, y: 153 },
      tiltTarget: 0.02,
      scaleAdjust: 1.0,
      listening: false
    },
    point_name: {
      imageKey: 'pointing',
      aspectRatio: 360 / 377,
      eyes: [{ x: 108, y: 114 }, { x: 166, y: 114 }],
      mouth: { x: 136, y: 160 },
      tiltTarget: 0.04,
      scaleAdjust: 0.98,
      listening: false
    },
    gesture_phone: {
      imageKey: 'pointing',
      aspectRatio: 360 / 377,
      eyes: [{ x: 108, y: 114 }, { x: 166, y: 114 }],
      mouth: { x: 136, y: 160 },
      tiltTarget: 0.03,
      scaleAdjust: 0.98,
      listening: false
    },
    rate_neutral: {
      imageKey: 'pointing',
      aspectRatio: 360 / 377,
      eyes: [{ x: 108, y: 114 }, { x: 166, y: 114 }],
      mouth: { x: 136, y: 160 },
      tiltTarget: 0.02,
      scaleAdjust: 0.98,
      listening: false
    },
    rate_empathetic: {
      imageKey: 'welcome',
      aspectRatio: 360 / 365,
      eyes: [{ x: 145, y: 107 }, { x: 203, y: 107 }],
      mouth: { x: 170, y: 153 },
      tiltTarget: -0.05, // Empathetic caring tilt
      scaleAdjust: 1.0,
      listening: true
    },
    rate_thoughtful: {
      imageKey: 'pointing',
      aspectRatio: 360 / 377,
      eyes: [{ x: 108, y: 114 }, { x: 166, y: 114 }],
      mouth: { x: 136, y: 160 },
      tiltTarget: -0.03,
      scaleAdjust: 0.98,
      listening: false
    },
    rate_happy: {
      imageKey: 'thumbsup',
      aspectRatio: 360 / 398,
      eyes: [{ x: 135, y: 112 }], // Right eye is already winking!
      mouth: { x: 162, y: 167 },
      tiltTarget: 0.03,
      scaleAdjust: 0.96,
      listening: false
    },
    offer_choice: {
      imageKey: 'welcome',
      aspectRatio: 360 / 365,
      eyes: [{ x: 145, y: 107 }, { x: 203, y: 107 }],
      mouth: { x: 170, y: 153 },
      tiltTarget: 0.02,
      scaleAdjust: 1.0,
      listening: false
    },
    listening: {
      imageKey: 'welcome',
      aspectRatio: 360 / 365,
      eyes: [{ x: 145, y: 107 }, { x: 203, y: 107 }],
      mouth: { x: 170, y: 153 },
      tiltTarget: 0.04,
      scaleAdjust: 1.0,
      listening: true
    },
    reading: {
      imageKey: 'pointing',
      aspectRatio: 360 / 377,
      eyes: [{ x: 108, y: 114 }, { x: 166, y: 114 }],
      mouth: { x: 136, y: 160 },
      tiltTarget: 0.05,
      scaleAdjust: 0.98,
      listening: false
    },
    thinking: {
      imageKey: 'pointing',
      aspectRatio: 360 / 377,
      eyes: [{ x: 108, y: 114 }, { x: 166, y: 114 }],
      mouth: { x: 136, y: 160 },
      tiltTarget: -0.04,
      scaleAdjust: 0.98,
      listening: false
    },
    preview: {
      imageKey: 'pointing',
      aspectRatio: 360 / 377,
      eyes: [{ x: 108, y: 114 }, { x: 166, y: 114 }],
      mouth: { x: 136, y: 160 },
      tiltTarget: 0.03,
      scaleAdjust: 0.98,
      listening: false
    },
    namaste: {
      imageKey: 'namaste',
      aspectRatio: 360 / 453,
      eyes: [{ x: 144, y: 134 }, { x: 212, y: 134 }],
      mouth: { x: 178, y: 178 },
      tiltTarget: 0.0,
      scaleAdjust: 0.92,
      listening: false
    },
    goodbye: {
      imageKey: 'thumbsup',
      aspectRatio: 360 / 398,
      eyes: [{ x: 135, y: 112 }],
      mouth: { x: 162, y: 167 },
      tiltTarget: 0.03,
      scaleAdjust: 0.96,
      listening: false
    }
  };

  /* ── Rigged Character Class ── */
  class DoctorRig {
    constructor(canvas, options = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.isSuccessMode = !!options.isSuccessMode;
      this.dpr = window.devicePixelRatio || 1;

      this.currentPoseName = 'welcome';
      this.currentConfig = POSE_CONFIGS.welcome;

      // Dynamics state
      this.state = {
        tilt: 0,
        tiltTarget: 0,
        breathTime: Math.random() * Math.PI * 2,
        breathY: 0,
        breathScaleY: 1,
        nodY: 0,
        nodTilt: 0,
        blink: 0,
        gaze: { x: 0, y: 0 },
        activeViseme: 'rest' // 'rest', 'viseme_open', 'viseme_mid', 'viseme_round'
      };

      // Blinking controller
      this.blinkTimer = 2.0 + Math.random() * 2.5;
      this.isBlinking = false;
      this.blinkProgress = 0;

      // Speaking controller
      this.isSpeaking = false;
      this.speakDuration = 0;
      this.speakTime = 0;
      this.visemeCycleTimer = 0;
      this.audioLevel = 0;

      this.lastTimestamp = performance.now();
      this.running = false;
      this.rafId = null;

      this.initCanvas();
      this.start();
    }

    initCanvas() {
      const rect = this.canvas.getBoundingClientRect();
      const cssWidth = rect.width || (this.isSuccessMode ? 130 : 115);
      const cssHeight = rect.height || 155;

      this.canvasWidth = cssWidth;
      this.canvasHeight = cssHeight;

      this.canvas.width = Math.round(cssWidth * this.dpr);
      this.canvas.height = Math.round(cssHeight * this.dpr);
      this.canvas.style.width = `${cssWidth}px`;
      this.canvas.style.height = `${cssHeight}px`;
    }

    start() {
      if (this.running) return;
      this.running = true;
      this.lastTimestamp = performance.now();

      const tick = (now) => {
        if (!this.running) return;
        const dt = Math.min((now - this.lastTimestamp) / 1000, 0.1);
        this.lastTimestamp = now;

        this.update(dt);
        this.render();

        this.rafId = requestAnimationFrame(tick);
      };
      this.rafId = requestAnimationFrame(tick);
    }

    stop() {
      this.running = false;
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    }

    setPose(poseName) {
      if (!POSE_CONFIGS[poseName]) {
        poseName = 'welcome';
      }
      this.currentPoseName = poseName;
      this.currentConfig = POSE_CONFIGS[poseName];
      this.state.tiltTarget = this.currentConfig.tiltTarget;
    }

    setGaze(x, y) {
      this.state.gaze.x = clamp(x, -1, 1);
      this.state.gaze.y = clamp(y, -1, 1);
    }

    setAudioLevel(level) {
      this.audioLevel = clamp(level, 0, 1);
    }

    speak(durationSeconds = 2.5) {
      this.isSpeaking = true;
      this.speakDuration = Math.max(1.2, durationSeconds);
      this.speakTime = 0;
      this.visemeCycleTimer = 0;
      this.cycleViseme();
    }

    stopSpeaking() {
      this.isSpeaking = false;
      this.speakTime = 0;
      this.state.activeViseme = 'rest';
      this.state.nodY = 0;
      this.state.nodTilt = 0;
    }

    cycleViseme() {
      const visemes = ['viseme_open', 'viseme_mid', 'viseme_round', 'rest'];
      // Randomly pick active mouth viseme
      const next = visemes[Math.floor(Math.random() * visemes.length)];
      this.state.activeViseme = next;
    }

    update(dt) {
      const cfg = this.currentConfig;
      const smoothRate = prefersReducedMotion ? 12 : 7.0;

      // 1. Organic Breathing Motion
      if (!prefersReducedMotion) {
        const breathSpeed = cfg.listening ? 1.6 : 2.2;
        this.state.breathTime += dt * breathSpeed;
        this.state.breathY = Math.sin(this.state.breathTime) * 1.5;
        this.state.breathScaleY = 1.0 + Math.sin(this.state.breathTime) * 0.007;
      } else {
        this.state.breathY = 0;
        this.state.breathScaleY = 1.0;
      }

      // 2. Speaking Lip-Sync & Head Rhythm
      if (this.isSpeaking) {
        this.speakTime += dt;
        this.visemeCycleTimer += dt;

        if (this.speakTime >= this.speakDuration) {
          this.stopSpeaking();
        } else {
          // Cycle visemes rhythmically
          if (this.visemeCycleTimer > 0.13) {
            this.visemeCycleTimer = 0;
            this.cycleViseme();
          }

          // Gentle head nod in sync with speech
          if (!prefersReducedMotion) {
            this.state.nodY = Math.sin(this.speakTime * 9.0) * 1.6;
            this.state.nodTilt = Math.sin(this.speakTime * 5.5) * 0.015;
          }
        }
      } else {
        this.state.nodY = damp(this.state.nodY, 0, smoothRate, dt);
        this.state.nodTilt = damp(this.state.nodTilt, 0, smoothRate, dt);
      }

      // 3. Natural Blinking Controller
      this.blinkTimer -= dt;
      if (this.blinkTimer <= 0) {
        this.isBlinking = true;
        this.blinkProgress = 0;
        // Poisson distribution between 2.5s and 5.0s
        this.blinkTimer = 2.5 + Math.random() * 2.8;
      }

      if (this.isBlinking) {
        this.blinkProgress += dt * 16.0; // ~150-180ms blink
        if (this.blinkProgress >= Math.PI) {
          this.isBlinking = false;
          this.state.blink = 0;
        } else {
          this.state.blink = Math.sin(this.blinkProgress);
        }
      } else {
        this.state.blink = 0;
      }

      // 4. Head Tilt Damping
      const targetTilt = cfg.tiltTarget + this.state.nodTilt;
      this.state.tilt = damp(this.state.tilt, targetTilt, smoothRate, dt);
    }

    render() {
      const ctx = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;

      ctx.clearRect(0, 0, w, h);

      const cfg = this.currentConfig;
      const baseImg = ASSET_IMAGES[cfg.imageKey];

      if (!baseImg || !baseImg.complete || baseImg.naturalWidth === 0) {
        return; // Waiting for image load
      }

      const cssW = this.canvasWidth;
      const cssH = this.canvasHeight;

      ctx.save();
      ctx.scale(this.dpr, this.dpr);

      // Character anchor at bottom center
      const anchorX = cssW / 2;
      const anchorY = cssH;

      ctx.translate(anchorX, anchorY);

      // ── Apply Breathing & Head Tilt ──
      ctx.translate(0, this.state.breathY + this.state.nodY);
      ctx.rotate(this.state.tilt);
      ctx.scale(1.0, this.state.breathScaleY);

      // Calculate image display dimensions
      const imgNaturalW = baseImg.naturalWidth;
      const imgNaturalH = baseImg.naturalHeight;

      // Fit to container height (leaving 2px headroom)
      const targetDrawH = (cssH - 2) * (cfg.scaleAdjust || 1.0);
      const targetDrawW = targetDrawH * (imgNaturalW / imgNaturalH);

      const drawX = -targetDrawW / 2;
      const drawY = -targetDrawH;

      // ── Layer 1: Render Authentic Illustration ──
      ctx.drawImage(baseImg, drawX, drawY, targetDrawW, targetDrawH);

      // Coordinates mapping ratio from natural image pixels to canvas display pixels
      const scaleFactor = targetDrawH / imgNaturalH;

      // ── Layer 2: Natural Eye Blinking & Gaze ──
      if (this.state.blink > 0.05 && cfg.eyes) {
        cfg.eyes.forEach((eye) => {
          // Compute canvas position of this eye
          const ex = drawX + eye.x * scaleFactor;
          const ey = drawY + eye.y * scaleFactor;

          const eyeRadiusX = 13.5 * scaleFactor;
          const eyeRadiusY = 10.5 * scaleFactor;
          const blinkHeight = eyeRadiusY * 2 * this.state.blink;

          ctx.save();
          ctx.beginPath();
          ctx.ellipse(ex, ey, eyeRadiusX, eyeRadiusY, 0, 0, Math.PI * 2);
          ctx.clip();

          // Eyelid skin tone
          ctx.fillStyle = '#ECB294';
          ctx.fillRect(ex - eyeRadiusX - 2, ey - eyeRadiusY - 2, (eyeRadiusX + 2) * 2, blinkHeight + 4);

          // Eyelash contour line
          ctx.strokeStyle = '#281814';
          ctx.lineWidth = 2.2 * scaleFactor;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(ex, ey - eyeRadiusY + blinkHeight, eyeRadiusX * 0.95, 0.15 * Math.PI, 0.85 * Math.PI);
          ctx.stroke();

          ctx.restore();
        });
      }

      // ── Layer 3: Synchronized Mouth Lip-Sync ──
      if (this.isSpeaking && this.state.activeViseme !== 'rest' && cfg.mouth) {
        const visemeImg = ASSET_IMAGES[this.state.activeViseme];
        if (visemeImg && visemeImg.complete && visemeImg.naturalWidth > 0) {
          const mx = drawX + cfg.mouth.x * scaleFactor;
          const my = drawY + cfg.mouth.y * scaleFactor;

          const visemeW = visemeImg.naturalWidth * scaleFactor;
          const visemeH = visemeImg.naturalHeight * scaleFactor;

          ctx.save();
          // Subtle mouth open animation
          ctx.drawImage(visemeImg, mx - visemeW / 2, my - visemeH / 2, visemeW, visemeH);
          ctx.restore();
        }
      }

      ctx.restore();
    }
  }

  /* ── Rig Controller & Audible Speech Engine ── */
  class DoctorCharacterRigController {
    constructor() {
      this.instances = [];
      this.currentPose = 'welcome';
      this.speechSynth = typeof window !== 'undefined' ? window.speechSynthesis : null;
      this.isMuted = false;
      this.availableVoices = [];
      this.selectedVoice = null;

      // Restore mute preference if saved
      if (typeof localStorage !== 'undefined') {
        this.isMuted = localStorage.getItem('tmc_doctor_voice_muted') === 'true';
      }

      this.initVoices();
    }

    initVoices() {
      if (!this.speechSynth) return;

      const loadVoices = () => {
        this.availableVoices = this.speechSynth.getVoices() || [];
        // Prioritize natural, friendly female English voices
        this.selectedVoice =
          this.availableVoices.find(
            (v) =>
              v.lang.startsWith('en') &&
              (v.name.includes('Samantha') ||
                v.name.includes('Zira') ||
                v.name.includes('Google US English') ||
                v.name.includes('Natural') ||
                v.name.includes('Female'))
          ) ||
          this.availableVoices.find((v) => v.lang.startsWith('en')) ||
          this.availableVoices[0];
      };

      loadVoices();
      if (this.speechSynth.onvoiceschanged !== undefined) {
        this.speechSynth.onvoiceschanged = loadVoices;
      }
    }

    registerCanvas(canvas, options = {}) {
      if (!canvas) return null;
      const rig = new DoctorRig(canvas, options);
      rig.setPose(this.currentPose);
      this.instances.push(rig);
      return rig;
    }

    setPose(poseName) {
      this.currentPose = poseName;
      this.instances.forEach((rig) => rig.setPose(poseName));
    }

    setGaze(x, y) {
      this.instances.forEach((rig) => rig.setGaze(x, y));
    }

    setAudioLevel(level) {
      this.instances.forEach((rig) => rig.setAudioLevel(level));
    }

    speak(textOrSeconds) {
      let speechText = '';
      let duration = 2.5;

      if (typeof textOrSeconds === 'string') {
        speechText = textOrSeconds.trim();
        // Estimate natural speaking duration: ~14 characters per second, minimum 1.8s
        duration = Math.max(1.8, speechText.length * 0.07);
      } else if (typeof textOrSeconds === 'number') {
        duration = textOrSeconds;
      }

      // Trigger animated lip sync & nodding across all canvases
      this.instances.forEach((rig) => rig.speak(duration));

      // Trigger audible Web Speech API voice synthesis if not muted
      if (speechText && this.speechSynth && !this.isMuted) {
        try {
          this.speechSynth.cancel(); // Stop any pending speech

          const utterance = new SpeechSynthesisUtterance(speechText);
          utterance.rate = 1.0;
          utterance.pitch = 1.08;

          if (this.selectedVoice) {
            utterance.voice = this.selectedVoice;
          }

          utterance.onstart = () => {
            this.instances.forEach((rig) => rig.speak(duration));
          };

          // Synchronize mouth viseme pops with word boundaries
          utterance.onboundary = () => {
            this.instances.forEach((rig) => rig.cycleViseme());
          };

          utterance.onend = () => {
            this.instances.forEach((rig) => rig.stopSpeaking());
          };

          utterance.onerror = () => {
            this.instances.forEach((rig) => rig.stopSpeaking());
          };

          this.speechSynth.speak(utterance);
        } catch (e) {
          console.warn('[DoctorRig] Speech synthesis playback warning:', e);
        }
      }
    }

    stopSpeaking() {
      this.instances.forEach((rig) => rig.stopSpeaking());
      if (this.speechSynth) {
        try {
          this.speechSynth.cancel();
        } catch (e) {}
      }
    }

    toggleMute() {
      this.isMuted = !this.isMuted;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('tmc_doctor_voice_muted', this.isMuted ? 'true' : 'false');
      }

      if (this.isMuted) {
        this.stopSpeaking();
      }

      this.updateAudioToggleButtons();
      return this.isMuted;
    }

    setMute(isMuted) {
      this.isMuted = !!isMuted;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('tmc_doctor_voice_muted', this.isMuted ? 'true' : 'false');
      }
      if (this.isMuted) {
        this.stopSpeaking();
      }
      this.updateAudioToggleButtons();
    }

    updateAudioToggleButtons() {
      const btn = document.getElementById('btnAudioToggle');
      if (!btn) return;
      const icon = document.getElementById('audioToggleIcon');
      const text = btn.querySelector('.audio-toggle-text');

      if (this.isMuted) {
        btn.classList.add('muted');
        if (icon) icon.textContent = '🔇';
        if (text) text.textContent = 'Muted';
        btn.setAttribute('title', 'Doctor voice is muted. Tap to enable voice.');
      } else {
        btn.classList.remove('muted');
        if (icon) icon.textContent = '🔊';
        if (text) text.textContent = 'Voice';
        btn.setAttribute('title', 'Doctor voice is active. Tap to mute.');
      }
    }

    handleResize() {
      this.instances.forEach((rig) => rig.initCanvas());
    }
  }

  // Export singletons
  global.DoctorRig = DoctorRig;
  global.doctorRigController = new DoctorCharacterRigController();

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', () => {
      global.doctorRigController.handleResize();
    });

    document.addEventListener('DOMContentLoaded', () => {
      global.doctorRigController.updateAudioToggleButtons();
    });
  }

})(typeof window !== 'undefined' ? window : this);
