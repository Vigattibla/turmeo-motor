/**
 * Portas, capachos e vidro em qualquer tamanho de sala (no Turmeo era fixo em 24×16: office/andar.ts).
 * Tudo em coordenada local da sala, em pixel.
 */
import { PISOS } from '../motor/catalogo'
import type { Lado, Porta, Sala } from '../motor/tipos'
import { drawBanner } from './bandeira'
import { OUT, rect as r, T, WALL, WALL_HI, type C2D } from './base'

export const darker = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16)
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k))).toString(16).padStart(2, '0')
  return '#' + f(n >> 16) + f((n >> 8) & 255) + f(n & 255)
}
export const inkOn = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) > 150 ? '#1b2240' : '#ffffff'
}
export type Marca = { cor: string; emblema?: string | null; aberta?: boolean }

/** porta na parede alta de cima (linhas 0-1) */
function portaNorte(c: C2D, tx: number, m: Marca | null) {
  const x = tx * T, y = 5, w = 2 * T, h = 2 * T - y, empty = !m
  r(c, OUT, x + 1, y, w - 2, h)
  r(c, empty ? '#a3a8b3' : '#6b4a33', x + 2, y + 1, w - 4, h - 1)
  const ix = x + 4, iy = y + 3, iw = w - 8, ih = h - 3
  if (m?.aberta) {
    r(c, '#2a2238', ix, iy, iw, ih); r(c, '#3a3150', ix + 4, iy + 2, iw - 8, ih - 2)
    r(c, 'rgba(255,236,190,.28)', ix + 3, iy + ih - 6, iw - 6, 6)
    r(c, OUT, ix, iy, 4, ih); r(c, '#b07a4f', ix + 1, iy, 2, ih)
  } else {
    const leaf = empty ? '#c3c7cf' : '#b07a4f', hi = empty ? '#d3d6dc' : '#c99566'
    r(c, leaf, ix, iy, iw, ih)
    for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) r(c, hi, ix + 2 + a * (iw / 2 - 1), iy + 2 + b * (ih / 2 - 1), iw / 2 - 3, ih / 2 - 3)
    r(c, OUT, ix + iw - 5, iy + ih / 2, 3, 2); r(c, empty ? '#8a8f98' : '#FBC222', ix + iw - 4, iy + ih / 2, 1, 1)
    if (m) r(c, m.cor, ix, iy + ih / 2 - 1, iw, 2)
  }
  if (m) drawBanner(c, x + w + 4, 7, m.cor, m.emblema)
}
/** porta na parede de baixo (linha h-1) */
function portaSul(c: C2D, s: Sala, tx: number, m: Marca | null) {
  const x = tx * T, y = (s.h - 1) * T
  r(c, OUT, x, y, 2 * T, T)
  r(c, m ? '#6b4a33' : '#a3a8b3', x + 1, y + 1, 2 * T - 2, T - 1)
  if (!m) { r(c, '#c3c7cf', x + 3, y + 3, 2 * T - 6, T - 3); return }
  if (m.aberta) { r(c, '#2a2238', x + 3, y + 3, 2 * T - 6, T - 3); r(c, '#3a3150', x + 6, y + 5, 2 * T - 12, T - 5) }
  else { r(c, '#b07a4f', x + 3, y + 3, 2 * T - 6, T - 3); r(c, '#c99566', x + 3, y + 3, 2 * T - 6, 1); r(c, '#FBC222', x + 2 * T - 9, y + 8, 2, 2) }
  r(c, OUT, x + 4, y - 6, 2 * T - 8, 5); r(c, '#8a6a4a', x + 5, y - 5, 2 * T - 10, 3); r(c, '#a8835c', x + 7, y - 4, 2 * T - 14, 1)
  drawBanner(c, x + 2 * T + 4, y + 2, m.cor, m.emblema)
}
/** porta nas paredes do lado (vão de 2 tiles na coluna 0 ou w-1) */
function portaLado(c: C2D, s: Sala, lado: 'l' | 'o', ty: number, m: Marca | null) {
  const x = lado === 'o' ? 0 : (s.w - 1) * T, y = ty * T
  for (const k of [0, 1]) PISOS[s.piso[ty + k][lado === 'o' ? 1 : s.w - 2]]?.draw(c, x, y + k * T)
  r(c, OUT, x, y - 2, T, 2); r(c, OUT, x, y + 2 * T, T, 2)
  r(c, m ? '#6b4a33' : '#a3a8b3', x, y - 1, T, 1); r(c, m ? '#6b4a33' : '#a3a8b3', x, y + 2 * T, T, 1)
  if (m && !m.aberta) { const fx = lado === 'o' ? x + 1 : x + T - 4; r(c, OUT, fx, y, 3, 2 * T); r(c, '#b07a4f', fx + 1, y, 1, 2 * T) }
  if (m) drawBanner(c, x + 3, y - 16, m.cor, m.emblema)
}
export function desenharPorta(c: C2D, s: Sala, p: Porta, m: Marca | null) {
  if (p.lado === 'n') portaNorte(c, p.pos, m)
  else if (p.lado === 's') portaSul(c, s, p.pos, m)
  else portaLado(c, s, p.lado, p.pos, m)
}

