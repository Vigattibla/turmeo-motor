/**
 * Desenho de uma sala em qualquer tamanho (no Turmeo: office/sala.ts renderStatic/renderRoom + Game.tsx).
 * Coordenada local da sala, em pixel. Fundo fica em cache por objeto Sala (o documento é imutável:
 * sala nova = objeto novo = cache novo).
 */
import { isDesk, PISOS } from '../motor/catalogo'
import { bbox, deskFrom, deskSides, kd } from '../motor/sala'
import { CHEFE, type Obj, type Pessoa, type Sala, type Setor } from '../motor/tipos'
import { BASE, OUT, PAPER, rect as r, SHADOW, T, upperWall, WAIN, WAIN_HI, WALL, WALL_HI, wallFace, type C2D } from './base'
import { drawDesk } from './mesa'
import { drawChair } from './props'
import { desenharPorta, vidro, type Marca } from './portas'

export function criarCanvas(w: number, h: number): HTMLCanvasElement {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h
  return cv
}

/* ---------- fundo estático: piso, paredes, divisórias, luz, tapetes, sombras ---------- */
function paredes(c: C2D, s: Sala) {
  const W = s.w, H = s.h
  for (let ty = 2; ty < H - 1; ty++) for (let tx = 1; tx < W - 1; tx++) kdPiso(s.piso[ty][tx]).draw(c, tx * T, ty * T)
  for (let tx = 1; tx < W - 1; tx++) { upperWall(c, tx * T, 0); wallFace(c, tx * T, T) }
  for (let ty = 0; ty < H; ty++) { r(c, WALL, 0, ty * T, T, T); r(c, WALL_HI, T - 2, ty * T, 2, T); r(c, WALL, (W - 1) * T, ty * T, T, T); r(c, WALL_HI, (W - 1) * T, ty * T, 2, T) }
  for (let tx = 1; tx < W - 1; tx++) { r(c, WALL, tx * T, (H - 1) * T, T, T); r(c, WALL_HI, tx * T, (H - 1) * T, T, 2) }
  r(c, SHADOW, T, 2 * T, (W - 2) * T, 3); r(c, SHADOW, T, 2 * T, 3, (H - 3) * T)
  const wl = (x: number, y: number) => x <= 0 || x >= W - 1 || (s.div[y]?.[x] ?? false)
  for (let ty = 2; ty < H - 1; ty++) for (let tx = 1; tx < W - 1; tx++) {
    if (!s.div[ty]?.[tx]) continue
    const x = tx * T, y = ty * T
    if (wl(tx - 1, ty) || wl(tx + 1, ty)) {
      r(c, WALL, x, y, T, 3); r(c, WALL_HI, x, y + 3, T, 1); r(c, PAPER, x, y + 4, T, 5)
      r(c, WAIN, x, y + 9, T, 5); r(c, WAIN_HI, x, y + 9, T, 1); r(c, BASE, x, y + 14, T, 2)
      if (!s.div[ty + 1]?.[tx]) r(c, SHADOW, x, y + T, T, 3)
    } else {
      r(c, OUT, x + 5, y, 6, T); r(c, '#6e5446', x + 6, y, 4, T); r(c, '#8a6c5a', x + 6, y, 1, T)
      if (!s.div[ty - 1]?.[tx]) r(c, '#9c7d69', x + 6, y, 4, 2)
      r(c, 'rgba(70,40,20,.16)', x + 11, y, 3, T)
    }
  }
}
const kdPiso = (k: string) => PISOS[k] ?? PISOS.madeira

