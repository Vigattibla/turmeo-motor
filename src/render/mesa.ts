/** Mesa de trabalho com notebook, folhas e telefone de baia (copiado do Turmeo: office/world.ts). */
import { OUT, rect, T, type C2D } from './base'
import { drawDecor, drawFloor, drawNotebook, MESA, mesaExtra, type DeskLook } from './props'
export type Desk = { tx: number; ty: number; w: number; seat: { x: number; y: number } }
const NOTE_COLORS = ['#FBC222', '#7ed6a5', '#f59ab5', '#8ecbf5']
const PILE = 7

/** Pilha de folhas crescendo para cima a partir de (x, y) */
function pile(c: C2D, x: number, y: number, n: number, sticky: boolean) {
  for (let k = 0; k < n; k++) {
    const dx = (k * 5) % 3 - 1, yy = y - k * 2
    rect(c, OUT, x + dx, yy, 8, 2)
    rect(c, k % 3 === 2 ? '#e9ebf0' : '#fbfbf8', x + dx + 1, yy, 6, 1)
  }
  if (sticky && n) rect(c, NOTE_COLORS[0], x + 2, y - (n - 1) * 2, 3, 1)
}

const BANCADA = { top: '#d8d1c2', hi: '#ece6da', front: '#6f7a91' }
/** telefone de mesa (canto esquerdo da bancada); tocando = luz piscando */
function drawPhone(c: C2D, x: number, y: number, ring: boolean) {
  rect(c, OUT, x, y, 7, 6)
  rect(c, '#2f3442', x + 1, y + 1, 5, 4)
  rect(c, '#9aa3b5', x + 2, y + 3, 3, 1)
  rect(c, OUT, x - 1, y - 2, 9, 3)
  rect(c, '#3c4254', x, y - 1, 7, 1)
  rect(c, ring ? '#e5483a' : '#5fd28a', x + 5, y + 1, 1, 1)
}
export function drawDesk(c: C2D, d: Desk, boss: boolean, info: { pile: number; inbox: boolean; busy: boolean; owned: boolean; t: number; baia?: { l: boolean; r: boolean } }, look?: DeskLook) {
  const { tx, ty, w: wt } = d
  const x = tx * T, y = ty * T, w = wt * T, m = x + w / 2
  const g = look ?? {}, bx = info.baia
  const col = MESA[g.mesa ?? ''] ?? (boss ? { top: '#6b3f22', hi: '#8a5530', front: '#4a2a16' } : bx ? BANCADA : { top: '#b07a4f', hi: '#c99566', front: '#8a5a36' })
  // baia: lado colado no vizinho sem contorno nem perna, a bancada segue direto
  const el = bx?.l ? 0 : 1, er = bx?.r ? 0 : 1
  rect(c, OUT, x - el, y + 1, w + el + er, 15)
  rect(c, col.top, x, y + 2, w, 8)
  rect(c, col.hi, x, y + 2, w, 1)
  rect(c, col.front, x, y + 10, w, 5)
  mesaExtra(c, g.mesa, x, y, w, info.t)
  if (el) rect(c, '#6e4529', x + 1, y + 15, 2, 1)
  if (er) rect(c, '#6e4529', x + w - 3, y + 15, 2, 1)
  if (bx) {
    // divisória baixa entre um lugar e outro + telefone do lado
    if (bx.l) { rect(c, OUT, x - 2, y - 7, 4, 13); rect(c, '#b9c4dc', x - 1, y - 6, 2, 11); rect(c, '#dfe5f1', x - 1, y - 6, 1, 11) }
    drawPhone(c, x + (bx.l ? 3 : 2), y + 3, info.owned && info.inbox && Math.sin(info.t / 160) > 0)
  }
  if (boss) {
    // plaquinha na frente da mesa + luminária
    rect(c, OUT, m - 9, y + 10, 18, 5)
    rect(c, '#3b2a20', m - 8, y + 11, 16, 3)
    rect(c, '#FBC222', m - 6, y + 12, 12, 1)
    rect(c, OUT, x + 6, y - 4, 1, 8); rect(c, '#FBC222', x + 4, y - 5, 5, 2)
  }
  if (!info.owned) {
    rect(c, '#9aa3b5', m - 4, y + 4, 8, 4)
    return
  }
  // notebook (tampa virada pra câmera)
  const glow = info.busy ? (Math.sin(info.t / 300) > -0.3 ? '#FBC222' : '#ffd965') : '#9aa3b5'
  drawNotebook(c, g.notebook, m, y - 1, glow, info.t)
  if (g.enfeite) drawDecor(c, g.enfeite, x + 1 + (boss ? 10 : 0), y + 6, info.t)
  if (g.chao) drawFloor(c, g.chao, x + w + 3, y + 16, info.t)
  // pedido esperando: luz vermelha piscando no notebook
  if (info.inbox && Math.sin(info.t / 220) > 0) { rect(c, OUT, m + 4, y - 3, 4, 4); rect(c, '#e5483a', m + 5, y - 2, 2, 2) }
  // folhas: quanto mais demanda aberta, mais a mesa enche (direita → esquerda → chão)
  const n = info.pile, off = boss ? 10 : 0
  if (bx) { /* o canto esquerdo é do telefone */ }
  else if (n > PILE) pile(c, x + 1 + off, y + 7, Math.min(n - PILE, PILE), false)
  else { rect(c, '#ffffff', x + 3 + off, y + 4, 3, 4); rect(c, '#ffffff', x + 6 + off, y + 5, 1, 2) }
  pile(c, x + w - 9 - (boss ? 4 : 0), y + 7, Math.min(n, PILE), info.inbox)
  for (let k = 0; k < Math.min(n - 2 * PILE, 6); k++) {
    const fx = x + 1 + ((k * 11) % (w - 8)), fy = y + 17 + (k % 2) * 3
    rect(c, OUT, fx, fy, 7, 3)
    rect(c, '#fbfbf8', fx + 1, fy + 1, 5, 1)
  }
}