/** capacho do lado de fora da porta (coordenada do andar, em pixel) */
export function capacho(c: C2D, x: number, y: number, cor: string, vertical = false) {
  const w = vertical ? 9 : 2 * T - 6, h = vertical ? 2 * T - 6 : 7, dk = darker(cor, 0.72), hi = darker(cor, 1.22)
  r(c, OUT, x - 1, y - 1, w + 2, h + 2); r(c, dk, x, y, w, h); r(c, cor, x + 1, y + 1, w - 2, h - 2)
  if (vertical) for (let k = 4; k < h - 4; k += 3) r(c, hi, x + 4, y + k, 1, 1)
  else for (let k = 4; k < w - 4; k += 3) r(c, hi, x + k, y + 3, 1, 1)
}

const FRAME = '#8794a8', FRAME_D = '#5d6b80', TINT = 'rgba(170,215,238,.42)', GLINT = 'rgba(255,255,255,.55)'

/** parede de vidro num lado da sala (vidro de baixo = faixa fina; de cima = parede alta inteira) */
export function vidro(c: C2D, s: Sala, lado: Lado) {
  const W = s.w, H = s.h
  if (lado === 's') {
    const y = (H - 1) * T
    for (let tx = 1; tx < W - 1; tx++) PISOS[s.piso[H - 2][tx]]?.draw(c, tx * T, y)
    const x = T, w = (W - 2) * T
    r(c, TINT, x, y, w, 12); r(c, FRAME_D, x, y, w, 1); r(c, GLINT, x, y + 1, w, 1)
    for (let tx = 1; tx < W - 1; tx++) {
      if ((tx - 1) % 4 === 0 && tx > 1) { r(c, OUT, tx * T - 1, y, 1, 12); r(c, FRAME, tx * T, y, 2, 12) }
      if (tx % 3 === 0) for (let k = 0; k < 6; k++) r(c, GLINT, tx * T + 4 + k, y + 9 - k, 1, 1)
    }
    r(c, OUT, x, y + 12, w, 1); r(c, '#a9b4c4', x, y + 13, w, 2); r(c, FRAME_D, x, y + 15, w, 1)
  } else if (lado === 'n') {
    for (let tx = 1; tx < W - 1; tx++) for (const ty of [0, 1]) PISOS[s.piso[2][tx]]?.draw(c, tx * T, ty * T)
    const x = T, w = (W - 2) * T
    r(c, OUT, x, 0, w, 1); r(c, FRAME, x, 1, w, 3); r(c, '#a9b4c4', x, 1, w, 1)
    r(c, TINT, x, 4, w, 24)
    for (let tx = 1; tx < W - 1; tx++) {
      if ((tx - 1) % 2 === 0 && tx > 1) { r(c, OUT, tx * T - 2, 4, 1, 24); r(c, FRAME, tx * T - 1, 4, 2, 24); r(c, OUT, tx * T + 1, 4, 1, 24) }
      if (tx % 2 === 0) { for (let k = 0; k < 12; k++) r(c, GLINT, tx * T - 10 + k, 22 - k, 1, 1); for (let k = 0; k < 6; k++) r(c, GLINT, tx * T - 4 + k, 22 - k, 1, 1) }
    }
    r(c, OUT, x, 28, w, 1); r(c, FRAME, x, 29, w, 2); r(c, FRAME_D, x, 31, w, 1)
  } else {
    const x = lado === 'o' ? 0 : (W - 1) * T
    for (let ty = 2; ty < H - 1; ty++) PISOS[s.piso[ty][lado === 'o' ? 1 : W - 2]]?.draw(c, x, ty * T)
    const y = 2 * T, h = (H - 3) * T, gx = lado === 'o' ? x + 5 : x + 4
    r(c, OUT, gx - 1, y, 1, h); r(c, TINT, gx, y, 6, h); r(c, OUT, gx + 6, y, 1, h)
    for (let ty = 3; ty < H - 1; ty += 3) { r(c, FRAME, gx, ty * T, 6, 2); for (let k = 0; k < 5; k++) r(c, GLINT, gx + k, ty * T + 12 - k, 1, 1) }
  }
}

/** paredes cheias de um lado (lado sem vidro) — usado pra fechar o vão quando a sala encosta na borda */
export function paredeLado(c: C2D, s: Sala, lado: 'l' | 'o') {
  const x = lado === 'o' ? 0 : (s.w - 1) * T
  for (let ty = 0; ty < s.h; ty++) { r(c, WALL, x, ty * T, T, T); r(c, WALL_HI, lado === 'o' ? T - 2 : x, ty * T, 2, T) }
}