/* ---------- sala sem setor: caixas, móveis cobertos, escada e tinta ---------- */
function caixa(c: C2D, x: number, y: number, w: number, h: number) {
  r(c, OUT, x - 1, y - 1, w + 2, h + 2); r(c, '#c4925a', x, y, w, h); r(c, '#d9aa72', x, y, w, 4)
  r(c, '#a8784a', x, y + 4, w, 1); r(c, '#efdcae', x + (w >> 1) - 1, y, 3, 5)
}
function coberto(c: C2D, x: number, y: number, w: number, h: number) {
  r(c, SHADOW, x + 1, y + h, w, 3)
  r(c, OUT, x - 1, y, w + 2, h); r(c, OUT, x, y - 1, w, h + 2)
  r(c, '#eceae4', x, y, w, h); r(c, '#f7f6f2', x + 1, y + 1, w - 2, 4)
  for (let k = 6; k < w - 3; k += 9) r(c, '#d3d0c7', x + k, y + 5, 1, h - 6)
  r(c, '#d3d0c7', x, y + h - 2, w, 2)
}
function escada(c: C2D, x: number, y: number) {
  r(c, SHADOW, x - 1, y + 25, 14, 3)
  for (const dx of [0, 10]) { r(c, OUT, x + dx - 1, y - 1, 4, 28); r(c, '#b9bec7', x + dx, y, 2, 26) }
  for (let k = 5; k < 25; k += 6) { r(c, OUT, x + 1, k + y - 1, 10, 3); r(c, '#dfe3e8', x + 2, y + k, 8, 1) }
  r(c, OUT, x - 1, y - 2, 14, 4); r(c, '#8e95a1', x, y - 1, 12, 2)
}
function lata(c: C2D, x: number, y: number, tinta: string) {
  r(c, SHADOW, x, y + 10, 10, 2)
  r(c, OUT, x - 1, y - 1, 11, 12); r(c, '#c8ccd3', x, y, 9, 10); r(c, tinta, x, y + 3, 9, 4)
  r(c, '#e9ecf0', x + 1, y, 7, 2); r(c, tinta, x + 2, y, 5, 1)
}
/** cena de "sala em obra", espalhada proporcionalmente ao tamanho (o original era fixo em 24×16) */
export function desenharVaga(c: C2D, s: Sala) {
  const W = s.w, H = s.h, px = (f: number) => Math.round(1 + f * (W - 3)) * T, py = (f: number) => Math.round(2 + f * (H - 4)) * T
  r(c, 'rgba(255,255,255,.07)', T, 2 * T, (W - 2) * T, (H - 2) * T)
  coberto(c, px(0.38), py(0.33), 3 * T, 22)
  if (W >= 14) coberto(c, px(0.62), py(0.33) + 4, 2 * T + 6, 20)
  coberto(c, px(0.1), py(0.75), 2 * T + 8, 24)
  const pilha = (x: number, y: number) => { for (const [dx, dy, w, h] of [[0, 0, 15, 12], [16, 4, 12, 9], [4, -9, 12, 9]]) { r(c, SHADOW, x + dx, y + dy + h + 1, w + 1, 3); caixa(c, x + dx, y + dy, w, h) } }
  pilha(px(0.1), py(0.17))
  if (W >= 12) pilha(px(0.8), py(0.67))
  if (W >= 16 && H >= 10) { escada(c, px(0.85) + 4, py(0.17)); lata(c, px(0.76) + 6, py(0.25) + 10, '#7fb2d8'); lata(c, px(0.95), py(0.25) + 12, '#FFC600') }
  c.fillStyle = 'rgba(120,126,140,.22)'; c.fillRect(T, 0, (W - 2) * T, H * T)
}

type Cache = { cv: HTMLCanvasElement; chave: string }
const cache = new WeakMap<Sala, Cache>()

/** fundo da sala (piso, paredes, vidro, portas, luz das janelas, tapetes, sombras) — guardado em cache */
export function fundoSala(s: Sala, setor: Setor | null | undefined, op: { grade?: boolean; luz?: boolean } = {}): HTMLCanvasElement {
  const chave = [op.grade ? 1 : 0, op.luz === false ? 0 : 1, setor?.cor ?? '', setor?.emblema ?? ''].join('|')
  const hit = cache.get(s)
  if (hit && hit.chave === chave) return hit.cv
  const cv = criarCanvas(s.w * T, s.h * T), c = cv.getContext('2d')!
  paredes(c, s)
  for (const l of s.vidro ?? []) vidro(c, s, l)
  const temN = (s.vidro ?? []).includes('n')
  if (op.luz !== false && !temN) for (const o of s.objs) if (o.k === 'janela') { c.fillStyle = 'rgba(255,248,225,.22)'; for (let k = 0; k < 22; k++) c.fillRect(o.x * T + 3 + Math.floor(k / 2), 2 * T + k, 26, 1) }
  for (const o of s.objs) if (kd(o).camada === 'chao') kd(o).draw(c, o.x * T, o.y * T, 0)
  if (op.grade) { c.globalAlpha = 0.1; for (let x = 1; x < s.w; x++) r(c, '#000', x * T, 2 * T, 0.5, (s.h - 3) * T); for (let y = 2; y < s.h; y++) r(c, '#000', T, y * T, (s.w - 2) * T, 0.5); c.globalAlpha = 1 }
  for (const o of s.objs) { const k = kd(o); if (!k.camada && !k.passa) r(c, SHADOW, o.x * T + 1, (o.y + k.h) * T, k.w * T - 2, 3) }
  const m: Marca | null = setor ? { cor: setor.cor, emblema: setor.emblema } : null
  for (const p of s.portas) desenharPorta(c, s, p, m)
  cache.set(s, { cv, chave })
  return cv
}

