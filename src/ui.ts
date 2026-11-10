import { CONFIG } from './config';
import type { Avatar, GameConfig, Proposal } from './config';
import { drawCharacter } from './game';

export type SfxName = 'tap' | 'pickup' | 'error' | 'open' | 'win';

class Sfx {
  private ctx: AudioContext | null = null;
  muted = false;

  constructor() {
    try {
      this.muted = localStorage.getItem('sdc-muted') === '1';
    } catch {
      this.muted = false;
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    try {
      localStorage.setItem('sdc-muted', muted ? '1' : '0');
    } catch {
      return;
    }
  }

  private ensure(): AudioContext | null {
    const AudioCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return null;
    if (!this.ctx) this.ctx = new AudioCtor();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => undefined);
    }
    return this.ctx;
  }

  private tone(
    ctx: AudioContext,
    freq: number,
    delay: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    glideTo?: number,
  ): void {
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.04);
  }

  play(name: SfxName): void {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    switch (name) {
      case 'tap':
        this.tone(ctx, 640, 0, 0.06, 'triangle', 0.05);
        break;
      case 'pickup':
        this.tone(ctx, 660, 0, 0.13, 'triangle', 0.12);
        this.tone(ctx, 880, 0.08, 0.14, 'triangle', 0.12);
        this.tone(ctx, 1320, 0.16, 0.22, 'triangle', 0.1);
        break;
      case 'error':
        this.tone(ctx, 185, 0, 0.26, 'sawtooth', 0.07, 105);
        break;
      case 'open':
        this.tone(ctx, 392, 0, 0.16, 'triangle', 0.1);
        this.tone(ctx, 523.25, 0.11, 0.18, 'triangle', 0.1);
        this.tone(ctx, 659.25, 0.22, 0.2, 'triangle', 0.1);
        this.tone(ctx, 783.99, 0.33, 0.3, 'triangle', 0.12);
        this.tone(ctx, 1567.98, 0.44, 0.35, 'sine', 0.05);
        break;
      case 'win':
        this.tone(ctx, 523.25, 0, 0.16, 'triangle', 0.12);
        this.tone(ctx, 659.25, 0.13, 0.16, 'triangle', 0.12);
        this.tone(ctx, 783.99, 0.26, 0.18, 'triangle', 0.12);
        this.tone(ctx, 1046.5, 0.4, 0.45, 'triangle', 0.13);
        this.tone(ctx, 783.99, 0.4, 0.45, 'sine', 0.06);
        break;
    }
  }
}

export class UI {
  sfx = new Sfx();
  onPlay: (avatar: Avatar) => void = () => undefined;
  onReplay: () => void = () => undefined;

  private selected: Avatar = 'chico';
  private startScreen = document.getElementById('start-screen') as HTMLElement;
  private hud = document.getElementById('hud') as HTMLElement;
  private counter = document.getElementById('counter') as HTMLElement;
  private modal = document.getElementById('modal') as HTMLElement;
  private modalIndex = document.getElementById('modal-index') as HTMLElement;
  private modalTitle = document.getElementById('modal-title') as HTMLElement;
  private modalPhrase = document.getElementById('modal-phrase') as HTMLElement;
  private modalClose = document.getElementById('modal-close') as HTMLButtonElement;
  private winScreen = document.getElementById('win-screen') as HTMLElement;
  private listNumber = document.getElementById('list-number') as HTMLElement;
  private voteDate = document.getElementById('vote-date') as HTMLElement;
  private whatsapp = document.getElementById('btn-whatsapp') as HTMLButtonElement;
  private replay = document.getElementById('btn-replay') as HTMLButtonElement;
  private toastEl = document.getElementById('toast') as HTMLElement;
  private dpad = document.getElementById('dpad') as HTMLElement;
  private dpadButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.dpad-btn'));
  private soundBtn = document.getElementById('btn-sound') as HTMLButtonElement;
  private playBtn = document.getElementById('btn-play') as HTMLButtonElement;
  private loading = document.getElementById('loading') as HTMLElement;
  private avatarCards = Array.from(document.querySelectorAll<HTMLButtonElement>('.avatar-card'));
  private previewCanvases = Array.from(
    document.querySelectorAll<HTMLCanvasElement>('[data-preview]'),
  );
  private modalCallback: (() => void) | null = null;
  private toastTimer = 0;
  private previewRaf = 0;
  private previewStart = performance.now();
  private joystickCallback: (x: number, y: number) => void = () => undefined;
  private activeDirs = new Map<number, string>();

