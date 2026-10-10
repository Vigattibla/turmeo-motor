/** Regras de uma sala de qualquer tamanho: onde cabe móvel, porta, cadeira e caminho. Sem desenho aqui. */
import { T, OUT, rect } from '../render/base'
import { isDesk, KINDS, type Kind } from './catalogo'
import { CHEFE, type Lado, type Obj, type Porta, type Sala, type TipoSala } from './tipos'

export const MIN_W = 8, MIN_H = 8
/** móvel de catálogo que sumiu (registro externo): vira caixa marcada, não quebra o documento */
const SUMIU: Kind = { nome: 'Móvel desconhecido', tema: 'Escritório', w: 1, h: 1, draw: (c, x, y) => { rect(c, OUT, x + 2, y + 2, 12, 12); rect(c, '#e0389a', x + 3, y + 3, 10, 10) } }
export const kd = (o: Obj): Kind => KINDS[o.k] ?? SUMIU
/** nome de quem senta na mesa d (null = vaga) */
export type NameOf = (d: number) => string | null
const ninguem: NameOf = () => null

export const grade = <V,>(w: number, h: number, v: V): V[][] => Array.from({ length: h }, () => Array<V>(w).fill(v))
export const at = <V,>(g: V[][], x: number, y: number, v: V) => g.map((row, j) => j === y ? row.map((c, i) => i === x ? v : c) : row)
export const dentro = (s: Pick<Sala, 'w' | 'h'>, x: number, y: number) => x >= 1 && y >= 2 && x <= s.w - 2 && y <= s.h - 2

export function novaSala(p: { id: string; nome: string; tipo?: TipoSala; setor?: string; x: number; y: number; w: number; h: number; piso?: string }): Sala {
  const w = Math.max(MIN_W, p.w), h = Math.max(MIN_H, p.h)
  return {
    id: p.id, nome: p.nome, tipo: p.tipo ?? 'livre', ...(p.setor ? { setor: p.setor } : {}),
    x: p.x, y: p.y, w, h, piso: grade(w, h, p.piso ?? 'madeira'), div: grade(w, h, false), objs: [], portas: [],
  }
}
export const proximoId = (objs: Obj[]) => objs.reduce((m, o) => Math.max(m, o.id), 0) + 1

/* ---------- portas ---------- */
/** os 2 tiles da parede que viram porta (local). Porta de cima atravessa as 2 linhas da parede alta. */
export function portaCelulas(s: Sala, p: Porta): { x: number; y: number }[] {
  const a = p.pos, b = p.pos + 1
  switch (p.lado) {
    case 's': return [{ x: a, y: s.h - 1 }, { x: b, y: s.h - 1 }]
    case 'n': return [{ x: a, y: 0 }, { x: b, y: 0 }, { x: a, y: 1 }, { x: b, y: 1 }]
    case 'o': return [{ x: 0, y: a }, { x: 0, y: b }]
    case 'l': return [{ x: s.w - 1, y: a }, { x: s.w - 1, y: b }]
  }
}
/** tiles de dentro, logo na frente da porta: não pode ter móvel */
export function portaDentro(s: Sala, p: Porta): { x: number; y: number }[] {
  const a = p.pos, b = p.pos + 1
  switch (p.lado) {
    case 's': return [{ x: a, y: s.h - 2 }, { x: b, y: s.h - 2 }]
    case 'n': return [{ x: a, y: 2 }, { x: b, y: 2 }]
    case 'o': return [{ x: 1, y: a }, { x: 1, y: b }]
    case 'l': return [{ x: s.w - 2, y: a }, { x: s.w - 2, y: b }]
  }
}
/** tiles do lado de fora (coordenada do ANDAR) */
export function portaFora(s: Sala, p: Porta): { x: number; y: number }[] {
  const a = p.pos, b = p.pos + 1
  switch (p.lado) {
    case 's': return [{ x: s.x + a, y: s.y + s.h }, { x: s.x + b, y: s.y + s.h }]
    case 'n': return [{ x: s.x + a, y: s.y - 1 }, { x: s.x + b, y: s.y - 1 }]
    case 'o': return [{ x: s.x - 1, y: s.y + a }, { x: s.x - 1, y: s.y + b }]
    case 'l': return [{ x: s.x + s.w, y: s.y + a }, { x: s.x + s.w, y: s.y + b }]
  }
}
/** faixa válida de pos para o lado */
export function portaFaixa(s: Pick<Sala, 'w' | 'h'>, lado: Lado): [number, number] {
  return lado === 'n' || lado === 's' ? [1, s.w - 3] : [2, s.h - 3]
}
export function portaValida(s: Sala, p: Porta): string | null {
  const [a, b] = portaFaixa(s, p.lado)
  if (!Number.isInteger(p.pos) || p.pos < a || p.pos > b) return 'Porta fora da parede'
  for (const q of s.portas) if (q !== p && q.lado === p.lado && Math.abs(q.pos - p.pos) < 2) return 'Porta em cima de outra porta'
  return null
}
/** posição de porta mais perto do meio do lado em que a frente está livre */
export function portaLivre(s: Sala, lado: Lado, alvo?: number): number | null {
  const [a, b] = portaFaixa(s, lado)
  const meio = alvo ?? Math.floor((a + b) / 2)
  const solid = solidGrid(s)
  const parede = (x: number) => lado === 'n' && s.objs.some(o => kd(o).camada === 'parede' && x >= o.x && x < o.x + kd(o).w)
  for (let k = 0; k <= b - a + 1; k++) {
    const pos = meio + (k % 2 ? -(k + 1) / 2 : k / 2)
    if (pos < a || pos > b) continue
    const p = { lado, pos }
    if (portaValida({ ...s, portas: s.portas }, p)) continue
    if (portaDentro(s, p).some(t => solid[t.y][t.x] || s.div[t.y][t.x])) continue
    if (parede(pos) || parede(pos + 1)) continue
    return pos
  }
  return null
}
/** conjunto "x,y" dos tiles de dentro na frente de alguma porta */
export function frentes(s: Sala) {
  const f = new Set<string>()
  for (const p of s.portas) for (const t of portaDentro(s, p)) f.add(t.x + ',' + t.y)
  return f
}

