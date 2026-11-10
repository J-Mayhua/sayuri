export type Avatar = 'chico' | 'chica';

export interface Pt {
  x: number;
  y: number;
}

export interface Proposal {
  id: number;
  title: string;
  phrase: string;
  pos: Pt;
}

export interface Obstacle {
  name: string;
  points: Pt[];
}

const polygonCircle = (x: number, y: number, rx: number, ry: number, sides = 12): Pt[] =>
  Array.from({ length: sides }, (_, i) => {
    const a = (i / sides) * Math.PI * 2;
    return { x: x + Math.cos(a) * rx, y: y + Math.sin(a) * ry };
  });

const rectPoly = (x1: number, y1: number, x2: number, y2: number): Pt[] => [
  { x: x1, y: y1 },
  { x: x2, y: y1 },
  { x: x2, y: y2 },
  { x: x1, y: y2 },
];

export const CONFIG = {
  mapFile: 'mapa.webp',

  playerStart: { x: 0.49, y: 0.43 },
  speed: 215,
  playerRadius: 12,
  collectRadius: 52,

  proposals: <Proposal[]>[
    {
      id: 1,
      title: 'BIBLIOÚTILES',
      phrase:
        'Venta de útiles escolares a precios accesibles dentro de la institución.',
      pos: { x: 0.34, y: 0.15 },
    },
    {
      id: 2,
      title: 'VIERNES DE CELULAR',
      phrase:
        'Uso responsable del celular los viernes, con fines pedagógicos o de comunicación necesaria.',
      pos: { x: 0.7, y: 0.46 },
    },
    {
      id: 3,
      title: 'ALMUERZO CON SABOR',
      phrase:
        'Menús elegidos por los estudiantes, con platos como arroz chaufa, mostrito y otras opciones deliciosas y nutritivas.',
      pos: { x: 0.72, y: 0.55 },
    },
    {
      id: 4,
      title: 'TU VOZ, NUESTRA GESTIÓN',
      phrase:
        'Escuchar las opiniones, necesidades y sugerencias de todos los estudiantes para tomar mejores decisiones.',
      pos: { x: 0.49, y: 0.16 },
    },
    {
      id: 5,
      title: 'CUENTAS CLARAS',
      phrase:
        'Informar sobre las actividades realizadas, los ingresos y los gastos del Municipio Escolar, con transparencia.',
      pos: { x: 0.43, y: 0.7 },
    },
  ],

  gate: { x: 0.45, y: 0.848 },
  gateGap: { start: 0.405, end: 0.495 },
  gateOpening: { left: 0.397, right: 0.493, top: 0.805, bottom: 0.864 },
  exitY: 0.94,

  // Trampas fijas: posiciones en el patio abierto (coordenadas relativas 0-1)
  traps: {
    bananas: <Pt[]>[
      { x: 0.4, y: 0.38 }, // patio abierto, izquierda-centro
      { x: 0.57, y: 0.41 }, // patio abierto, derecha-centro
      { x: 0.44, y: 0.49 },
      { x: 0.34, y: 0.44 }, // franja abierta bajo el edificio verde, lejos del pasillo
    ],
    puddles: <Pt[]>[
      { x: 0.55, y: 0.5 }, // patio abierto, centro-derecha
      { x: 0.36, y: 0.5 }, // franja abierta, fuera del pasillo al portón
    ],
    bananaRadius: 30,
    puddleRadius: 46,
    puddleSlow: 0.55,
  },

  // Personajes inventados que patrullan el patio (rutas ida y vuelta).
  // Rutas en zonas abiertas, sin cruzar el punto de inicio.
  patrols: [
    {
      start: { x: 0.37, y: 0.33 }, // ruta horizontal, extremo izquierdo
      end: { x: 0.6, y: 0.33 }, // ruta horizontal, extremo derecho
      speed: 105, // ~la mitad de CONFIG.speed (215)
      hitRadius: 26,
      protectionMs: 1000,
    },
    {
      start: { x: 0.67, y: 0.5 }, // ruta vertical junto a los salones derechos
      end: { x: 0.67, y: 0.62 }, // cuida el paso lateral derecho
      speed: 95,
      hitRadius: 26,
      protectionMs: 1000,
    },
  ],

  fence: <Pt[]>[
    { x: 0.405, y: 0.848 },
    { x: 0.155, y: 0.855 },
    { x: 0.235, y: 0.515 },
    { x: 0.135, y: 0.318 },
    { x: 0.245, y: 0.075 },
    { x: 0.61, y: 0.045 },
    { x: 0.66, y: 0.065 },
    { x: 0.68, y: 0.04 },
    { x: 0.86, y: 0.04 },
    { x: 0.96, y: 0.08 },
    { x: 0.96, y: 0.27 },
    { x: 0.8, y: 0.28 },
    { x: 0.95, y: 0.79 },
    { x: 0.94, y: 0.855 },
    { x: 0.495, y: 0.848 },
  ],

  nonWalkable: <Obstacle[]>[
    { name: 'Edificio principal', points: rectPoly(0.245, 0.03, 0.665, 0.13) },
    { name: 'Ala izquierda', points: rectPoly(0.195, 0.05, 0.315, 0.215) },
    { name: 'Ala central izquierda', points: rectPoly(0.345, 0.07, 0.435, 0.245) },
    { name: 'Ala central derecha', points: rectPoly(0.545, 0.07, 0.635, 0.245) },
    { name: 'Ala derecha', points: rectPoly(0.64, 0.045, 0.745, 0.22) },
    { name: 'Complejo derecho', points: rectPoly(0.68, 0.03, 0.94, 0.265) },
    { name: 'Torre de agua', points: polygonCircle(0.782, 0.275, 0.017, 0.028) },
    { name: 'Edificio verde izquierdo', points: rectPoly(0.17, 0.265, 0.325, 0.475) },
    { name: 'Edificio derecho', points: rectPoly(0.635, 0.255, 0.775, 0.45) },
    { name: 'Salones abajo izquierda', points: rectPoly(0.235, 0.595, 0.405, 0.69) },
    { name: 'Salones abajo izquierda', points: rectPoly(0.195, 0.7, 0.36, 0.85) },
    { name: 'Salones abajo derecha', points: rectPoly(0.465, 0.595, 0.61, 0.69) },
    { name: 'Salones abajo derecha', points: rectPoly(0.475, 0.7, 0.625, 0.85) },
    { name: 'Pabellón inferior derecho', points: rectPoly(0.64, 0.655, 0.935, 0.85) },
    { name: 'Fuente', points: polygonCircle(0.49, 0.19, 0.016, 0.02) },
    { name: 'Muro de jardín', points: rectPoly(0.385, 0.275, 0.445, 0.3) },
    { name: 'Muro de jardín', points: rectPoly(0.54, 0.275, 0.58, 0.3) },
    { name: 'Árbol', points: polygonCircle(0.354, 0.141, 0.011, 0.02) },
    { name: 'Árbol', points: polygonCircle(0.62, 0.143, 0.011, 0.02) },
    { name: 'Árbol', points: polygonCircle(0.176, 0.273, 0.011, 0.02) },
    { name: 'Árbol', points: polygonCircle(0.155, 0.332, 0.011, 0.02) },
    { name: 'Árbol', points: polygonCircle(0.264, 0.473, 0.011, 0.02) },
    { name: 'Árbol', points: polygonCircle(0.23, 0.592, 0.011, 0.02) },
    { name: 'Árbol', points: polygonCircle(0.89, 0.393, 0.011, 0.02) },
    { name: 'Árbol', points: polygonCircle(0.838, 0.507, 0.011, 0.02) },
    { name: 'Árbol', points: polygonCircle(0.636, 0.755, 0.011, 0.02) },
    { name: 'Árbol', points: polygonCircle(0.386, 0.732, 0.011, 0.02) },
  ],

  campaign: {
    numeroLista: '2',
    fechaVotacion: 'Noviembre de 2027',
    institucion: 'I.E. Nuestra Señora de Cocharcas',
    shareText:
      'Jugué "Mis Propuestas" y descubrí las 5 propuestas de JUNTOS COCHARQUINOS del Municipio Escolar 2027 de la I.E. Nuestra Señora de Cocharcas. ¡Vota SAYURI!',
  },
};

export type GameConfig = typeof CONFIG;