export type OpSala = {
  t?: number
  grade?: boolean
  luz?: boolean
  /** quem está em cada mesa (d → pessoa) */ dono?: (d: number) => Pessoa | null | undefined
  /** sala sem setor e sem móvel aparece "em obra" */ vaga?: boolean
  selecionado?: number | null
  /** objeto sendo arrastado: não desenha (o editor desenha o fantasma) */ esconder?: number | null
}

/** objetos que entram na ordem de profundidade (fora tapete e parede) */
type Item = { key: number; draw: () => void }

/** desenha a sala inteira no contexto (já transladado pra origem da sala) */
export function desenharSala(c: C2D, s: Sala, setor: Setor | null | undefined, op: OpSala = {}) {
  const t = op.t ?? 0
  c.drawImage(fundoSala(s, setor, op), 0, 0)
  const vidroN = (s.vidro ?? []).includes('n')
  const objs = s.objs.filter(o => o.id !== op.esconder)
  // parede de cima: na parede de vidro a janela não entra (vidro já é janela)
  for (const o of objs) { const k = kd(o); if (k.camada === 'parede' && !(vidroN && o.k === 'janela')) k.draw(c, o.x * T, 0, t) }
  const items: Item[] = []
  const baia = s.tipo === 'vendas'
  for (const o of objs) {
    const k = kd(o)
    if (k.camada) continue
    if (isDesk(o.k)) {
      const d = deskFrom(o), boss = o.d === CHEFE, p = o.d === undefined ? null : op.dono?.(o.d)
      const cy = d.seat.y - 9
      items.push({ key: d.ty * T + 15, draw: () => drawDesk(c, d, boss, { pile: 0, inbox: false, busy: false, owned: !!p, t, baia: baia ? deskSides(s.objs, o) : undefined }) })
      items.push({ key: cy - 0.5, draw: () => drawChair(c, undefined, d.seat.x, cy, boss) })
      if (p) items.push({ key: d.seat.y + 0.4, draw: () => cracha(c, d.seat.x, d.seat.y - 26, p.nome, setor?.cor ?? '#26324F') })
    } else items.push({ key: (o.y + k.h) * T, draw: () => k.draw(c, o.x * T, o.y * T, t) })
  }
  items.sort((a, b) => a.key - b.key)
  for (const it of items) it.draw()
  if (op.vaga && !setor && !s.objs.some(o => !kd(o).camada)) desenharVaga(c, s)
  if (op.selecionado != null) { const o = s.objs.find(x => x.id === op.selecionado); if (o) selecao(c, o) }
}

/** etiqueta com o primeiro nome acima da cadeira */
function cracha(c: C2D, x: number, y: number, nome: string, cor: string) {
  const txt = nome.split(' ')[0].slice(0, 10)
  c.font = '6px monospace'
  const w = Math.ceil(c.measureText(txt).width) + 4
  r(c, OUT, x - (w >> 1) - 1, y - 1, w + 2, 9); r(c, cor, x - (w >> 1), y, w, 7)
  c.fillStyle = '#fff'; c.textBaseline = 'top'; c.fillText(txt, x - (w >> 1) + 2, y)
}

/** contorno tracejado no objeto selecionado */
export function selecao(c: C2D, o: Obj, cor = '#FFC600') {
  const b = bbox(o)
  c.save(); c.strokeStyle = cor; c.lineWidth = 1; c.setLineDash([3, 2])
  c.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1); c.restore()
}