  constructor() {
    this.soundBtn.classList.toggle('is-muted', this.sfx.muted);
    this.bindAvatars();
    this.bindStart();
    this.bindModal();
    this.bindWin();
    this.bindSound();
    this.bindDpad();
    this.bindGlobalKeys();
    this.startPreviews();
    window.addEventListener('resize', () => {
      if (!this.hud.classList.contains('hidden')) this.updateControlsVisibility();
    });
  }

  private bindAvatars(): void {
    for (const card of this.avatarCards) {
      card.addEventListener('click', () => {
        const avatar = card.dataset.avatar === 'chica' ? 'chica' : 'chico';
        this.selected = avatar;
        for (const other of this.avatarCards) {
          const active = other === card;
          other.classList.toggle('is-selected', active);
          other.setAttribute('aria-checked', active ? 'true' : 'false');
        }
        this.sfx.play('tap');
      });
    }
  }

  private bindStart(): void {
    this.playBtn.addEventListener('click', () => {
      this.sfx.play('tap');
      this.onPlay(this.selected);
    });
  }

  private bindModal(): void {
    this.modalClose.addEventListener('click', () => {
      this.sfx.play('tap');
      this.closeModal();
    });
  }

  private bindWin(): void {
    this.whatsapp.addEventListener('click', () => {
      this.sfx.play('tap');
      this.shareWhatsApp();
    });
    this.replay.addEventListener('click', () => {
      this.sfx.play('tap');
      this.onReplay();
    });
  }

  private bindSound(): void {
    this.soundBtn.addEventListener('click', () => {
      this.sfx.setMuted(!this.sfx.muted);
      this.soundBtn.classList.toggle('is-muted', this.sfx.muted);
      if (!this.sfx.muted) this.sfx.play('tap');
    });
  }

