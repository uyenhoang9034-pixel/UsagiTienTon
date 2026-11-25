// Bộ tổng hợp Nhạc Giáng Sinh & SFX bằng Web Audio API (nhẹ, không lỗi CORS/404)

const NOTE_FREQ = {
  C4: 261.63, Cs4: 277.18, D4: 293.66, Ds4: 311.13, E4: 329.63, F4: 349.23,
  Fs4: 369.99, G4: 392.00, Gs4: 415.30, A4: 440.00, As4: 466.16, B4: 493.88,
  C5: 523.25, Cs5: 554.37, D5: 587.33, Ds5: 622.25, E5: 659.25, F5: 698.46,
  Fs5: 739.99, G5: 783.99, Gs5: 830.61, A5: 880.00, B5: 987.77,
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
  R: 0,
};

export const CHRISTMAS_SONGS = [
  {
    id: 'we_wish',
    title: 'We Wish You a Merry Christmas',
    tempoMs: 260,
    notes: [
      ['D4', 1], ['G4', 1], ['G4', 0.5], ['A4', 0.5], ['G4', 0.5], ['Fs4', 0.5], ['E4', 1], ['E4', 1],
      ['E4', 1], ['A4', 1], ['A4', 0.5], ['B4', 0.5], ['A4', 0.5], ['G4', 0.5], ['Fs4', 1], ['D4', 1],
      ['D4', 1], ['B4', 1], ['B4', 0.5], ['C5', 0.5], ['B4', 0.5], ['A4', 0.5], ['G4', 1], ['E4', 1],
      ['D4', 0.5], ['D4', 0.5], ['E4', 1], ['A4', 1], ['Fs4', 1], ['G4', 2],
      ['R', 1],
    ],
  },
  {
    id: 'last_christmas',
    title: 'Last Christmas',
    tempoMs: 250,
    notes: [
      // "Last Christmas, I gave you my heart..."
      ['E5', 1.5], ['E5', 1.5], ['D5', 1], ['R', 0.5], ['A4', 0.5],
      ['E5', 0.5], ['E5', 0.5], ['Fs5', 1], ['D5', 2], ['R', 0.5],
      ['B4', 0.5], ['E5', 0.5], ['E5', 0.5], ['Fs5', 1], ['D5', 1.5], ['R', 0.5],
      ['B4', 0.5], ['Cs5', 0.5], ['D5', 0.5], ['Cs5', 0.5], ['B4', 1.5], ['R', 0.5],
      // "This year, to save me from tears..."
      ['D5', 1.5], ['D5', 1.5], ['Cs5', 1], ['R', 0.5], ['A4', 0.5],
      ['D5', 0.5], ['D5', 0.5], ['E5', 1], ['Cs5', 2], ['R', 0.5],
      ['A4', 0.5], ['B4', 0.5], ['Cs5', 0.5], ['D5', 0.5], ['Cs5', 1], ['B4', 1], ['A4', 2],
      ['R', 1],
    ],
  },
  {
    id: 'jingle_bells',
    title: 'Jingle Bells',
    tempoMs: 220,
    notes: [
      ['E4', 1], ['E4', 1], ['E4', 2], ['E4', 1], ['E4', 1], ['E4', 2],
      ['E4', 1], ['G4', 1], ['C4', 1.5], ['D4', 0.5], ['E4', 3], ['R', 1],
      ['F4', 1], ['F4', 1], ['F4', 1.5], ['F4', 0.5], ['F4', 1], ['E4', 1], ['E4', 1], ['E4', 0.5], ['E4', 0.5],
      ['E4', 1], ['D4', 1], ['D4', 1], ['E4', 1], ['D4', 2], ['G4', 2],
      ['R', 1],
    ],
  },
  {
    id: 'silent_night',
    title: 'Silent Night',
    tempoMs: 320,
    notes: [
      ['G4', 1.5], ['A4', 0.5], ['G4', 1], ['E4', 3],
      ['G4', 1.5], ['A4', 0.5], ['G4', 1], ['E4', 3],
      ['D5', 2], ['D5', 1], ['B4', 3],
      ['C5', 2], ['C5', 1], ['G4', 3],
      ['A4', 2], ['A4', 1], ['C5', 1.5], ['B4', 0.5], ['A4', 1],
      ['G4', 1.5], ['A4', 0.5], ['G4', 1], ['E4', 3],
      ['R', 1],
    ],
  },
];

class ChristmasAudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicPlaying = false;
    this.songIndex = 0;
    this.noteIndex = 0;
    this.timer = null;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playTone(freq, durationSec, { type = 'triangle', volume = 0.08, delay = 0 } = {}) {
    if (this.muted || !freq) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(0.05, durationSec));

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationSec + 0.03);
  }

  startMusic() {
    if (this.musicPlaying || this.muted) return;
    this.ensureContext();
    this.musicPlaying = true;
    this.scheduleNextNote();
  }

  stopMusic() {
    this.musicPlaying = false;
    clearTimeout(this.timer);
    this.timer = null;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) {
      this.stopMusic();
    } else {
      this.startMusic();
    }
    return this.muted;
  }

  nextSong() {
    this.songIndex = (this.songIndex + 1) % CHRISTMAS_SONGS.length;
    this.noteIndex = 0;
    if (!this.muted) {
      clearTimeout(this.timer);
      this.musicPlaying = true;
      this.scheduleNextNote();
    }
    return CHRISTMAS_SONGS[this.songIndex];
  }

  getCurrentSong() {
    return CHRISTMAS_SONGS[this.songIndex];
  }

  scheduleNextNote() {
    if (!this.musicPlaying || this.muted) return;
    const song = CHRISTMAS_SONGS[this.songIndex];
    const [noteName, beats] = song.notes[this.noteIndex];
    const durMs = song.tempoMs * beats;
    const freq = NOTE_FREQ[noteName] || 0;

    if (freq > 0) {
      // Tiếng chuông / celesta Giáng Sinh
      this.playTone(freq, (durMs / 1000) * 0.92, { type: 'triangle', volume: 0.065 });
      this.playTone(freq * 0.5, (durMs / 1000) * 0.85, { type: 'sine', volume: 0.03 });
    }

    this.noteIndex += 1;
    if (this.noteIndex >= song.notes.length) {
      this.noteIndex = 0;
      this.songIndex = (this.songIndex + 1) % CHRISTMAS_SONGS.length;
    }

    this.timer = setTimeout(() => this.scheduleNextNote(), durMs);
  }

  playTapSfx(combo = 1) {
    const base = 340 + Math.min(combo, 10) * 28;
    this.playTone(base, 0.09, { type: 'sine', volume: 0.1 });
    this.playTone(base * 1.5, 0.08, { type: 'triangle', volume: 0.06, delay: 0.03 });
  }

  playCraftSfx() {
    this.playTone(523.25, 0.1, { type: 'triangle', volume: 0.1 });
    this.playTone(659.25, 0.1, { type: 'triangle', volume: 0.1, delay: 0.08 });
    this.playTone(783.99, 0.18, { type: 'triangle', volume: 0.11, delay: 0.16 });
  }

  playCoinSfx() {
    this.playTone(987.77, 0.09, { type: 'sine', volume: 0.1 });
    this.playTone(1318.51, 0.2, { type: 'sine', volume: 0.11, delay: 0.07 });
  }

  playWheelTickSfx() {
    this.playTone(700, 0.03, { type: 'square', volume: 0.035 });
  }

  playJackpotSfx() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
      this.playTone(f, 0.22, { type: 'triangle', volume: 0.11, delay: idx * 0.08 });
    });
  }
}

export const christmasAudio = new ChristmasAudioEngine();
