/**
 * Desenho do andar inteiro (no Turmeo: office/world.ts renderFloor, fixo em 48×37).
 * Corredor = tudo que não é sala; borda vira parede; passadeira e ladrilho vêm dos tokens do tema.
 */
import { PISOS } from '../motor/catalogo'
import { corredorGrid, salaEm } from '../motor/andar'
import { kd } from '../motor/sala'
import type { Andar, Doc, Pessoa, Sala, Setor } from '../motor/tipos'
import { OUT, rect as r, SHADOW, T, WALL, WALL_HI, type C2D } from './base'
import { capacho } from './portas'
import { criarCanvas, desenharSala, selecao } from './sala'
import { usarTokens, type Tokens } from './tokens'

function pedra(c: C2D, tx: number, ty: number, k: Tokens) {
  const x = tx * T, y = ty * T
  r(c, (tx + ty) % 2 ? k.pedraA : k.pedraB, x, y, T, T)
  r(c, k.rejunte, x, y, T, 1); r(c, k.rejunte, x, y, 1, T)
  for (const [a, b] of [[4, 5], [11, 9], [7, 13]]) r(c, k.rejunte, x + 1 + ((a + tx * 3) % 14), y + 1 + ((b + ty * 5) % 14), 1, 1)
}

/** passadeira da marca; f em tiles do andar */
export function passadeira(c: C2D, f: { x: number; y: number; w: number; h: number }, k: Tokens) {
  const rx = f.x * T, rw = f.w * T, ry = f.y * T + 3, rh = f.h * T - 6, mid = ry + (rh >> 1)
  if (rw < 16 || rh < 12) return
  r(c, 'rgba(40,30,20,.18)', rx, ry + rh, rw, 2)
  r(c, OUT, rx - 1, ry - 1, rw + 2, rh + 2); r(c, k.marca, rx, ry, rw, rh)
  r(c, k.destaque, rx + 3, ry + 3, rw - 6, 1); r(c, k.destaque, rx + 3, ry + rh - 4, rw - 6, 1)
  r(c, k.marcaClara, rx + 6, ry + 6, rw - 12, rh - 12)
  for (let x = rx + 20; x < rx + rw - 16; x += 28) { r(c, k.marcaDetalhe, x, mid - 3, 1, 7); r(c, k.marcaDetalhe, x - 3, mid, 7, 1); r(c, k.destaque, x, mid, 1, 1) }
}

/** marca da entrada (elevador/escada): placa no chão com seta */
function entrada(c: C2D, a: Andar, k: Tokens) {
  const x = a.entrada.x * T, y = a.entrada.y * T
  r(c, OUT, x - 1, y + 1, T + 2, T - 2); r(c, k.destaque, x, y + 2, T, T - 4)
  c.fillStyle = OUT
  for (let i = 0; i < 4; i++) c.fillRect(x + 4 + i, y + 5 + i, 1, 7 - 2 * i)
  c.fillRect(x + 9, y + 7, 4, 2)
}

const cacheFundo = new WeakMap<Andar, { cv: HTMLCanvasElement; chave: string }>()

/** fundo do corredor (ladrilho/piso, paredes da borda, passadeira, sombras sob as salas) — em cache */
export function fundoAndar(a: Andar, k: Tokens): HTMLCanvasElement {
  const chave = JSON.stringify(k)
  const hit = cacheFundo.get(a)
  if (hit && hit.chave === chave) return hit.cv
  const cv = criarCanvas(a.w * T, a.h * T), c = cv.getContext('2d')!
  const g = corredorGrid(a), piso = a.corredor.piso === 'pedra' ? null : PISOS[a.corredor.piso]
  for (let ty = 0; ty < a.h; ty++) for (let tx = 0; tx < a.w; tx++) {
    if (salaEm(a, tx, ty)) continue
    if (!g[ty][tx]) { r(c, WALL, tx * T, ty * T, T, T); r(c, WALL_HI, tx < 1 ? T - 2 : tx * T, ty * T, 2, T); continue }
    if (piso) piso.draw(c, tx * T, ty * T); else pedra(c, tx, ty, k)
  }
  if (a.corredor.faixa) passadeira(c, a.corredor.faixa, k)
  for (const o of a.corredor.objs) if (kd(o).camada === 'chao') kd(o).draw(c, o.x * T, o.y * T, 0)
  for (const s of a.salas) if (s.y + s.h < a.h) r(c, SHADOW, s.x * T, (s.y + s.h) * T, s.w * T, 3)
  for (const o of a.corredor.objs) { const kk = kd(o); if (!kk.camada && !kk.passa) r(c, SHADOW, o.x * T + 1, (o.y + kk.h) * T, kk.w * T - 2, 3) }
  entrada(c, a, k)
  cacheFundo.set(a, { cv, chave })
  return cv
}

