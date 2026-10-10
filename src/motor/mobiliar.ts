/** Mobília automática por tipo de sala. Tudo passa pelo check(): o que não cabe, não entra. */
import { KINDS } from './catalogo'
import type { Modelo } from './modelos'
import { check, kd, proximoId, reach } from './sala'
import { pick, shuffle, type Rng } from './rng'
import { CHEFE, type Obj, type Sala, type TipoSala } from './tipos'

/** quantas mesas a sala do tipo comporta (sem contar a chefia) */
export const CAP: Partial<Record<TipoSala, number>> = { setor: 15, vendas: 12, foco: 4 }
/** largura padrão de cada tipo (setor depende de quantas pessoas) */
export function largura(tipo: TipoSala, n = 0) {
  if (tipo === 'setor') return 8 + 4 * Math.max(2, Math.min(5, Math.ceil(n / 3)))
  return { vendas: 22, reuniao: 16, copa: 14, recepcao: 14, foco: 10, livre: 12 }[tipo]
}

type Ctx = { s: Sala; m: Modelo; rng: Rng }
/** põe se couber (e se não deixar mesa sem caminho); devolve se entrou */
function poe(c: Ctx, k: string, x: number, y: number, d?: number) {
  if (!KINDS[k]) return false
  const o: Obj = d === undefined ? { id: proximoId(c.s.objs), k, x, y } : { id: proximoId(c.s.objs), k, x, y, d }
  if (check(c.s, o)) return false
  const s = { ...c.s, objs: [...c.s.objs, o] }
  if (!kd(o).camada && !kd(o).passa && reach(s)) return false
  c.s = s
  return true
}
/** item de parede: tenta as posições preferidas e depois varre a parede */
function parede(c: Ctx, k: string, xs: number[] = []) {
  for (const x of xs) if (poe(c, k, x, 0)) return true
  for (let x = 1; x < c.s.w - 1; x++) if (poe(c, k, x, 0)) return true
  return false
}
/** enche o resto da parede de cima com a arte do modelo, com respiro */
function enfeitarParede(c: Ctx) {
  const arte = shuffle(c.rng, c.m.arteParede)
  let x = 1 + Math.floor(c.rng() * 2), i = 0
  while (x < c.s.w - 2 && i < 40) {
    const k = arte[i++ % arte.length]
    if (poe(c, k, x, 0)) x += kd({ id: 0, k, x, y: 0 }).w + 1 + (c.rng() < 0.35 ? 1 : 0)
    else x++
  }
}
/** plantas e enfeites do modelo pelos cantos e bordas */
function enfeitarBordas(c: Ctx, cantos = true) {
  const { w, h } = c.s
  if (cantos) for (const [x, y] of [[1, 2], [w - 2, 2], [1, h - 2], [w - 2, h - 2]]) poe(c, c.rng() < 0.75 ? 'planta' : pick(c.rng, c.m.decorSala), x, y)
}

function setor(c: Ctx, n: number, lider: boolean) {
  const { w, h } = c.s, cols = Math.max(2, Math.min(5, Math.ceil(n / 3)))
  if (lider) { poe(c, 'tapete-chefe', 1, 7); poe(c, 'mesa-chefe', 2, 9, CHEFE) }
  for (let i = 0; i < n; i++) poe(c, 'mesa', 7 + (i % cols) * 4, 4 + Math.floor(i / cols) * 4, i)
  parede(c, 'quadro-branco', [Math.floor(w / 2) - 2, Math.floor(w / 2) + 1])
  if (!c.s.vidro?.includes('n')) { parede(c, 'janela', [3]); parede(c, 'janela', [w - 6]) }
  poe(c, 'estante', 2, 2)
  const fila = shuffle(c.rng, c.m.decorSala.filter(k => k !== 'planta'))
  fila.slice(0, 3).forEach((k, i) => poe(c, k, w - 5 + i, 2))
  enfeitarBordas(c)
  if (!lider) { poe(c, 'sofa', 1, 10) || poe(c, 'arquivo', 2, 9); poe(c, 'planta', 5, h - 2) }
  else poe(c, 'planta', 5, h - 2)
  enfeitarParede(c)
}

function vendas(c: Ctx, n: number, lider: boolean) {
  const { w } = c.s, x0 = w - 2 - 12
  if (lider) { poe(c, 'tapete-chefe', 1, 7); poe(c, 'mesa-chefe', 2, 9, CHEFE) }
  for (let i = 0; i < n; i++) poe(c, 'mesa', x0 + (i % 6) * 2, 5 + Math.floor(i / 6) * 5, i)
  if (c.m.painelQuartos) poe(c, 'painel-quartos', 2, 5)
  poe(c, 'painel-placar', 2, 13)
  parede(c, 'tv', [x0 + 5]); parede(c, 'quadro-branco', [x0 - 4])
  if (!c.s.vidro?.includes('n')) parede(c, 'janela', [w - 4])
  enfeitarBordas(c)
  enfeitarParede(c)
}