/* ---------- móveis ---------- */
export function solidGrid(s: Sala, skip?: number) {
  const g = grade(s.w, s.h, false)
  for (const o of s.objs) {
    const k = kd(o)
    if (o.id === skip || k.camada || k.passa) continue
    for (let j = 0; j < k.h; j++) for (let i = 0; i < k.w; i++) if (g[o.y + j] && o.x + i < s.w) g[o.y + j][o.x + i] = true
  }
  return g
}

/** motivo de não poder ficar ali, ou null */
export function check(s: Sala, o: Obj, nameOf: NameOf = ninguem): string | null {
  const k = kd(o)
  if (k.camada === 'parede') {
    if (o.x < 1 || o.x + k.w > s.w - 1) return 'Fora da parede'
    if (o.k === 'janela' && s.vidro?.includes('n')) return 'Parede de vidro já é janela'
    for (const p of s.portas) if (p.lado === 'n' && o.x < p.pos + 2 && p.pos < o.x + k.w) return 'Em cima da porta'
    for (const p of s.objs) if (p.id !== o.id && kd(p).camada === 'parede' && o.x < p.x + kd(p).w && p.x < o.x + k.w) return 'Já tem coisa nesse pedaço da parede'
    return null
  }
  if (o.x < 1 || o.y < 2 || o.x + k.w > s.w - 1 || o.y + k.h > s.h - 1) return 'Fora da sala'
  if (k.camada === 'chao') return null
  const solid = solidGrid(s, o.id), fr = frentes(s)
  for (let j = 0; j < k.h; j++) for (let i = 0; i < k.w; i++) {
    if (s.div[o.y + j][o.x + i]) return 'Em cima da parede'
    if (!k.passa && solid[o.y + j][o.x + i]) return 'Em cima de outro móvel'
    if (!k.passa && fr.has(o.x + i + ',' + (o.y + j))) return 'Na frente da porta'
  }
  if (k.mesa) {
    for (let i = 0; i < k.w; i++) if (o.y - 1 < 2 || solid[o.y - 1][o.x + i] || s.div[o.y - 1][o.x + i]) return 'A cadeira precisa de espaço atrás da mesa'
    if (o.d !== undefined && s.objs.some(p => p.id !== o.id && isDesk(p.k) && p.d === o.d)) return 'Número de mesa repetido'
  }
  if (!k.passa) for (const d of s.objs) if (d.id !== o.id && isDesk(d.k)) for (let i = 0; i < kd(d).w; i++) {
    const tx = d.x + i, ty = d.y - 1
    if (tx >= o.x && tx < o.x + k.w && ty >= o.y && ty < o.y + k.h) { const n = d.d === undefined ? null : nameOf(d.d); return `Ficou em cima da cadeira ${n ? 'de ' + n : 'de outra mesa'}` }
  }
  return null
}

/** tile andável dentro da sala */
export function andavel(s: Sala, solid = solidGrid(s)) {
  return (x: number, y: number) => dentro(s, x, y) && !solid[y][x] && !s.div[y][x]
}
/** assento de cada mesa (tile local onde a pessoa senta) */
export const assento = (o: Obj) => ({ x: o.x + Math.floor((kd(o).w - 1) / 2), y: o.y - 1 })

