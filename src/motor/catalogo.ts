/**
 * Catálogo de móveis e pisos. Cada móvel = metadados (tamanho, camada) + desenho em pixel.
 * Pra adicionar coisa nova: registrarMovel('id', {...}) ou registrarPiso('id', {...}) — o motor inteiro passa a aceitar.
 * Desenhos copiados do Turmeo (office/sala.ts); a lousa usa os tokens do tema.
 */
import { BOOKS, box, disc, frame, OUT, PAPER, plant, T, tiles, WAIN_D, wood, type C2D } from '../render/base'
import { tk } from '../render/tokens'

const r = (c: C2D, col: string, x: number, y: number, w: number, h: number) => { c.fillStyle = col; c.fillRect(x, y, w, h) }
const blink = (t: number, ms: number, k = 0) => Math.floor(t / ms + k) % 2 === 0

// ---------------- pisos ----------------
export type PisoDef = { nome: string; draw: (c: C2D, x: number, y: number) => void }
export const PISOS: Record<string, { nome: string; draw: (c: C2D, x: number, y: number) => void }> = {
  madeira: { nome: 'Madeira', draw: wood },
  ceramica: { nome: 'Cerâmica', draw: tiles },
  carpete: { nome: 'Carpete', draw: (c, x, y) => { r(c, '#9aa06a', x, y, T, T); for (const [a, b] of [[3, 3], [11, 7], [6, 12]]) r(c, '#a8ae79', x + a, y + b, 1, 1) } },
  grama: { nome: 'Grama', draw: (c, x, y) => { r(c, '#6fb35a', x, y, T, T); for (const [a, b] of [[2, 3], [9, 1], [13, 8], [5, 10], [10, 13]]) { r(c, '#5a9e48', x + a, y + b, 1, 2); r(c, '#86c76e', x + a + 1, y + b, 1, 1) } } },
  areia: { nome: 'Areia', draw: (c, x, y) => { r(c, '#ecd7a4', x, y, T, T); for (const [a, b] of [[3, 2], [12, 5], [7, 9], [1, 13], [14, 14]]) r(c, '#d8c088', x + a, y + b, 1, 1) } },
  tijolo: { nome: 'Tijolinho', draw: (c, x, y) => { r(c, '#d9a58c', x, y, T, T); for (let k = 0; k < 4; k++) { const o = k % 2 ? 4 : 0; for (let b = -1; b < 2; b++) r(c, k % 3 ? '#b5654a' : '#a85a40', x + o + b * 8 + 1, y + k * 4 + 1, 7, 3) } r(c, '#d9a58c', x - 1, y, 1, T) } },
  xadrez: { nome: 'Xadrez', draw: (c, x, y) => { r(c, '#efe6d6', x, y, T, T); r(c, '#3b302c', x, y, 8, 8); r(c, '#3b302c', x + 8, y + 8, 8, 8) } },
  azulejo: { nome: 'Azulejo de piscina', draw: (c, x, y) => { r(c, '#bfe3f2', x, y, T, T); r(c, '#9fd0e6', x, y, T, 1); r(c, '#9fd0e6', x, y, 1, T); r(c, '#9fd0e6', x + 8, y, 1, T); r(c, '#9fd0e6', x, y + 8, T, 1) } },
}

export const registrarPiso = (id: string, p: PisoDef) => { PISOS[id] = p }

// ---------------- móveis ----------------
export type Tema = string
export type Kind = {
  nome: string; tema: Tema; w: number; h: number
  /** quantos tiles a arte sobe acima do pé */ up?: number
  /** chao = tapete (fica por baixo, dá pra pisar); parede = vai na parede de cima */ camada?: 'chao' | 'parede'
  /** dá pra passar por cima (ex.: cadeira solta) */ passa?: boolean
  /** mesa de trabalho: tem cadeira atrás (linha y-1) e dono */ mesa?: boolean
  draw: (c: C2D, x: number, y: number, t: number) => void
}
function rug(c: C2D, x: number, y: number, w: number, h: number, dk: string, base: string, line: string) {
  r(c, dk, x, y, w, h); r(c, base, x + 2, y + 2, w - 4, h - 4)
  r(c, line, x + 4, y + 4, w - 8, 1); r(c, line, x + 4, y + h - 5, w - 8, 1); r(c, line, x + 4, y + 4, 1, h - 8); r(c, line, x + w - 5, y + 4, 1, h - 8)
}