function reuniao(c: Ctx) {
  const { w, h } = c.s, mx = Math.floor((w - 5) / 2), my = Math.floor((h - 4) / 2) - 1
  poe(c, 'tapete-reuniao', mx - 1, my - 2)
  poe(c, 'mesa-reuniao', mx, my)
  for (let i = 1; i < 4; i++) { poe(c, 'cadeira-reuniao', mx + i, my - 1); poe(c, 'cadeira-reuniao', mx + i, my + 4) }
  for (const y of [my + 1, my + 2]) { poe(c, 'cadeira-reuniao', mx - 1, y); poe(c, 'cadeira-reuniao', mx + 5, y) }
  parede(c, 'tv', [Math.floor(w / 2) - 1, Math.floor(w / 2) + 2]); parede(c, 'quadro-branco', [2, w - 5])
  enfeitarBordas(c)
  enfeitarParede(c)
}

function copa(c: Ctx) {
  const { w, h } = c.s
  poe(c, 'espresso', 2, 2); poe(c, 'balcao', 3, 2); poe(c, 'bebedouro', 6, 2); poe(c, 'vitrine-doces', 8, 2)
  for (const [x, y] of [[3, 7], [w - 6, 7], [3, 11], [w - 6, 11]]) { if (poe(c, 'bistro', x, y)) { poe(c, 'cadeira-reuniao', x - 1, y); poe(c, 'cadeira-reuniao', x + 2, y) } }
  poe(c, 'sofa', Math.floor(w / 2) - 2, h - 3)
  parede(c, 'menu-giz', [3]); if (!c.s.vidro?.includes('n')) parede(c, 'janela', [w - 5])
  enfeitarBordas(c)
  enfeitarParede(c)
}

function recepcao(c: Ctx) {
  const { w, h } = c.s
  poe(c, 'tapete-reuniao', Math.floor((w - 8) / 2), 4)
  poe(c, 'balcao', Math.floor((w - 3) / 2), 7)
  poe(c, 'cadeira-reuniao', Math.floor((w - 3) / 2) + 1, 6)
  poe(c, 'sofa', 2, h - 4); poe(c, 'sofa', w - 6, h - 4)
  poe(c, 'estante', w - 5, 2)
  parede(c, 'quadro-paisagem', [Math.floor(w / 2) - 1]); parede(c, 'relogio', [2])
  enfeitarBordas(c)
  enfeitarParede(c)
}

function foco(c: Ctx, n: number) {
  const { w } = c.s
  const lugares = [[2, 5], [w - 4, 5], [2, 10], [w - 4, 10]]
  for (let i = 0; i < Math.min(n || 4, lugares.length); i++) poe(c, 'mesa', lugares[i][0], lugares[i][1], i)
  poe(c, 'estante', Math.floor((w - 3) / 2), 2)
  if (!c.s.vidro?.includes('n')) parede(c, 'janela', [2])
  enfeitarBordas(c)
  enfeitarParede(c)
}

function livre(c: Ctx) {
  const { w, h } = c.s
  poe(c, c.m.id === 'startup' ? 'tapete-gamer' : 'tapete-reuniao', Math.floor((w - 8) / 2), 5)
  poe(c, 'sofa', 2, 4); poe(c, 'sofa', 2, h - 4)
  if (w >= 12) { poe(c, 'bistro', w - 5, 7); poe(c, 'pufe', w - 3, 10); poe(c, 'pufe', w - 5, 10) }
  const decor = shuffle(c.rng, c.m.decorSala)
  decor.forEach((k, i) => poe(c, k, 2 + i * 3, 2))
  enfeitarBordas(c)
  enfeitarParede(c)
}

/** apaga os móveis e mobilia de novo (portas e piso ficam) */
export function mobiliar(s0: Sala, m: Modelo, rng: Rng, n = 0, lider = false): Sala {
  const c: Ctx = { s: { ...s0, objs: [] }, m, rng }
  switch (s0.tipo) {
    case 'setor': setor(c, n, lider); break
    case 'vendas': vendas(c, n, lider); break
    case 'reuniao': reuniao(c); break
    case 'copa': copa(c); break
    case 'recepcao': recepcao(c); break
    case 'foco': foco(c, n); break
    case 'livre': livre(c); break
  }
  return c.s
}