/** capachos do lado de fora das portas que dão no corredor */
function capachos(c: C2D, a: Andar, s: Sala, cor: string) {
  const g = corredorGrid(a)
  for (const p of s.portas) {
    const sx = s.x, sy = s.y
    if (p.lado === 'n' && g[sy - 1]?.[sx + p.pos]) capacho(c, (sx + p.pos) * T + 3, (sy - 1) * T + 4, cor)
    else if (p.lado === 's' && g[sy + s.h]?.[sx + p.pos]) capacho(c, (sx + p.pos) * T + 3, (sy + s.h) * T + 4, cor)
    else if (p.lado === 'o' && g[sy + p.pos]?.[sx - 1]) capacho(c, (sx - 1) * T + 4, (sy + p.pos) * T + 3, cor, true)
    else if (p.lado === 'l' && g[sy + p.pos]?.[sx + s.w]) capacho(c, (sx + s.w) * T + 3, (sy + p.pos) * T + 3, cor, true)
  }
}

export type Selecao = { sala?: string | null; obj?: number | null; corredor?: number | null }
export type OpAndar = { t?: number; grade?: boolean; sel?: Selecao; esconder?: { sala?: string; obj?: number; corredor?: number } | null; vaga?: boolean }

/** desenha o andar inteiro no contexto, origem (0,0) = canto do andar */
export function desenharAndar(c: C2D, doc: Doc, a: Andar, op: OpAndar = {}) {
  const t = op.t ?? 0, k = doc.tema
  usarTokens(k)
  c.drawImage(fundoAndar(a, k), 0, 0)
  const setorDe = (s: Sala): Setor | null => doc.setores.find(x => x.id === s.setor) ?? null
  const dono = (s: Sala) => (d: number): Pessoa | null => doc.pessoas.find(p => p.mesa?.sala === s.id && p.mesa.d === d) ?? null
  for (const s of [...a.salas].sort((p, q) => p.y - q.y)) {
    c.save(); c.translate(s.x * T, s.y * T)
    desenharSala(c, s, setorDe(s), {
      t, grade: op.grade, dono: dono(s), vaga: op.vaga ?? true,
      selecionado: op.sel?.sala === s.id ? op.sel.obj ?? null : null,
      esconder: op.esconder?.sala === s.id ? op.esconder.obj ?? null : null,
    })
    c.restore()
    const st = setorDe(s)
    if (st) capachos(c, a, s, st.cor)
  }
  const objs = a.corredor.objs.filter(o => !kd(o).camada && o.id !== op.esconder?.corredor).sort((p, q) => (p.y + kd(p).h) - (q.y + kd(q).h))
  for (const o of objs) kd(o).draw(c, o.x * T, o.y * T, t)
  if (op.sel?.corredor != null) { const o = a.corredor.objs.find(x => x.id === op.sel!.corredor); if (o) selecao(c, o) }
  if (op.sel?.sala && op.sel.obj == null) {
    const s = a.salas.find(x => x.id === op.sel!.sala)
    if (s) { c.save(); c.strokeStyle = k.destaque; c.lineWidth = 2; c.setLineDash([6, 3]); c.strokeRect(s.x * T + 1, s.y * T + 1, s.w * T - 2, s.h * T - 2); c.restore() }
  }
}