/** todo mundo continua chegando na própria mesa a partir de uma porta? null = sim */
export function reach(s: Sala, nameOf: NameOf = ninguem): string | null {
  const ok = andavel(s)
  const desks = s.objs.filter(o => isDesk(o.k))
  if (!desks.length) return null
  const ini = s.portas.length ? s.portas.flatMap(p => portaDentro(s, p)).filter(t => ok(t.x, t.y)) : [assento(desks[0])]
  const seen = new Set<string>(ini.map(t => t.x + ',' + t.y)), q = [...ini]
  while (q.length) {
    const { x, y } = q.shift()!
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, key = nx + ',' + ny
      if (!ok(nx, ny) || seen.has(key)) continue
      seen.add(key); q.push({ x: nx, y: ny })
    }
  }
  const lost = desks.find(d => !seen.has(assento(d).x + ',' + assento(d).y))
  if (!lost) return null
  const n = lost.d === undefined ? null : nameOf(lost.d)
  return `Assim ${n ? 'a mesa de ' + n : 'uma mesa'} fica sem caminho`
}

/** mesas da sala (com número), chefia primeiro */
export const mesas = (s: Sala) => s.objs.filter(o => isDesk(o.k) && o.d !== undefined).sort((a, b) => (a.d === CHEFE ? -1 : b.d === CHEFE ? 1 : a.d! - b.d!))
/** próximo número livre de mesa (chefia pede CHEFE) */
export function proximaMesa(s: Sala, chefia = false) {
  const usados = new Set(s.objs.filter(o => o.d !== undefined).map(o => o.d!))
  if (chefia && !usados.has(CHEFE)) return CHEFE
  let d = 0
  while (usados.has(d)) d++
  return d
}
/** vizinhos colados na mesma bancada (mesma linha, encostados): vira uma peça só */
export function deskSides(objs: Obj[], o: Obj) {
  const w = kd(o).w, same = (x: number) => objs.some(d => d.k === 'mesa' && d.y === o.y && d.x === x)
  return o.k === 'mesa' ? { l: same(o.x - w), r: same(o.x + w) } : { l: false, r: false }
}
export const deskFrom = (o: Obj) => { const w = kd(o).w; return { tx: o.x, ty: o.y, w, seat: { x: o.x * T + (w * T) / 2, y: o.y * T + 8 } } }

/* ---------- seleção (px locais da sala) ---------- */
export function bbox(o: Obj) {
  const k = kd(o)
  if (k.camada === 'parede') return { x: o.x * T, y: 0, w: k.w * T, h: 2 * T }
  return { x: o.x * T, y: (o.y - (k.up ?? 0)) * T, w: k.w * T, h: (k.h + (k.up ?? 0)) * T }
}
export function hitTest(objs: Obj[], mx: number, my: number): Obj | null {
  const inside = (o: Obj) => { const b = bbox(o); return mx >= b.x && mx < b.x + b.w && my >= b.y && my < b.y + b.h }
  const rest = objs.filter(o => !kd(o).camada).sort((a, b) => (b.y + kd(b).h) - (a.y + kd(a).h))
  // pé do móvel tem prioridade sobre a arte que sobe
  const foot = rest.find(o => { const k = kd(o); return mx >= o.x * T && mx < (o.x + k.w) * T && my >= o.y * T && my < (o.y + k.h) * T })
  return foot ?? rest.find(inside) ?? objs.find(o => kd(o).camada === 'parede' && inside(o)) ?? objs.find(o => kd(o).camada === 'chao' && inside(o)) ?? null
}

/** muda o tamanho mantendo o que cabe; móvel que sai some, porta volta pra faixa válida */
export function redimensionar(s: Sala, w: number, h: number): Sala {
  w = Math.max(MIN_W, w); h = Math.max(MIN_H, h)
  const piso = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => s.piso[Math.min(y, s.h - 1)]?.[Math.min(x, s.w - 1)] ?? 'madeira'))
  const div = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => !!s.div[y]?.[x] && dentro({ w, h }, x, y)))
  const base = { ...s, w, h, piso, div }
  const objs = s.objs.filter(o => { const k = kd(o); return k.camada === 'parede' ? o.x + k.w <= w - 1 : o.x + k.w <= w - 1 && o.y + k.h <= h - 1 })
  const portas = s.portas.map(p => { const [a, b] = portaFaixa(base, p.lado); return { lado: p.lado, pos: Math.max(a, Math.min(b, p.pos)) } })
    .filter((p, i, xs) => xs.findIndex(q => q.lado === p.lado && Math.abs(q.pos - p.pos) < 2) === i)
  return { ...base, objs, portas }
}
