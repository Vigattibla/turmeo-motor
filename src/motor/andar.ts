/** Regras do andar: corredor (o que sobra fora das salas), paredes da borda e caminho a pé. */
import { isDesk } from './catalogo'
import { assento, grade, kd, portaCelulas, portaFora, solidGrid } from './sala'
import type { Andar, Obj, Sala } from './tipos'

/** sala que cobre o tile do andar */
export const salaEm = (a: Andar, x: number, y: number): Sala | undefined =>
  a.salas.find(s => x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h)
export const sobrepoe = (p: { x: number; y: number; w: number; h: number }, q: { x: number; y: number; w: number; h: number }) =>
  p.x < q.x + q.w && q.x < p.x + p.w && p.y < q.y + q.h && q.y < p.y + p.h

/** true = chão de corredor (fora de sala e fora da borda do andar) */
export function corredorGrid(a: Andar) {
  const g = grade(a.w, a.h, true)
  for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) if (x === 0 || y === 0 || x === a.w - 1 || y === a.h - 1) g[y][x] = false
  for (const s of a.salas) for (let j = 0; j < s.h; j++) for (let i = 0; i < s.w; i++) if (g[s.y + j]?.[s.x + i] !== undefined) g[s.y + j][s.x + i] = false
  return g
}
/** móvel do corredor ocupando tile (sem tapete e sem o que dá pra passar por cima) */
export function corredorSolid(a: Andar, skip?: number) {
  const g = grade(a.w, a.h, false)
  for (const o of a.corredor.objs) {
    const k = kd(o)
    if (o.id === skip || k.camada || k.passa) continue
    for (let j = 0; j < k.h; j++) for (let i = 0; i < k.w; i++) if (g[o.y + j]?.[o.x + i] !== undefined) g[o.y + j][o.x + i] = true
  }
  return g
}
/** tiles do corredor na frente de porta (não pode ter móvel) */
export function frentesCorredor(a: Andar) {
  const f = new Set<string>()
  for (const s of a.salas) for (const p of s.portas) for (const t of portaFora(s, p)) f.add(t.x + ',' + t.y)
  return f
}

/** motivo de o móvel não poder ficar no corredor, ou null */
export function checkCorredor(a: Andar, o: Obj): string | null {
  const k = kd(o)
  if (k.camada === 'parede') return 'Esse vai na parede de uma sala'
  const hall = corredorGrid(a)
  for (let j = 0; j < k.h; j++) for (let i = 0; i < k.w; i++) if (!hall[o.y + j]?.[o.x + i]) return 'Fora do corredor'
  if (k.camada === 'chao' || k.passa) return null
  const solid = corredorSolid(a, o.id), fr = frentesCorredor(a)
  for (let j = 0; j < k.h; j++) for (let i = 0; i < k.w; i++) {
    const x = o.x + i, y = o.y + j
    if (solid[y][x]) return 'Em cima de outro móvel'
    if (fr.has(x + ',' + y)) return 'Na frente da porta'
    if (x === a.entrada.x && y === a.entrada.y) return 'Em cima da entrada'
  }
  return null
}

/** grade andável do andar inteiro: corredor livre + miolo livre das salas + vão das portas */
export function walkGrid(a: Andar) {
  const g = corredorGrid(a), cs = corredorSolid(a)
  for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) if (cs[y][x]) g[y][x] = false
  for (const s of a.salas) {
    const solid = solidGrid(s)
    for (let j = 2; j <= s.h - 2; j++) for (let i = 1; i <= s.w - 2; i++) {
      const gx = s.x + i, gy = s.y + j
      if (g[gy]?.[gx] === undefined) continue
      g[gy][gx] = !solid[j][i] && !s.div[j][i]
    }
    for (const p of s.portas) for (const t of portaCelulas(s, p)) if (g[s.y + t.y]?.[s.x + t.x] !== undefined) g[s.y + t.y][s.x + t.x] = true
  }
  return g
}

/** tiles alcançáveis a pé a partir de (x, y) — chave y*w+x */
export function alcance(a: Andar, de = a.entrada, walk = walkGrid(a)) {
  const seen = new Set<number>()
  if (!walk[de.y]?.[de.x]) return seen
  const q: [number, number][] = [[de.x, de.y]]
  seen.add(de.y * a.w + de.x)
  while (q.length) {
    const [x, y] = q.shift()!
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy
      if (!walk[ny]?.[nx] || seen.has(ny * a.w + nx)) continue
      seen.add(ny * a.w + nx); q.push([nx, ny])
    }
  }
  return seen
}

/** caminho mais curto (lista de tiles), ou null — pros bonecos andarem no integrador */
export function caminho(a: Andar, de: { x: number; y: number }, ate: { x: number; y: number }, walk = walkGrid(a)) {
  const w = a.w, prev = new Map<number, number>(), ini = de.y * w + de.x, fim = ate.y * w + ate.x
  if (!walk[de.y]?.[de.x]) return null
  const q = [ini]; prev.set(ini, -1)
  while (q.length) {
    const c = q.shift()!
    if (c === fim) break
    const x = c % w, y = (c / w) | 0
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, n = ny * w + nx
      if (prev.has(n) || !(walk[ny]?.[nx] || n === fim)) continue
      prev.set(n, c); q.push(n)
    }
  }
  if (!prev.has(fim)) return null
  const out: { x: number; y: number }[] = []
  for (let c = fim; c !== -1; c = prev.get(c)!) out.unshift({ x: c % w, y: (c / w) | 0 })
  return out
}

/** assento de cada mesa em coordenada do andar */
export const assentosAndar = (a: Andar) => a.salas.flatMap(s => s.objs.filter(o => isDesk(o.k)).map(o => {
  const t = assento(o)
  return { sala: s, obj: o, x: s.x + t.x, y: s.y + t.y }
}))