function lousa(c: CanvasRenderingContext2D, x: number, y: number, w: number) {
  const W = w * T
  for (const lx of [x + 9, x + W - 12]) { r(c, OUT, lx, y - 1, 3, 15); r(c, OUT, lx - 4, y + 13, 11, 2) }
  box(c, tk().marca, x + 2, y - 30, W - 4, 35); r(c, '#fbfbf8', x + 4, y - 22, W - 8, 25)
  r(c, tk().destaque, x + 5, y - 28, 14, 3)
}
export const KINDS: Record<string, Kind> = {
  // ---- Escritório (o que já existe hoje) ----
  'mesa': { nome: 'Mesa de trabalho', tema: 'Escritório', w: 2, h: 1, up: 2, draw: () => {} },
  'mesa-chefe': { nome: 'Mesa da chefia', tema: 'Escritório', w: 3, h: 1, up: 2, draw: () => {} },
  'planta': { nome: 'Planta', tema: 'Escritório', w: 1, h: 1, up: 1, draw: (c, x, y) => plant(c, x, y) },
  'mesa-reuniao': {
    nome: 'Mesa de reunião', tema: 'Escritório', w: 5, h: 4, draw: (c, x, y) => {
      const w = 5 * T, h = 4 * T
      box(c, '#c08b5c', x, y, w, h - 4); r(c, '#d6a273', x, y, w, 2)
      for (let k = 10; k < h - 6; k += 9) r(c, '#b47f52', x + 4, y + k, w - 8, 1)
      r(c, OUT, x - 1, y + h - 5, w + 2, 5); r(c, '#87583a', x, y + h - 5, w, 4)
      box(c, '#fbfbf8', x + 10, y + 12, 9, 11); r(c, '#c9b98a', x + 12, y + 15, 5, 1); r(c, '#c9b98a', x + 12, y + 18, 4, 1)
      box(c, '#c9ced8', x + 34, y + 20, 14, 9); r(c, '#9aa3b5', x + 35, y + 27, 12, 1)
      box(c, '#fbfbf8', x + 60, y + 14, 4, 4); r(c, '#6e4529', x + 61, y + 15, 2, 2)
      box(c, '#FBC222', x + 22, y + 38, 4, 4)
    },
  },
  'cadeira-reuniao': { nome: 'Cadeira solta', tema: 'Escritório', w: 1, h: 1, passa: true, draw: (c, x, y) => { box(c, '#4a4048', x + 4, y + 5, 8, 8); r(c, '#605560', x + 4, y + 5, 8, 2) } },
  'sofa': {
    nome: 'Sofá', tema: 'Escritório', w: 4, h: 1, draw: (c, x, y) => {
      const w = 4 * T
      box(c, '#b4513d', x, y, w, 15); r(c, '#c9604a', x + 3, y + 1, w - 6, 5)
      for (let k = 0; k < 3; k++) { r(c, '#e08a6e', x + 4 + k * 19, y + 7, 18, 6); r(c, '#ec9f84', x + 4 + k * 19, y + 7, 18, 1) }
      r(c, '#9c4433', x, y + 13, w, 2); box(c, '#FBC222', x + 6, y + 3, 6, 5); box(c, '#f1e6d2', x + w - 12, y + 3, 6, 5)
    },
  },
  'balcao': {
    nome: 'Balcão da copa', tema: 'Escritório', w: 3, h: 1, up: 1, draw: (c, x, y) => {
      const w = 3 * T
      box(c, '#a8774c', x, y + 3, w, 13)
      r(c, '#ece5d8', x - 1, y, w + 2, 5); r(c, OUT, x - 1, y - 1, w + 2, 1); r(c, '#d9cbb3', x - 1, y + 4, w + 2, 1)
      for (let k = 1; k < 3; k++) r(c, WAIN_D, x + k * T, y + 5, 1, 11)
      box(c, '#2d2d33', x + 4, y - 7, 8, 9); r(c, '#e05a47', x + 9, y - 5, 1, 1); r(c, '#555', x + 6, y - 1, 4, 2)
      box(c, '#fbfbf8', x + T + 3, y - 2, 3, 3); box(c, '#fbfbf8', x + T + 8, y - 2, 3, 3)
      box(c, '#f1e6d2', x + 2 * T + 2, y - 1, 11, 3); r(c, '#e0b04a', x + 2 * T + 3, y - 3, 3, 2); r(c, '#d9694a', x + 2 * T + 7, y - 3, 3, 2)
    },
  },
  'estante': {
    nome: 'Estante de livros', tema: 'Escritório', w: 3, h: 1, up: 2, draw: (c, x, y) => {
      const w = 3 * T, y0 = y - 13
      box(c, '#8a5a36', x, y0, w, 29); r(c, '#a8774c', x, y0, w, 2)
      for (let s = 0; s < 3; s++) {
        const sy = y0 + 3 + s * 8
        r(c, '#5e3f2a', x + 2, sy, w - 4, 6)
        let bx = x + 3
        for (let k = 0; bx < x + w - 5; k++) {
          const bw = 2 + ((k + s) % 3 === 0 ? 1 : 0), bh = 5 - ((k * 3 + s) % 2)
          if ((k + s * 2) % 7 === 5) { bx += 3; continue }
          r(c, BOOKS[(k * 3 + s * 2) % BOOKS.length], bx, sy + 6 - bh, bw, bh); bx += bw + 1
        }
      }
      box(c, '#c0643b', x + 5, y0 - 4, 4, 3); r(c, '#3f9a62', x + 4, y0 - 8, 6, 4)
      box(c, '#FBC222', x + w - 10, y0 - 5, 4, 4)
    },
  },
  'bebedouro': { nome: 'Bebedouro', tema: 'Escritório', w: 1, h: 1, up: 1, draw: (c, x, y) => { box(c, '#e6e8ee', x + 4, y - 4, 8, 19); r(c, '#c8ccd3', x + 4, y + 8, 8, 1); r(c, '#3a6fd8', x + 6, y + 1, 2, 2); r(c, '#e05a47', x + 9, y + 1, 1, 2); box(c, '#8ecbf5', x + 5, y - 13, 6, 8); r(c, '#bfe3f2', x + 6, y - 12, 2, 5) } },
  'arquivo': { nome: 'Arquivo', tema: 'Escritório', w: 1, h: 1, up: 1, draw: (c, x, y) => { box(c, '#9aa1ad', x + 2, y - 6, 12, 21); for (let k = 0; k < 3; k++) { r(c, '#7d8490', x + 2, y - 6 + k * 7 + 6, 12, 1); r(c, OUT, x + 6, y - 3 + k * 7, 4, 1) } } },
  'impressora': { nome: 'Impressora', tema: 'Escritório', w: 1, h: 1, up: 1, draw: (c, x, y) => { box(c, '#8a5a36', x + 1, y + 3, 14, 12); box(c, '#e6e8ee', x + 2, y - 5, 12, 8); r(c, '#2d2d33', x + 4, y - 1, 8, 1); r(c, '#fbfbf8', x + 5, y - 8, 6, 3); r(c, '#3fa66b', x + 12, y - 4, 1, 1) } },
  'tapete-reuniao': { nome: 'Tapete grande', tema: 'Escritório', w: 8, h: 7, camada: 'chao', draw: (c, x, y) => { rug(c, x + 10, y - 2, 8 * T - 4, 7 * T - 8, '#7f8655', '#9aa06a', '#c9b98a') } },
  'tapete-chefe': { nome: 'Tapete vinho', tema: 'Escritório', w: 5, h: 4, camada: 'chao', draw: (c, x, y) => { rug(c, x + 6, y + 10, 4 * T + 4, 3 * T + 2, '#5a1f2c', '#7a2e3a', '#FBC222') } },
  'janela': {
    nome: 'Janela', tema: 'Escritório', w: 2, h: 1, camada: 'parede', draw: (c, x) => {
      const x0 = x + 2, y0 = 6, w = 2 * T - 4, h = 17
      box(c, '#f7f1e6', x0, y0, w, h); r(c, '#bfe3f2', x0 + 2, y0 + 2, w - 4, h - 4); r(c, '#a6d6ec', x0 + 2, y0 + 9, w - 4, h - 11)
      r(c, '#e3f4fb', x0 + 4, y0 + 4, 2, 2); r(c, '#f7f1e6', x0 + w / 2 - 1, y0, 2, h); r(c, '#f7f1e6', x0, y0 + 8, w, 1)
      r(c, OUT, x0 - 2, y0 + h + 1, w + 4, 3); r(c, '#efe3cf', x0 - 1, y0 + h + 1, w + 2, 2)
    },
  },
  'quadro-branco': {
    nome: 'Quadro branco', tema: 'Escritório', w: 3, h: 1, camada: 'parede', draw: (c, x) => {
      const y0 = 7, w = 3 * T, h = 21
      box(c, '#c8ccd3', x, y0, w, h); r(c, '#fbfbf8', x + 1, y0 + 1, w - 2, h - 2)
      r(c, '#e05a47', x + 4, y0 + 4, 12, 1); r(c, '#5b6e8f', x + 20, y0 + 4, 10, 1); r(c, '#7a8b3a', x + 20, y0 + 7, 6, 1)
      box(c, '#FBC222', x + w - 13, y0 + 2, 5, 5); box(c, '#f59ab5', x + w - 7, y0 + 3, 4, 4)
      r(c, OUT, x + 4, y0 + h + 1, w - 8, 2); r(c, '#9aa1ad', x + 5, y0 + h + 1, w - 10, 1)
    },
  },
  // sala de vendas: os números de verdade são desenhados por cima no jogo (Game.tsx)
  'painel-quartos': { nome: 'Painel de quartos', tema: 'Escritório', w: 5, h: 1, up: 2, draw: (c, x, y) => {
    lousa(c, x, y, 5)
    for (let k = 0; k < 3; k++) { r(c, ['#2440FF', '#FF7A1A', '#2E9E6A'][k], x + 7, y - 19 + k * 7, 3, 3); r(c, '#c8ccd3', x + 12, y - 18 + k * 7, 14, 1); for (let j = 0; j < 5; j++) r(c, '#efe3cf', x + 31 + j * 9, y - 20 + k * 7, 7, 5) }
  } },
  'painel-placar': { nome: 'Painel do placar', tema: 'Escritório', w: 4, h: 1, up: 2, draw: (c, x, y) => {
    lousa(c, x, y, 4)
    for (let k = 0; k < 3; k++) { disc(c, x + 9, y - 16 + k * 7, 2, ['#E8B400', '#9AA3B5', '#C98A4B'][k]); r(c, '#c8ccd3', x + 14, y - 17 + k * 7, 22, 1); r(c, '#efe3cf', x + 44, y - 19 + k * 7, 12, 5) }
  } },
  'quadro-paisagem': { nome: 'Quadro paisagem', tema: 'Escritório', w: 2, h: 1, camada: 'parede', draw: (c, x) => { frame(c, x + 5, 9, 22, 13); r(c, '#f3c98b', x + 6, 10, 20, 6); disc(c, x + 20, 13, 2, '#fbe3a0'); r(c, '#8a9a5b', x + 6, 16, 20, 5); r(c, '#7a8b3a', x + 6, 18, 9, 3) } },
  'cartaz': { nome: 'Cartaz amarelo', tema: 'Escritório', w: 1, h: 1, camada: 'parede', draw: (c, x) => { frame(c, x + 3, 8, 11, 15); r(c, '#FBC222', x + 4, 9, 9, 13); disc(c, x + 8, 14, 2, '#fbfbf8'); r(c, '#3b302c', x + 5, 19, 7, 1) } },
  'foto-piscina': { nome: 'Foto da piscina', tema: 'Escritório', w: 2, h: 1, camada: 'parede', draw: (c, x) => { frame(c, x + 6, 10, 19, 12); r(c, '#7cc4d8', x + 7, 15, 17, 6); r(c, '#e3f4fb', x + 9, 17, 4, 1); r(c, '#8a9a5b', x + 7, 11, 17, 4) } },
  'relogio': { nome: 'Relógio', tema: 'Escritório', w: 1, h: 1, camada: 'parede', draw: (c, x, _y, t) => { const cx = x + 8; disc(c, cx, 13, 6, OUT); disc(c, cx, 13, 5, '#fbfbf8'); r(c, OUT, cx, 9, 1, 5); r(c, OUT, cx, 13, 3, 1); r(c, '#e05a47', cx + Math.round(Math.cos(t / 1000) * 3), 13 + Math.round(Math.sin(t / 1000) * 3), 1, 1) } },
  'calendario': { nome: 'Calendário', tema: 'Escritório', w: 1, h: 1, camada: 'parede', draw: (c, x) => { box(c, '#fbfbf8', x + 4, 10, 8, 10); r(c, '#d9694a', x + 4, 10, 8, 3); for (let k = 0; k < 6; k++) r(c, '#c9b98a', x + 5 + (k % 3) * 2, 14 + Math.floor(k / 3) * 3, 1, 1) } },
  'tv': { nome: 'TV de reunião', tema: 'Escritório', w: 2, h: 1, camada: 'parede', draw: (c, x) => { box(c, '#2b2a33', x + 1, 7, 30, 17); r(c, '#3a3944', x + 2, 8, 28, 15); for (const [k, h, col] of [[0, 5, '#7a8b3a'], [1, 9, '#e0b04a'], [2, 7, '#7a8b3a'], [3, 11, '#FBC222']] as const) r(c, col, x + 7 + k * 5, 21 - h, 3, h); r(c, OUT, x + 14, 25, 4, 2) } },
  'arte': { nome: 'Quadro colorido', tema: 'Escritório', w: 2, h: 1, camada: 'parede', draw: (c, x) => { frame(c, x + 5, 8, 18, 15); disc(c, x + 11, 14, 4, '#d9694a'); r(c, '#f4a259', x + 14, 15, 7, 6); r(c, '#5b6e8f', x + 7, 19, 6, 2) } },

  // ---- Resort ----
  'guarda-sol': {
    nome: 'Guarda-sol', tema: 'Resort', w: 1, h: 1, up: 2, draw: (c, x, y) => {
      const cx = x + 8
      r(c, OUT, cx - 4, y + 11, 9, 4); r(c, '#9aa0a6', cx - 3, y + 12, 7, 2); r(c, OUT, cx - 1, y - 16, 2, 28)
      for (let k = 0; k < 8; k++) { const hw = 3 + k * 2; r(c, OUT, cx - hw - 1, y - 26 + k, 2 * hw + 2, 1) }
      for (let k = 0; k < 7; k++) { const hw = 3 + k * 2; for (let px = cx - hw; px < cx + hw; px++) r(c, Math.floor((px - cx + 40) / 4) % 2 ? '#e05a47' : '#fbfbf8', px, y - 25 + k, 1, 1) }
      r(c, OUT, cx - 17, y - 18, 34, 1)
    },
  },
  'espreguicadeira': { nome: 'Espreguiçadeira', tema: 'Resort', w: 2, h: 1, draw: (c, x, y) => { box(c, '#f7f1e6', x + 2, y + 5, 28, 6); for (let k = 0; k < 6; k++) r(c, k % 2 ? '#3a6fd8' : '#8ecbf5', x + 10 + k * 3, y + 6, 3, 4); box(c, '#f7f1e6', x + 2, y - 3, 8, 9); r(c, '#8ecbf5', x + 3, y - 2, 6, 6); r(c, OUT, x + 3, y + 12, 2, 3); r(c, OUT, x + 27, y + 12, 2, 3) } },
  'coqueiro': {
    nome: 'Coqueiro', tema: 'Resort', w: 1, h: 1, up: 2, draw: (c, x, y, t) => {
      for (let k = 0; k < 9; k++) { const dx = Math.round(Math.sin(k / 3) * 2); r(c, OUT, x + 5 + dx, y + 12 - k * 3, 5, 4); r(c, k % 2 ? '#a8774c' : '#8a5a36', x + 6 + dx, y + 13 - k * 3, 3, 2) }
      const sw = Math.round(Math.sin(t / 900)), cx = x + 9, cy = y - 15
      for (const [dx, dy, len] of [[-1, 0, 12], [1, 0, 12], [-1, 1, 9], [1, 1, 9], [0, -1, 5]] as const) for (let k = 0; k < len; k++) { const px = cx + dx * k + (dx ? 0 : sw), py = cy + dy * k + Math.floor(k * k / 18) + (dx ? sw * (k > 6 ? 1 : 0) : 0); r(c, OUT, px - 1, py - 1, 3, 3); r(c, k % 3 ? '#3f9a62' : '#2f7a4f', px, py, 2, 1) }
      disc(c, cx - 2, cy + 2, 2, '#6e4529'); disc(c, cx + 2, cy + 3, 2, '#5e3f2a')
    },
  },
  'piscininha': { nome: 'Piscininha', tema: 'Resort', w: 3, h: 2, draw: (c, x, y, t) => { box(c, '#fbfbf8', x + 1, y + 1, 3 * T - 2, 2 * T - 2); r(c, '#5fb9e0', x + 3, y + 3, 3 * T - 6, 2 * T - 6); for (let k = 0; k < 4; k++) r(c, '#9fd8f5', x + 4 + ((Math.floor(t / 90) + k * 11) % (3 * T - 12)), y + 6 + k * 6, 5, 1); r(c, '#c8ccd3', x + 3 * T - 8, y - 2, 2, 8); r(c, '#c8ccd3', x + 3 * T - 4, y - 2, 2, 8) } },
  'cooler': { nome: 'Caixa térmica', tema: 'Resort', w: 1, h: 1, draw: (c, x, y) => { box(c, '#3a6fd8', x + 2, y + 4, 12, 10); box(c, '#fbfbf8', x + 1, y + 1, 14, 4); r(c, OUT, x + 6, y - 1, 4, 2) } },

  // ---- Casa de Campo ----
  'fogao-lenha': {
    nome: 'Fogão a lenha', tema: 'Casa de Campo', w: 2, h: 1, up: 2, draw: (c, x, y, t) => {
      box(c, '#f1e6d2', x + 1, y - 6, 30, 21); r(c, '#2d2d33', x + 1, y - 6, 30, 4); r(c, '#45454e', x + 4, y - 5, 6, 1); r(c, '#45454e', x + 14, y - 5, 6, 1)
      box(c, '#3b302c', x + 4, y + 2, 11, 9); r(c, blink(t, 180) ? '#f39c35' : '#FBC222', x + 6, y + 6, 7, 4); r(c, '#e05a47', x + 8, y + 8, 3, 2)
      box(c, '#a8774c', x + 18, y + 2, 10, 9)
      r(c, OUT, x + 24, y - 24, 5, 18); r(c, '#45454e', x + 25, y - 24, 3, 18)
      for (let k = 0; k < 3; k++) { const p = ((t / 1500) + k / 3) % 1; r(c, `rgba(220,220,220,${0.8 - p * 0.8})`, x + 25 + Math.round(Math.sin(p * 6) * 2), y - 26 - p * 10, 2, 2) }
    },
  },
  'rede': {
    nome: 'Rede de descanso', tema: 'Casa de Campo', w: 3, h: 1, up: 1, draw: (c, x, y, t) => {
      r(c, OUT, x + 1, y - 10, 4, 25); r(c, '#8a5a36', x + 2, y - 9, 2, 23); r(c, OUT, x + 3 * T - 5, y - 10, 4, 25); r(c, '#8a5a36', x + 3 * T - 4, y - 9, 2, 23)
      const n = 3 * T - 12, sw = Math.sin(t / 700)
      for (let i = 0; i < n; i++) { const sag = Math.round(Math.sin(i / n * Math.PI) * (6 + sw)); r(c, OUT, x + 6 + i, y - 8 + sag, 1, 6); r(c, ['#e05a47', '#FBC222', '#3fa66b', '#3a6fd8'][Math.floor(i / 5) % 4], x + 6 + i, y - 7 + sag, 1, 4) }
    },
  },
  'banco-madeira': { nome: 'Banco de madeira', tema: 'Casa de Campo', w: 2, h: 1, draw: (c, x, y) => { box(c, '#8a5a36', x + 2, y - 4, 28, 4); box(c, '#a8774c', x + 2, y + 3, 28, 5); r(c, '#bd8c5f', x + 2, y + 3, 28, 1); r(c, OUT, x + 4, y + 9, 2, 6); r(c, OUT, x + 26, y + 9, 2, 6); r(c, OUT, x + 4, y, 2, 3); r(c, OUT, x + 26, y, 2, 3) } },
  'lampiao': { nome: 'Lampião', tema: 'Casa de Campo', w: 1, h: 1, up: 2, draw: (c, x, y, t) => { r(c, OUT, x + 7, y - 12, 2, 26); r(c, OUT, x + 4, y + 12, 8, 3); box(c, '#3b302c', x + 4, y - 21, 8, 10); r(c, blink(t, 260) ? '#FBC222' : '#ffd965', x + 5, y - 19, 6, 6); r(c, OUT, x + 6, y - 24, 4, 2) } },
  'cesto-lenha': { nome: 'Cesto de lenha', tema: 'Casa de Campo', w: 1, h: 1, draw: (c, x, y) => { for (const [a, b] of [[4, 2], [8, 1], [6, -1]]) { disc(c, x + a, y + b + 4, 2, OUT); disc(c, x + a, y + b + 4, 1, '#c49a6c') } box(c, '#c49a6c', x + 2, y + 6, 12, 8); for (let k = 0; k < 3; k++) r(c, '#a8774c', x + 2, y + 8 + k * 2, 12, 1) } },

  // ---- Natal ----
  'arvore-natal': {
    nome: 'Árvore de Natal', tema: 'Natal', w: 2, h: 1, up: 2, draw: (c, x, y, t) => {
      const cx = x + 16
      r(c, OUT, cx - 3, y + 6, 6, 8); r(c, '#6e4529', cx - 2, y + 6, 4, 7); box(c, '#e05a47', cx - 5, y + 11, 10, 4)
      for (const [ty0, a, b] of [[y - 28, 1, 7], [y - 19, 3, 10], [y - 9, 5, 13]] as const) for (let k = 0; k <= 10; k++) { const hw = Math.round(a + (b - a) * k / 10); r(c, OUT, cx - hw - 1, ty0 + k, 2 * hw + 2, 1); r(c, k > 8 ? '#2f7a4f' : '#3f9a62', cx - hw, ty0 + k, 2 * hw, 1) }
      ;[[cx - 3, y - 20], [cx + 4, y - 14], [cx - 6, y - 9], [cx + 2, y - 4], [cx - 9, y - 1], [cx + 8, y - 1], [cx, y - 23]].forEach(([a, b], k) => r(c, ['#FBC222', '#e05a47', '#5ff2ff', '#f9b3cc'][(Math.floor(t / 400) + k) % 4], a, b, 2, 2))
      r(c, '#FBC222', cx - 1, y - 33, 2, 6); r(c, '#FBC222', cx - 3, y - 31, 6, 2)
    },
  },
  'presentes': { nome: 'Presentes', tema: 'Natal', w: 1, h: 1, draw: (c, x, y) => { box(c, '#e05a47', x + 1, y + 5, 8, 9); r(c, '#FBC222', x + 4, y + 5, 2, 9); box(c, '#3fa66b', x + 9, y + 8, 6, 6); r(c, '#e05a47', x + 11, y + 8, 2, 6); box(c, '#3a6fd8', x + 4, y, 6, 5); r(c, '#fbfbf8', x + 6, y, 2, 5) } },
  'boneco-neve': { nome: 'Boneco de neve', tema: 'Natal', w: 1, h: 1, up: 1, draw: (c, x, y) => { disc(c, x + 8, y + 8, 7, OUT); disc(c, x + 8, y + 8, 6, '#fbfbf8'); disc(c, x + 8, y - 3, 5, OUT); disc(c, x + 8, y - 3, 4, '#fbfbf8'); r(c, '#e05a47', x + 3, y + 1, 10, 2); r(c, OUT, x + 6, y - 5, 1, 1); r(c, OUT, x + 9, y - 5, 1, 1); r(c, '#f39c35', x + 8, y - 3, 3, 1); r(c, OUT, x + 4, y - 9, 8, 2); r(c, OUT, x + 5, y - 14, 6, 5) } },
  'guirlanda': { nome: 'Guirlanda', tema: 'Natal', w: 1, h: 1, camada: 'parede', draw: (c, x) => { disc(c, x + 8, 15, 7, OUT); disc(c, x + 8, 15, 6, '#3f9a62'); disc(c, x + 8, 15, 3, OUT); disc(c, x + 8, 15, 2, PAPER); r(c, '#e05a47', x + 5, 20, 6, 3); r(c, '#e05a47', x + 3, 19, 3, 2); r(c, '#e05a47', x + 10, 19, 3, 2) } },

  // ---- Gamer ----
  'fliperama': { nome: 'Fliperama', tema: 'Gamer', w: 1, h: 1, up: 2, draw: (c, x, y, t) => { box(c, '#2d2d33', x + 2, y - 14, 12, 29); r(c, '#e8508a', x + 2, y - 14, 12, 3); r(c, ['#5ff2ff', '#FBC222', '#8e5bd6', '#3fa66b'][Math.floor(t / 300) % 4], x + 4, y - 9, 8, 7); r(c, '#fbfbf8', x + 5 + (Math.floor(t / 150) % 6), y - 6, 1, 1); r(c, '#45454e', x + 2, y, 12, 3); r(c, '#e05a47', x + 5, y - 1, 2, 2); r(c, '#3a6fd8', x + 9, y, 2, 1) } },
  'pufe': { nome: 'Pufe', tema: 'Gamer', w: 1, h: 1, draw: (c, x, y) => { disc(c, x + 8, y + 9, 7, OUT); disc(c, x + 8, y + 9, 6, '#8e5bd6'); disc(c, x + 6, y + 7, 2, '#a97be6') } },
  'neon': { nome: 'Letreiro neon', tema: 'Gamer', w: 2, h: 1, camada: 'parede', draw: (c, x, _y, t) => { box(c, '#17171c', x + 3, 8, 26, 14); const on = !(Math.floor(t / 120) % 23 === 0), col = on ? '#5ff2ff' : '#2a6a70'; for (const ox of [7, 18]) { r(c, col, ox + x, 11, 6, 1); r(c, col, ox + x, 11, 1, 8); r(c, col, ox + x, 18, 6, 1); r(c, col, ox + x + 5, 15, 1, 4); r(c, col, ox + x + 3, 15, 3, 1) } r(c, on ? '#e8508a' : '#5a2a3e', x + 3, 21, 26, 1) } },
  'tapete-gamer': { nome: 'Tapete gamer', tema: 'Gamer', w: 3, h: 2, camada: 'chao', draw: (c, x, y) => { rug(c, x + 2, y + 2, 3 * T - 4, 2 * T - 4, '#17171c', '#26262e', '#5ff2ff'); r(c, '#e8508a', x + 8, y + 8, 3 * T - 16, 1) } },

  // ---- Café ----
  'espresso': { nome: 'Máquina de espresso', tema: 'Café', w: 1, h: 1, up: 2, draw: (c, x, y, t) => { box(c, '#a8774c', x + 1, y + 2, 14, 13); r(c, '#ece5d8', x, y, 16, 3); box(c, '#c9ced8', x + 3, y - 10, 10, 10); r(c, '#2d2d33', x + 5, y - 3, 6, 2); box(c, '#fbfbf8', x + 6, y - 1, 3, 2); for (let k = 0; k < 3; k++) { const p = ((t / 1400) + k / 3) % 1; r(c, `rgba(255,255,255,${0.9 - p})`, x + 7 + Math.round(Math.sin(p * 7 + k)), y - 3 - p * 9, 1, 1) } } },
  'bistro': { nome: 'Mesinha bistrô', tema: 'Café', w: 2, h: 1, up: 1, draw: (c, x, y) => { box(c, '#3b302c', x + 1, y - 2, 6, 7); r(c, '#3b302c', x + 2, y + 5, 1, 9); r(c, '#3b302c', x + 5, y + 5, 1, 9); box(c, '#3b302c', x + 25, y - 2, 6, 7); r(c, '#3b302c', x + 26, y + 5, 1, 9); r(c, '#3b302c', x + 29, y + 5, 1, 9); r(c, OUT, x + 15, y + 5, 2, 9); r(c, OUT, x + 11, y + 13, 10, 2); disc(c, x + 16, y + 3, 7, OUT); disc(c, x + 16, y + 3, 6, '#fbfbf8'); box(c, '#fbfbf8', x + 13, y - 1, 3, 3); r(c, '#6e4529', x + 14, y - 1, 1, 1) } },
  'vitrine-doces': { nome: 'Vitrine de doces', tema: 'Café', w: 2, h: 1, up: 1, draw: (c, x, y) => { box(c, '#8a5a36', x + 1, y + 4, 30, 11); box(c, '#d8eef6', x + 1, y - 7, 30, 11); r(c, '#fbfbf8', x + 3, y - 6, 2, 9); disc(c, x + 10, y, 3, '#f9b3cc'); r(c, '#e05a47', x + 10, y - 4, 1, 1); r(c, '#6e4529', x + 16, y - 2, 6, 4); r(c, '#f1e6d2', x + 16, y - 3, 6, 1); disc(c, x + 26, y + 1, 2, '#FBC222') } },
  'menu-giz': { nome: 'Lousa de cardápio', tema: 'Café', w: 2, h: 1, camada: 'parede', draw: (c, x) => { box(c, '#8a5a36', x + 3, 7, 26, 17); r(c, '#2f3a33', x + 4, 8, 24, 15); for (let k = 0; k < 4; k++) { r(c, '#e9ebf0', x + 7, 11 + k * 3, 10 - (k % 2) * 3, 1); r(c, '#FBC222', x + 22, 11 + k * 3, 3, 1) } } },

  // ---- Jardim ----
  'canteiro': { nome: 'Canteiro de flores', tema: 'Jardim', w: 2, h: 1, up: 1, draw: (c, x, y, t) => { box(c, '#8a5a36', x + 1, y + 5, 30, 10); r(c, '#6e4529', x + 2, y + 6, 28, 3); for (let k = 0; k < 6; k++) { const fx = x + 4 + k * 5, sw = Math.round(Math.sin(t / 700 + k)); r(c, '#3f9a62', fx + 1, y - 1, 1, 7); r(c, ['#f28cb1', '#FBC222', '#fbfbf8', '#e05a47'][k % 4], fx + sw, y - 3, 3, 3); r(c, '#f39c35', fx + 1 + sw, y - 2, 1, 1) } } },
  'fonte': {
    nome: 'Fonte', tema: 'Jardim', w: 2, h: 2, up: 1, draw: (c, x, y, t) => {
      box(c, '#c8ccd3', x + 2, y + 4, 28, 26); r(c, '#7cc4d8', x + 4, y + 6, 24, 22)
      for (let k = 0; k < 3; k++) r(c, '#bfe8f5', x + 5 + ((Math.floor(t / 110) + k * 7) % 18), y + 10 + k * 6, 4, 1)
      box(c, '#b5bac2', x + 14, y - 6, 4, 18); box(c, '#c8ccd3', x + 10, y - 9, 12, 3)
      for (let k = 0; k < 4; k++) { const p = ((t / 900) + k / 4) % 1; r(c, '#9fd8f5', x + 10 + (k % 2) * 11, y - 8 + p * 14, 1, 2) }
    },
  },
  'banco-praca': { nome: 'Banco de praça', tema: 'Jardim', w: 2, h: 1, draw: (c, x, y) => { for (let k = 0; k < 2; k++) box(c, '#2f7a4f', x + 2, y - 5 + k * 3, 28, 2); box(c, '#3f9a62', x + 2, y + 4, 28, 4); r(c, OUT, x + 3, y - 5, 2, 20); r(c, OUT, x + 27, y - 5, 2, 20) } },
  'cerca-viva': { nome: 'Cerca viva', tema: 'Jardim', w: 1, h: 1, up: 1, draw: (c, x, y) => { box(c, '#2f7a4f', x, y - 6, 16, 21); for (const [a, b] of [[2, -4], [9, -2], [4, 3], [11, 6], [6, 10]]) r(c, '#3f9a62', x + a, y + b, 4, 3) } },
}


KINDS['mesa'].mesa = true
KINDS['mesa-chefe'].mesa = true
export const TEMAS: string[] = []
const temas = () => { TEMAS.length = 0; for (const k of Object.values(KINDS)) if (!TEMAS.includes(k.tema)) TEMAS.push(k.tema) }
temas()
export function registrarMovel(id: string, k: Kind) { KINDS[id] = k; temas() }
export const isDesk = (k: string) => !!KINDS[k]?.mesa
