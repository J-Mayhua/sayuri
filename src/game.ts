import { CONFIG } from './config';
import type { Avatar, Pt, Proposal } from './config';
import type { UI } from './ui';

interface Marker {
  proposal: Proposal;
  done: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  rot: number;
  vr: number;
}

interface PatrolUnit {
  a: Pt;
  b: Pt;
  x: number;
  y: number;
  t: number;
  dir: number;
  speed: number;
  hitRadius: number;
  protectionMs: number;
}

interface ObstacleWorld {
  name: string;
  points: Pt[];
}

type GameState = 'menu' | 'playing' | 'paused' | 'won';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

function starPath(
  ctx: CanvasRenderingContext2D,
  outer: number,
  inner: number,
  points: number,
): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function pointInPolygon(x: number, y: number, points: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x;
    const yi = points[i].y;
    const xj = points[j].x;
    const yj = points[j].y;
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function distanceToSegment(px: number, py: number, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - a.x, py - a.y);
  let t = ((px - a.x) * dx + (py - a.y) * dy) / lenSq;
  t = clamp(t, 0, 1);
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
}

function drawLeg(ctx: CanvasRenderingContext2D, hipX: number, swing: number): void {
  const footX = hipX + swing;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#17141a';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(hipX, -33);
  ctx.lineTo(footX, -7);
  ctx.stroke();
  ctx.fillStyle = '#f4efe3';
  ctx.beginPath();
  ctx.ellipse(footX, -2.4, 7.2, 2.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#121014';
  ctx.beginPath();
  ctx.ellipse(footX + 0.6, -4.2, 6.6, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawArm(ctx: CanvasRenderingContext2D, side: number, swing: number): void {
  const shoulderX = side * 13.5;
  const handX = side * 15 + swing;
  const handY = -38;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#7d0a12';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(shoulderX, -60);
  ctx.quadraticCurveTo(side * 18, -49, handX, handY);
  ctx.stroke();
  ctx.strokeStyle = '#c1121f';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(shoulderX, -60);
  ctx.quadraticCurveTo(side * 18, -49, handX, handY);
  ctx.stroke();
  ctx.fillStyle = '#efb287';
  ctx.beginPath();
  ctx.arc(handX, handY + 2, 3.4, 0, Math.PI * 2);
  ctx.fill();
}

export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  avatar: Avatar,
  phase: number,
  moving: boolean,
  facing: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.scale(facing < 0 ? -1 : 1, 1);

  const swing = moving ? Math.sin(phase) * 8.5 : 0;
  const bob = moving ? Math.abs(Math.sin(phase)) * 2.2 : Math.sin(phase * 1.7) * 0.9;

  ctx.fillStyle = 'rgba(20, 16, 16, 0.24)';
  ctx.beginPath();
  ctx.ellipse(0, -1.5, 17.5, 5.6, 0, 0, Math.PI * 2);
  ctx.fill();

  drawLeg(ctx, -6, swing);
  drawLeg(ctx, 6, -swing);

  ctx.save();
  ctx.translate(0, -bob);

  if (avatar === 'chica') {
    ctx.fillStyle = '#241c19';
    roundedRect(ctx, -12.5, -83, 25, 32, 11);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-12.5, -72, 6, 0, Math.PI * 2);
    ctx.arc(12.5, -72, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = '#e2a578';
  ctx.lineWidth = 8;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.moveTo(0, -66);
  ctx.lineTo(0, -59);
  ctx.stroke();

  const sweater = ctx.createLinearGradient(0, -66, 0, -30);
  sweater.addColorStop(0, '#d81d2b');
  sweater.addColorStop(1, '#a90e18');
  ctx.fillStyle = sweater;
  ctx.strokeStyle = '#650810';
  ctx.lineWidth = 1.6;
  roundedRect(ctx, -15.5, -66, 31, 35, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#7d0a12';
  roundedRect(ctx, -8.5, -67.5, 17, 6.5, 3.2);
  ctx.fill();

  ctx.fillStyle = '#17141a';
  ctx.fillRect(-15.5, -37, 31, 3.4);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 13px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('2', 0, -51);

  drawArm(ctx, -1, swing);
  drawArm(ctx, 1, -swing);

  ctx.fillStyle = avatar === 'chica' ? '#f3bd91' : '#f0b487';
  ctx.strokeStyle = '#2a1d17';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, -77, 11.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (avatar === 'chico') {
    ctx.fillStyle = '#221a17';
    ctx.beginPath();
    ctx.arc(0, -78, 11.8, Math.PI * 1.02, Math.PI * 1.98);
    ctx.lineTo(10, -82);
    ctx.quadraticCurveTo(2, -87.5, -6, -82);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-11, -75, 2.6, 4, 0.15, 0, Math.PI * 2);
    ctx.ellipse(11, -75, 2.6, 4, -0.15, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#241c19';
    ctx.beginPath();
    ctx.arc(0, -78, 11.8, Math.PI * 1.0, Math.PI * 2.0);
    ctx.lineTo(12, -75);
    ctx.quadraticCurveTo(7, -80, 2, -79);
    ctx.quadraticCurveTo(-6, -80, -12, -74);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c1121f';
    ctx.beginPath();
    ctx.arc(-13, -70, 2.4, 0, Math.PI * 2);
    ctx.arc(13, -70, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#241c19';
  ctx.beginPath();
  ctx.arc(-4.1, -77, 1.55, 0, Math.PI * 2);
  ctx.arc(4.1, -77, 1.55, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#9a5c3f';
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, -72.5, 3.1, 0.25 * Math.PI, 0.75 * Math.PI);
  ctx.stroke();

  ctx.fillStyle = 'rgba(215, 93, 83, 0.24)';
  ctx.beginPath();
  ctx.arc(-7.2, -73.2, 2.1, 0, Math.PI * 2);
  ctx.arc(7.2, -73.2, 2.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
  ctx.restore();
}

export class Game {
  readonly whenReady: Promise<void>;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ui: UI;
  private image = new Image();
  private resolveReady!: () => void;
  private ready = false;
  private loadError = false;
  private worldW = 1600;
  private worldH = 1200;
  private viewW = 1;
  private viewH = 1;
  private dpr = 1;
  private scale = 1;
  private camera = { x: 800, y: 600 };
  private player = { x: 800, y: 600, facing: 1, phase: 0 };
  private state: GameState = 'menu';
  private avatar: Avatar = 'chico';
  private markers: Marker[] = [];
  private obstacles: ObstacleWorld[] = [];
  private completed = 0;
  private gateOpen = false;
  private gateStart = 0;
  private particles: Particle[] = [];
  private keys = new Set<string>();
  private joystick = { x: 0, y: 0 };
  private pointerStart: { x: number; y: number; t: number } | null = null;
  private debug = false;
  private lastWarn = -10;
  private time = 0;
  private lastFrame = 0;
  private rafId = 0;
  private fence: Pt[] = [];
  private gateGapWorld = { start: 0, end: 0 };
  private bananaWorld: Pt[] = [];
  private puddleWorld: Pt[] = [];
  private wasInPuddle = false;
  private patrolUnits: PatrolUnit[] = [];
  private invulnerableUntil = 0;

  constructor(canvas: HTMLCanvasElement, ui: UI) {
    this.canvas = canvas;
    this.ui = ui;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas no disponible');
    this.ctx = ctx;

    this.whenReady = new Promise<void>((resolve) => {
      this.resolveReady = resolve;
    });

    const params = new URLSearchParams(window.location.search);
    this.debug = params.get('debug') === '1';

    this.image.onload = () => {
      this.worldW = this.image.naturalWidth || 1600;
      this.worldH = this.image.naturalHeight || 1200;
      this.ready = true;
      this.buildWorld();
      this.resize();
      this.resolveReady();
    };
    this.image.onerror = () => {
      this.loadError = true;
      this.ready = true;
      this.buildWorld();
      this.resize();
      this.resolveReady();
    };
    this.image.src = `${import.meta.env.BASE_URL}${CONFIG.mapFile}`;

    this.buildWorld();
    this.resize();
    this.bindEvents();
    this.loop(performance.now());
  }

  get isReady(): boolean {
    return this.ready;
  }

  get hasMap(): boolean {
    return this.ready && !this.loadError;
  }

  start(avatar: Avatar): void {
    this.avatar = avatar;
    this.state = 'playing';
    this.completed = 0;
    this.gateOpen = false;
    this.gateStart = 0;
    this.particles = [];
    this.joystick = { x: 0, y: 0 };
    this.keys.clear();
    this.player.x = CONFIG.playerStart.x * this.worldW;
    this.player.y = CONFIG.playerStart.y * this.worldH;
    this.player.facing = 1;
    this.player.phase = 0;
    for (const unit of this.patrolUnits) {
      unit.t = 0;
      unit.dir = 1;
      unit.x = unit.a.x;
      unit.y = unit.a.y;
    }
    this.invulnerableUntil = 0;
    this.wasInPuddle = false;
    this.markers = CONFIG.proposals.map((proposal) => ({ proposal, done: false }));
    this.camera.x = this.player.x;
    this.camera.y = this.player.y;
    this.updateCamera(0, true);
    this.ui.updateCounter(0, CONFIG.proposals.length);

    if (this.loadError) {
      this.ui.toast('No se pudo cargar el mapa, pero puedes jugar');
    } else {
      this.ui.toast('Usa las flechas o los botones para caminar');
    }

    setTimeout(() => {
      if (this.state === 'playing') this.ui.toast('Busca las 5 estrellas');
    }, 3200);
  }

  restart(): void {
    this.start(this.avatar);
  }

  private resetToStart(): void {
    this.player.x = CONFIG.playerStart.x * this.worldW;
    this.player.y = CONFIG.playerStart.y * this.worldH;
    this.player.facing = 1;
    this.player.phase = 0;
    this.joystick = { x: 0, y: 0 };
    this.keys.clear();
    this.moving = false;
    this.wasInPuddle = false;
    this.camera.x = this.player.x;
    this.camera.y = this.player.y;
    this.updateCamera(0, true);
  }

  private isInPuddle(x: number, y: number): boolean {
    for (const p of this.puddleWorld) {
      if (Math.hypot(p.x - x, p.y - y) < CONFIG.traps.puddleRadius) return true;
    }
    return false;
  }

  private checkBananas(): void {
    for (const p of this.bananaWorld) {
      if (Math.hypot(p.x - this.player.x, p.y - this.player.y) < CONFIG.traps.bananaRadius) {
        this.ui.play('error');
        this.ui.toast('¡Resbalón! Pisaste una cáscara. Vuelves al inicio');
        this.resetToStart();
        return;
      }
    }
  }

  private updatePatrols(dt: number): void {
    for (const unit of this.patrolUnits) {
      const len = Math.hypot(unit.b.x - unit.a.x, unit.b.y - unit.a.y);
      if (len < 1) continue;
      unit.t += (unit.speed * dt * unit.dir) / len;
      if (unit.t >= 1) {
        unit.t = 1;
        unit.dir = -1;
      } else if (unit.t <= 0) {
        unit.t = 0;
        unit.dir = 1;
      }
      unit.x = lerp(unit.a.x, unit.b.x, unit.t);
      unit.y = lerp(unit.a.y, unit.b.y, unit.t);
    }
  }

  private checkPatrolHit(): void {
    if (this.time < this.invulnerableUntil) return;
    for (const unit of this.patrolUnits) {
      if (Math.hypot(unit.x - this.player.x, unit.y - this.player.y) < unit.hitRadius) {
        this.ui.play('error');
        this.ui.toast('¡Te atrapó el robot! Vuelves al inicio');
        this.resetToStart();
        this.invulnerableUntil = this.time + unit.protectionMs / 1000;
        return;
      }
    }
  }

  toggleDebug(): void {
    this.debug = !this.debug;
    this.ui.toast(this.debug ? 'Modo debug activado' : 'Modo debug desactivado');
  }

  private buildWorld(): void {
    const rel = (p: Pt): Pt => ({ x: p.x * this.worldW, y: p.y * this.worldH });
    this.obstacles = CONFIG.nonWalkable.map((obstacle) => ({
      name: obstacle.name,
      points: obstacle.points.map(rel),
    }));
    this.fence = CONFIG.fence.map(rel);
    this.gateGapWorld = {
      start: CONFIG.gateGap.start * this.worldW,
      end: CONFIG.gateGap.end * this.worldW,
    };
    this.bananaWorld = CONFIG.traps.bananas.map(rel);
    this.puddleWorld = CONFIG.traps.puddles.map(rel);
    this.patrolUnits = CONFIG.patrols.map((p) => ({
      a: rel(p.start),
      b: rel(p.end),
      x: 0,
      y: 0,
      t: 0,
      dir: 1,
      speed: p.speed,
      hitRadius: p.hitRadius,
      protectionMs: p.protectionMs,
    }));
    for (const unit of this.patrolUnits) {
      unit.x = unit.a.x;
      unit.y = unit.a.y;
    }
    if (this.markers.length === 0) {
      this.markers = CONFIG.proposals.map((proposal) => ({ proposal, done: false }));
    }
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.resize(), 120);
    });

    window.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
        event.preventDefault();
      }
      if (key === 'd' && event.shiftKey && !event.repeat) {
        this.toggleDebug();
        return;
      }
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        this.keys.add(key);
      }
    });

    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.key.toLowerCase());
    });

    window.addEventListener('blur', () => {
      this.keys.clear();
      this.joystick = { x: 0, y: 0 };
    });

    this.canvas.addEventListener('pointerdown', (event) => {
      this.pointerStart = { x: event.clientX, y: event.clientY, t: performance.now() };
    });

    this.canvas.addEventListener('pointerup', (event) => {
      if (!this.pointerStart) return;
      const dx = event.clientX - this.pointerStart.x;
      const dy = event.clientY - this.pointerStart.y;
      const dt = performance.now() - this.pointerStart.t;
      this.pointerStart = null;
      if (dx * dx + dy * dy < 220 && dt < 700) {
        this.handleTap(event.clientX, event.clientY);
      }
    });

    this.canvas.addEventListener('pointercancel', () => {
      this.pointerStart = null;
    });

    this.ui.onJoystick((x, y) => {
      this.joystick = { x, y };
    });
  }

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.viewW = Math.max(1, rect.width);
    this.viewH = Math.max(1, rect.height);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.viewW * this.dpr);
    this.canvas.height = Math.round(this.viewH * this.dpr);
    if (this.ready) this.updateCamera(0, this.state === 'menu');
  }

  private worldToScreen(x: number, y: number): Pt {
    return {
      x: (x - this.camera.x) * this.scale + this.viewW / 2,
      y: (y - this.camera.y) * this.scale + this.viewH / 2,
    };
  }

  private screenToWorld(clientX: number, clientY: number): Pt {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - this.viewW / 2) / this.scale + this.camera.x,
      y: (clientY - rect.top - this.viewH / 2) / this.scale + this.camera.y,
    };
  }

  private get gateWorld(): Pt {
    return { x: CONFIG.gate.x * this.worldW, y: CONFIG.gate.y * this.worldH };
  }

  private handleTap(clientX: number, clientY: number): void {
    if (this.state !== 'playing' || !this.debug) return;
    const world = this.screenToWorld(clientX, clientY);
    const rx = (world.x / this.worldW).toFixed(3);
    const ry = (world.y / this.worldH).toFixed(3);
    this.ui.toast(`x: ${rx} · y: ${ry}`);
    console.log(`[Sal del colegio] x: ${rx}, y: ${ry}`);
  }

  private activate(marker: Marker): void {
    if (marker.done) return;
    marker.done = true;
    this.completed += 1;
    this.ui.updateCounter(this.completed, CONFIG.proposals.length);
    this.ui.play('pickup');
    this.state = 'paused';
    this.moving = false;
    this.joystick = { x: 0, y: 0 };
    this.keys.clear();

    this.ui.showProposal(marker.proposal, marker.proposal.id, () => {
      this.state = 'playing';
      if (this.completed >= CONFIG.proposals.length) {
        this.openGate();
      }
    });
  }

  private openGate(): void {
    if (this.gateOpen) return;
    this.gateOpen = true;
    this.gateStart = this.time;
    this.ui.play('open');
    this.spawnGateParticles();
    setTimeout(() => {
      if (this.state === 'playing') this.ui.toast('¡El portón se abrió! Corre a la salida');
    }, 500);
  }

  private spawnGateParticles(): void {
    const gate = this.gateWorld;
    const colors = ['#ffc63d', '#c1121f', '#ffffff', '#2bc46d', '#17141a'];
    for (let i = 0; i < 46; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 90 + Math.random() * 260;
      const life = 1 + Math.random() * 1.2;
      this.particles.push({
        x: gate.x + (Math.random() - 0.5) * 60,
        y: gate.y - 10 - Math.random() * 30,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 120,
        life,
        maxLife: life,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 6,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 12,
      });
    }
  }

  private warnGate(): void {
    const now = this.time;
    if (now - this.lastWarn < 2) return;
    this.lastWarn = now;
    const missing = CONFIG.proposals.length - this.completed;
    this.ui.play('error');
    this.ui.toast(
      missing === 1 ? 'Te falta 1 propuesta' : `Te faltan ${missing} propuestas`,
    );
  }

  private markerWorld(proposal: Proposal): Pt {
    return { x: proposal.pos.x * this.worldW, y: proposal.pos.y * this.worldH };
  }

  private nearGate(x: number, y: number): boolean {
    const gate = this.gateWorld;
    return Math.hypot(x - gate.x, y - gate.y) < 95;
  }

  private isBlocked(x: number, y: number): boolean {
    const r = CONFIG.playerRadius;
    if (x - r < 3 || x + r > this.worldW - 3 || y - r < 3 || y + r > this.worldH - 3) {
      return true;
    }
    for (let i = 0; i < this.fence.length - 1; i++) {
      if (distanceToSegment(x, y, this.fence[i], this.fence[i + 1]) < r + 2) {
        return true;
      }
    }
    if (!this.gateOpen) {
      const gate = this.gateWorld;
      const left = { x: this.gateGapWorld.start, y: gate.y };
      const right = { x: this.gateGapWorld.end, y: gate.y };
      if (distanceToSegment(x, y, left, right) < r + 2) return true;
    }
    for (const obstacle of this.obstacles) {
      if (
        pointInPolygon(x, y, obstacle.points) ||
        pointInPolygon(x - r, y, obstacle.points) ||
        pointInPolygon(x + r, y, obstacle.points) ||
        pointInPolygon(x, y - r, obstacle.points) ||
        pointInPolygon(x, y + r, obstacle.points) ||
        pointInPolygon(x - r * 0.7, y - r * 0.7, obstacle.points) ||
        pointInPolygon(x + r * 0.7, y - r * 0.7, obstacle.points) ||
        pointInPolygon(x - r * 0.7, y + r * 0.7, obstacle.points) ||
        pointInPolygon(x + r * 0.7, y + r * 0.7, obstacle.points)
      ) {
        return true;
      }
    }
    return false;
  }

  private attemptMove(dx: number, dy: number): void {
    const px = this.player.x;
    const py = this.player.y;
    const nx = px + dx;
    const ny = py + dy;
    if (!this.isBlocked(nx, py)) {
      this.player.x = nx;
    } else if (!this.gateOpen && this.nearGate(nx, py)) {
      this.warnGate();
    }
    if (!this.isBlocked(this.player.x, ny)) {
      this.player.y = ny;
    } else if (!this.gateOpen && this.nearGate(this.player.x, ny)) {
      this.warnGate();
    }
  }

  private updateCamera(dt: number, snap = false): void {
    const cover = Math.max(this.viewW / this.worldW, this.viewH / this.worldH);
    this.scale = cover;
    const halfW = this.viewW / (2 * this.scale);
    const halfH = this.viewH / (2 * this.scale);
    const minX = halfW;
    const maxX = this.worldW - halfW;
    const minY = halfH;
    const maxY = this.worldH - halfH;
    const targetX = minX > maxX ? this.worldW / 2 : clamp(this.player.x, minX, maxX);
    const targetY = minY > maxY ? this.worldH / 2 : clamp(this.player.y, minY, maxY);
    if (snap) {
      this.camera.x = targetX;
      this.camera.y = targetY;
    } else {
      const k = 1 - Math.exp(-8 * dt);
      this.camera.x = lerp(this.camera.x, targetX, k);
      this.camera.y = lerp(this.camera.y, targetY, k);
    }
  }

  private loop(timestamp: number): void {
    this.rafId = requestAnimationFrame((t) => this.loop(t));
    const dtRaw = (timestamp - this.lastFrame) / 1000;
    this.lastFrame = timestamp;
    const dt = clamp(dtRaw || 0.016, 0, 0.05);
    this.time = timestamp / 1000;
    this.update(dt);
    this.render();
  }

  private update(dt: number): void {
    if (this.particles.length > 0) {
      for (const p of this.particles) {
        p.life -= dt;
        p.vy += 420 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
      }
      this.particles = this.particles.filter((p) => p.life > 0);
    }

    if (this.state !== 'playing') return;

    let inputX = 0;
    let inputY = 0;

    if (Math.hypot(this.joystick.x, this.joystick.y) > 0.12) {
      inputX = this.joystick.x;
      inputY = this.joystick.y;
    } else {
      if (this.keys.has('arrowleft') || this.keys.has('a')) inputX -= 1;
      if (this.keys.has('arrowright') || this.keys.has('d')) inputX += 1;
      if (this.keys.has('arrowup') || this.keys.has('w')) inputY -= 1;
      if (this.keys.has('arrowdown') || this.keys.has('s')) inputY += 1;
    }

    const length = Math.hypot(inputX, inputY);
    let moving = false;

    const inPuddle = this.isInPuddle(this.player.x, this.player.y);
    if (inPuddle && !this.wasInPuddle && length > 0.01) {
      this.ui.toast('¡Charco! Caminas más lento');
    }
    this.wasInPuddle = inPuddle;

    if (length > 0.01) {
      inputX /= length;
      inputY /= length;
      const speed = CONFIG.speed * (inPuddle ? CONFIG.traps.puddleSlow : 1);
      const distance = speed * dt;
      const steps = Math.max(1, Math.ceil(distance / 7));
      const stepX = (inputX * distance) / steps;
      const stepY = (inputY * distance) / steps;
      for (let i = 0; i < steps; i++) {
        this.attemptMove(stepX, stepY);
      }
      if (inputX < -0.1) this.player.facing = -1;
      else if (inputX > 0.1) this.player.facing = 1;
      this.player.phase += distance * 0.085;
      moving = true;
      this.checkBananas();
    }

    if (moving) {
      for (const marker of this.markers) {
        if (marker.done) continue;
        const p = this.markerWorld(marker.proposal);
        if (Math.hypot(p.x - this.player.x, p.y - this.player.y) < CONFIG.collectRadius) {
          this.activate(marker);
          break;
        }
      }
    }

    this.updatePatrols(dt);
    if (this.state === 'playing') this.checkPatrolHit();

    if (this.state === 'playing' && this.gateOpen && this.player.y > CONFIG.exitY * this.worldH) {
      this.state = 'won';
      this.moving = false;
      this.ui.play('win');
      this.ui.showWin(CONFIG.campaign);
      return;
    }

    this.updateCamera(dt);

    this.moving = moving;
  }

  private moving = false;

  private gateProgress(): number {
    if (!this.gateOpen) return 0;
    const t = clamp((this.time - this.gateStart) / 1.05, 0, 1);
    return 1 - Math.pow(1 - t, 3);
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.viewW, this.viewH);
    ctx.fillStyle = '#7fa95f';
    ctx.fillRect(0, 0, this.viewW, this.viewH);

    if (!this.ready) {
      ctx.fillStyle = '#d9e8c8';
      ctx.font = '700 16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Cargando el colegio…', this.viewW / 2, this.viewH / 2);
      return;
    }

    ctx.save();
    ctx.translate(this.viewW / 2, this.viewH / 2);
    ctx.scale(this.scale, this.scale);
    ctx.translate(-this.camera.x, -this.camera.y);

    if (this.loadError) {
      this.drawFallbackMap(ctx);
    } else {
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(this.image, 0, 0, this.worldW, this.worldH);
    }

    this.drawGate(ctx);
    this.drawParticles(ctx);
    this.drawTraps(ctx);
    this.drawMarkers(ctx);
    this.drawExitArrow(ctx);
    this.drawPatrols(ctx);
    this.drawPlayer(ctx);

    if (this.debug) this.drawDebug(ctx);

    ctx.restore();

    this.drawOffscreenHints(ctx);

    if (this.debug) {
      ctx.fillStyle = 'rgba(23, 20, 26, 0.9)';
      roundedRect(ctx, 10, this.viewH - 42, 250, 30, 8);
      ctx.fill();
      ctx.fillStyle = '#ffc63d';
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('DEBUG · Shift+D para salir · toca para coords', 20, this.viewH - 27);
    }
  }

  private drawFallbackMap(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#8cba6b';
    ctx.fillRect(0, 0, this.worldW, this.worldH);
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 2;
    for (let x = 0; x <= this.worldW; x += 100) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.worldH);
      ctx.stroke();
    }
    for (let y = 0; y <= this.worldH; y += 100) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.worldW, y);
      ctx.stroke();
    }
  }

  private drawPatrols(ctx: CanvasRenderingContext2D): void {
    for (const unit of this.patrolUnits) this.drawPatrolUnit(ctx, unit);
  }

  private drawPatrolUnit(ctx: CanvasRenderingContext2D, unit: PatrolUnit): void {
    const depth = (0.9 + 0.28 * (unit.y / this.worldH)) * 0.7;
    const bob = Math.sin(this.time * 3.2) * 1.6;
    ctx.save();
    ctx.translate(unit.x, unit.y);
    ctx.scale(depth, depth);
    ctx.scale(unit.dir < 0 ? -1 : 1, 1);

    ctx.fillStyle = 'rgba(20, 16, 16, 0.24)';
    ctx.beginPath();
    ctx.ellipse(0, -1.5, 19, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(0, -bob);

    ctx.fillStyle = '#17141a';
    ctx.beginPath();
    ctx.ellipse(-8.5, -4.5, 5.5, 4.5, 0, 0, Math.PI * 2);
    ctx.ellipse(8.5, -4.5, 5.5, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    const body = ctx.createLinearGradient(0, -54, 0, -8);
    body.addColorStop(0, '#5ab8ff');
    body.addColorStop(1, '#1e6fd9');
    ctx.fillStyle = body;
    ctx.strokeStyle = '#0a1f5c';
    ctx.lineWidth = 2;
    roundedRect(ctx, -17, -54, 34, 46, 15);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffc63d';
    roundedRect(ctx, -13, -40, 26, 7, 3.5);
    ctx.fill();

    ctx.strokeStyle = '#0a1f5c';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(0, -54);
    ctx.lineTo(0, -64);
    ctx.stroke();
    ctx.fillStyle = '#ffc63d';
    ctx.beginPath();
    ctx.arc(0, -66, 3.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-6.5, -33, 5, 0, Math.PI * 2);
    ctx.arc(6.5, -33, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#17141a';
    ctx.beginPath();
    ctx.arc(-5, -33, 2.4, 0, Math.PI * 2);
    ctx.arc(8, -33, 2.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#0a1f5c';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, -22, 5, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();

    ctx.restore();
    ctx.restore();
  }

  private drawPlayer(ctx: CanvasRenderingContext2D): void {
    const depth = (0.9 + 0.28 * (this.player.y / this.worldH)) * 0.7;
    drawCharacter(
      ctx,
      this.player.x,
      this.player.y,
      depth,
      this.avatar,
      this.player.phase,
      this.moving,
      this.player.facing,
    );
  }

  private drawTraps(ctx: CanvasRenderingContext2D): void {
    for (const p of this.puddleWorld) {
      const r = CONFIG.traps.puddleRadius;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.fillStyle = 'rgba(58, 132, 214, 0.55)';
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(190, 226, 255, 0.8)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.ellipse(-r * 0.28, -r * 0.16, r * 0.34, r * 0.15, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const p of this.bananaWorld) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.fillStyle = 'rgba(20, 16, 16, 0.18)';
      ctx.beginPath();
      ctx.ellipse(0, 3, 20, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f2c318';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, -8, 13, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
      ctx.fillStyle = '#6b4f12';
      ctx.beginPath();
      ctx.arc(-12.6, -1.6, 2.3, 0, Math.PI * 2);
      ctx.arc(12.6, -1.6, 2.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawMarkers(ctx: CanvasRenderingContext2D): void {
    for (const marker of this.markers) {
      const p = this.markerWorld(marker.proposal);
      const t = this.time;
      const bob = Math.sin(t * 2.6 + marker.proposal.id) * 4.5;
      const pulse = 1 + Math.sin(t * 3.4 + marker.proposal.id) * 0.07;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.fillStyle = 'rgba(20, 16, 16, 0.18)';
      ctx.beginPath();
      ctx.ellipse(0, 2, 19, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.translate(0, bob);

      if (marker.done) {
        ctx.fillStyle = '#1faa55';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, -25, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3.4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(-6, -25);
        ctx.lineTo(-1.5, -20.5);
        ctx.lineTo(7, -30);
        ctx.stroke();
      } else {
        const glow = ctx.createRadialGradient(0, -25, 2, 0, -25, 32);
        glow.addColorStop(0, 'rgba(255, 198, 61, 0.55)');
        glow.addColorStop(1, 'rgba(255, 198, 61, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, -25, 32, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(0, -25);
        ctx.scale(pulse, pulse);
        starPath(ctx, 20, 9.5, 5);
        const gold = ctx.createLinearGradient(0, -20, 0, 20);
        gold.addColorStop(0, '#ffe08a');
        gold.addColorStop(1, '#f4b21f');
        ctx.fillStyle = gold;
        ctx.strokeStyle = '#7d0a12';
        ctx.lineWidth = 2.6;
        ctx.lineJoin = 'round';
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#7d0a12';
        ctx.font = '900 18px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', 0, 1.5);
        ctx.restore();
      }
      ctx.restore();
    }
  }

  private drawGate(ctx: CanvasRenderingContext2D): void {
    const opening = CONFIG.gateOpening;
    const left = opening.left * this.worldW;
    const right = opening.right * this.worldW;
    const top = opening.top * this.worldH;
    const bottom = opening.bottom * this.worldH;
    const center = (left + right) / 2;
    const middle = (top + bottom) / 2;
    const half = (right - left) / 2;
    const height = bottom - top;
    const progress = this.gateProgress();

    if (progress > 0.02) {
      const glow = ctx.createRadialGradient(center, middle, 4, center, middle, 120);
      glow.addColorStop(0, `rgba(255, 198, 61, ${0.5 * (1 - progress * 0.35)})`);
      glow.addColorStop(1, 'rgba(255, 198, 61, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.ellipse(center, middle, 130, 76, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const shrink = 1 - progress;
    if (shrink > 0.015) {
      ctx.save();
      ctx.translate(left, 0);
      ctx.scale(shrink, 1);
      this.drawGateLeaf(ctx, top, half, height);
      ctx.restore();

      ctx.save();
      ctx.translate(right, 0);
      ctx.scale(-shrink, 1);
      this.drawGateLeaf(ctx, top, half, height);
      ctx.restore();
    }

    const lockAlpha = clamp(1 - progress * 2.4, 0, 1);
    if (lockAlpha > 0.01) {
      ctx.save();
      ctx.globalAlpha = lockAlpha;
      ctx.translate(center, top + 18 + Math.sin(this.time * 2.4) * 2);
      ctx.scale(1.3, 1.3);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(0, 13, 14, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#17141a';
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.arc(0, -8, 6.5, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffc63d';
      ctx.strokeStyle = '#17141a';
      ctx.lineWidth = 2.2;
      roundedRect(ctx, -10, -8, 20, 17, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#7d0a12';
      ctx.beginPath();
      ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-0.9, 0, 1.8, 4.6);
      ctx.restore();
    }
  }

  private drawGateLeaf(
    ctx: CanvasRenderingContext2D,
    top: number,
    width: number,
    height: number,
  ): void {
    ctx.fillStyle = '#19171d';
    ctx.strokeStyle = '#3f444c';
    ctx.lineWidth = 2;
    roundedRect(ctx, 0, top, width, height, 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#6b707a';
    ctx.lineWidth = 1.6;
    for (let x = 6; x < width - 2; x += 10) {
      ctx.beginPath();
      ctx.moveTo(x, top + 3);
      ctx.lineTo(x, top + height - 3);
      ctx.stroke();
    }

    ctx.strokeStyle = '#9aa0aa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(3, top + height * 0.22);
    ctx.lineTo(width - 3, top + height * 0.22);
    ctx.moveTo(3, top + height * 0.78);
    ctx.lineTo(width - 3, top + height * 0.78);
    ctx.stroke();

    ctx.fillStyle = '#8f0d17';
    ctx.fillRect(0, top, width, 5);
    ctx.fillStyle = '#ffc63d';
    ctx.fillRect(0, top + 5, width, 1.6);

    ctx.fillStyle = '#ffc63d';
    ctx.beginPath();
    ctx.arc(width - 6, top + height / 2, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
      ctx.restore();
    }
  }

  private drawExitArrow(ctx: CanvasRenderingContext2D): void {
    if (!this.gateOpen) return;
    const center = (this.gateGapWorld.start + this.gateGapWorld.end) / 2;
    const bob = Math.sin(this.time * 3) * 5;
    const y = CONFIG.gate.y * this.worldH + 66 + bob;
    const alpha = clamp((this.time - this.gateStart) / 0.6, 0, 1);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(center, y);
    ctx.fillStyle = 'rgba(20, 16, 16, 0.18)';
    ctx.beginPath();
    ctx.ellipse(0, 22, 22, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-17, -10);
    ctx.lineTo(0, 10);
    ctx.lineTo(17, -10);
    ctx.lineTo(17, 2);
    ctx.lineTo(0, 22);
    ctx.lineTo(-17, 2);
    ctx.closePath();
    ctx.fillStyle = '#ffc63d';
    ctx.strokeStyle = '#17141a';
    ctx.lineWidth = 2.6;
    ctx.lineJoin = 'round';
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private drawOffscreenHints(ctx: CanvasRenderingContext2D): void {
    if (this.state !== 'playing') return;
    const left = 26;
    const right = this.viewW - 26;
    const top = 94;
    const bottom = this.viewH - 34;

    for (const marker of this.markers) {
      if (marker.done) continue;
      const p = this.markerWorld(marker.proposal);
      const s = this.worldToScreen(p.x, p.y - 25);
      if (s.x > left && s.x < right && s.y > top && s.y < bottom) continue;
      const x = clamp(s.x, left, right);
      const y = clamp(s.y, top, bottom);
      const angle = Math.atan2(s.y - y, s.x - x);
      const pulse = 0.86 + Math.sin(this.time * 4 + marker.proposal.id) * 0.14;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.globalAlpha = pulse;
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-7, -8.5);
      ctx.lineTo(-3, 0);
      ctx.lineTo(-7, 8.5);
      ctx.closePath();
      ctx.fillStyle = '#ffc63d';
      ctx.strokeStyle = '#17141a';
      ctx.lineWidth = 2.4;
      ctx.lineJoin = 'round';
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawDebug(ctx: CanvasRenderingContext2D): void {
    const W = this.worldW;
    const H = this.worldH;

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 8]);
    for (let i = 1; i < 10; i++) {
      ctx.beginPath();
      ctx.moveTo((i / 10) * W, 0);
      ctx.lineTo((i / 10) * W, H);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, (i / 10) * H);
      ctx.lineTo(W, (i / 10) * H);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(193, 18, 31, 0.2)';
    ctx.strokeStyle = '#ff2d3d';
    ctx.lineWidth = 3;
    for (const obstacle of this.obstacles) {
      ctx.beginPath();
      obstacle.points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.strokeStyle = '#ffb300';
    ctx.lineWidth = 4;
    ctx.beginPath();
    this.fence.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.strokeStyle = this.gateOpen ? '#43ff7c' : '#ff2d3d';
    ctx.beginPath();
    ctx.moveTo(this.gateGapWorld.start, CONFIG.gate.y * H);
    ctx.lineTo(this.gateGapWorld.end, CONFIG.gate.y * H);
    ctx.stroke();

    const gate = this.gateWorld;
    ctx.fillStyle = '#ffb300';
    ctx.beginPath();
    ctx.arc(gate.x, gate.y, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '700 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const p of this.puddleWorld) {
      ctx.fillStyle = 'rgba(58, 132, 214, 0.4)';
      ctx.strokeStyle = '#2b7fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, CONFIG.traps.puddleRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#17141a';
      ctx.lineWidth = 3;
      const label = `CHARCO ${(p.x / W).toFixed(2)}, ${(p.y / H).toFixed(2)}`;
      ctx.strokeText(label, p.x, p.y - CONFIG.traps.puddleRadius - 12);
      ctx.fillText(label, p.x, p.y - CONFIG.traps.puddleRadius - 12);
    }

    for (const p of this.bananaWorld) {
      ctx.fillStyle = 'rgba(242, 195, 24, 0.5)';
      ctx.strokeStyle = '#c99a00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, CONFIG.traps.bananaRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#17141a';
      ctx.lineWidth = 3;
      const label = `CASCARA ${(p.x / W).toFixed(2)}, ${(p.y / H).toFixed(2)}`;
      ctx.strokeText(label, p.x, p.y - CONFIG.traps.bananaRadius - 12);
      ctx.fillText(label, p.x, p.y - CONFIG.traps.bananaRadius - 12);
    }

    for (const marker of this.markers) {
      const p = this.markerWorld(marker.proposal);
      ctx.fillStyle = '#2b7fff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#17141a';
      ctx.lineWidth = 3;
      ctx.strokeText(
        `${(marker.proposal.pos.x).toFixed(2)}, ${(marker.proposal.pos.y).toFixed(2)}`,
        p.x,
        p.y - 22,
      );
      ctx.fillText(
        `${(marker.proposal.pos.x).toFixed(2)}, ${(marker.proposal.pos.y).toFixed(2)}`,
        p.x,
        p.y - 22,
      );
    }

    for (const unit of this.patrolUnits) {
      ctx.strokeStyle = '#ffb300';
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(unit.a.x, unit.a.y);
      ctx.lineTo(unit.b.x, unit.b.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(90, 184, 255, 0.5)';
      ctx.strokeStyle = '#1e6fd9';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(unit.x, unit.y, unit.hitRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = '#2b7fff';
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#17141a';
    ctx.lineWidth = 3;
    const label = `${(this.player.x / W).toFixed(2)}, ${(this.player.y / H).toFixed(2)}`;
    ctx.strokeText(label, this.player.x, this.player.y - 34);
    ctx.fillText(label, this.player.x, this.player.y - 34);

    ctx.fillStyle = '#ffb300';
    ctx.font = '900 18px system-ui, sans-serif';
    ctx.strokeStyle = '#17141a';
    ctx.lineWidth = 4;
    ctx.strokeText(`PORTÓN ${CONFIG.gate.x.toFixed(2)}, ${CONFIG.gate.y.toFixed(2)}`, gate.x, gate.y + 34);
    ctx.fillText(`PORTÓN ${CONFIG.gate.x.toFixed(2)}, ${CONFIG.gate.y.toFixed(2)}`, gate.x, gate.y + 34);
    ctx.restore();
  }

  dispose(): void {
    cancelAnimationFrame(this.rafId);
  }
}