  private bindGlobalKeys(): void {
    window.addEventListener('keydown', (event) => {
      if (this.modal.classList.contains('hidden')) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.closeModal();
      }
      if (event.key === 'Escape') this.closeModal();
    });
  }

  private bindDpad(): void {
    const emit = (): void => {
      let x = 0;
      let y = 0;
      for (const dir of this.activeDirs.values()) {
        if (dir === 'up') y -= 1;
        else if (dir === 'down') y += 1;
        else if (dir === 'left') x -= 1;
        else if (dir === 'right') x += 1;
      }
      x = Math.max(-1, Math.min(1, x));
      y = Math.max(-1, Math.min(1, y));
      this.joystickCallback(x, y);
    };

    for (const button of this.dpadButtons) {
      const dir = button.dataset.dir ?? '';
      if (!dir) continue;
      button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        this.activeDirs.set(event.pointerId, dir);
        button.classList.add('is-pressed');
        this.sfx.play('tap');
        emit();
      });
      const release = (event: PointerEvent): void => {
        this.activeDirs.delete(event.pointerId);
        button.classList.remove('is-pressed');
        emit();
      };
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('lostpointercapture', release);
      button.addEventListener('contextmenu', (event) => event.preventDefault());
    }

    window.addEventListener('blur', () => {
      this.activeDirs.clear();
      for (const button of this.dpadButtons) button.classList.remove('is-pressed');
      this.joystickCallback(0, 0);
    });
  }

  onJoystick(callback: (x: number, y: number) => void): void {
    this.joystickCallback = callback;
  }

  private startPreviews(): void {
    if (this.previewRaf) return;
    const draw = (): void => {
      this.previewRaf = requestAnimationFrame(draw);
      const t = (performance.now() - this.previewStart) / 1000;
      for (const canvas of this.previewCanvases) {
        const avatar: Avatar = canvas.dataset.preview === 'chica' ? 'chica' : 'chico';
        const rect = canvas.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) continue;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const bw = Math.round(rect.width * dpr);
        const bh = Math.round(rect.height * dpr);
        if (canvas.width !== bw || canvas.height !== bh) {
          canvas.width = bw;
          canvas.height = bh;
        }
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, rect.width, rect.height);
        const s = Math.min(rect.width / 92, rect.height / 118);
        drawCharacter(
          ctx,
          rect.width / 2,
          rect.height - 11,
          s,
          avatar,
          t * 2.1 + (avatar === 'chica' ? 1.1 : 0),
          false,
          1,
        );
      }
    };
    this.previewRaf = requestAnimationFrame(draw);
  }

  private stopPreviews(): void {
    cancelAnimationFrame(this.previewRaf);
    this.previewRaf = 0;
  }

  hideStart(): void {
    this.startScreen.classList.add('hidden');
    this.stopPreviews();
  }

  showLoading(show: boolean): void {
    this.loading.classList.toggle('hidden', !show);
  }

  beginGame(): void {
    this.hud.classList.remove('hidden');
    this.winScreen.classList.add('hidden');
    this.modal.classList.add('hidden');
    this.loading.classList.add('hidden');
    this.updateControlsVisibility();
  }

  private updateControlsVisibility(): void {
    const show =
      window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 820;
    this.dpad.classList.toggle('hidden', !show);
  }

  endGame(): void {
    this.hud.classList.add('hidden');
    this.dpad.classList.add('hidden');
    this.modal.classList.add('hidden');
    this.toastEl.classList.remove('is-visible');
  }

  updateCounter(done: number, total: number): void {
    this.counter.textContent = `${done}/${total}`;
  }

  showProposal(proposal: Proposal, index: number, onClose: () => void): void {
    window.clearTimeout(this.toastTimer);
    this.toastEl.classList.remove('is-visible');
    this.modalIndex.textContent = String(index);
    this.modalTitle.textContent = proposal.title;
    this.modalPhrase.textContent = proposal.phrase;
    this.modalCallback = onClose;
    this.modal.classList.remove('hidden');
    setTimeout(() => this.modalClose.focus({ preventScroll: true }), 60);
  }

  private closeModal(): void {
    if (this.modal.classList.contains('hidden')) return;
    this.modal.classList.add('hidden');
    const callback = this.modalCallback;
    this.modalCallback = null;
    callback?.();
  }

  toast(message: string, duration = 2300): void {
    window.clearTimeout(this.toastTimer);
    this.toastEl.textContent = message;
    this.toastEl.classList.add('is-visible');
    this.toastTimer = window.setTimeout(() => {
      this.toastEl.classList.remove('is-visible');
    }, duration);
  }

  showWin(campaign: GameConfig['campaign']): void {
    this.endGame();
    this.listNumber.textContent = campaign.numeroLista;
    this.voteDate.textContent = campaign.fechaVotacion;
    this.winScreen.classList.remove('hidden');
    this.createConfetti();
  }

  private createConfetti(): void {
    const old = this.winScreen.querySelectorAll('.win-confetti');
    old.forEach((node) => node.remove());
    const colors = ['#c1121f', '#17141a', '#ffc63d', '#ffffff', '#1faa55'];
    for (let i = 0; i < 26; i++) {
      const piece = document.createElement('span');
      piece.className = 'win-confetti';
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = colors[i % colors.length];
      piece.style.animationDelay = `${Math.random() * 0.9}s`;
      piece.style.animationDuration = `${2.2 + Math.random() * 1.8}s`;
      piece.style.setProperty('--drift', `${(Math.random() - 0.5) * 120}px`);
      this.winScreen.appendChild(piece);
    }
  }

  private shareWhatsApp(): void {
    const url = window.location.href.split('#')[0];
    const text = `${CONFIG.campaign.shareText} ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  }

  play(name: SfxName): void {
    this.sfx.play(name);
  }

  get selectedAvatar(): Avatar {
    return this.selected;
  }
}
