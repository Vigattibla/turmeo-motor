/**
 * Ponte com o Turmeo de hoje (v0): andar fixo de 4 vagas (2 em cima, 2 embaixo), sala 24×16,
 * layout em rooms.data, gente em profiles (dept + desk, chefia = mesa 12).
 * v0 → v1 pra abrir no motor; v1 → v0 pra gravar de volta enquanto o app não lê v1.
 * Sala estragada no banco volta pro layout de fábrica (igual ao parseSala do Turmeo).
 */
import { isDesk, KINDS, PISOS } from './catalogo'
import { decorarCorredor } from './gerador'
import { modelo } from './modelos'
import { grade, portaLivre } from './sala'
import { TOKENS_PADRAO } from '../render/tokens'
import { CHEFE, type Andar, type Doc, type Obj, type Pessoa, type Sala, type Setor } from './tipos'

export const V0 = { W: 24, H: 16, BOSS: 12, MAX: 12, HALL: 5 } as const
export type DeptV0 = { id: string; name: string; color: string; floor: number; slot: number; flag?: string | null; vendas?: boolean }
export type SalaV0 = { piso: string[][]; div: boolean[][]; objs: Obj[] }
export type PerfilV0 = { id: string; name: string; dept?: string; desk: number; rank?: number }
export type TurmeoV0 = { empresa?: { nome: string; logo?: string | null }; depts: DeptV0[]; rooms: { id: string; data: unknown }[]; profiles?: PerfilV0[] }

/** vaga do andar v0 → canto da sala no andar */
export const slotXY = (slot: number) => ({ x: (slot % 2) * V0.W, y: slot < 2 ? 0 : V0.H + V0.HALL })
const xySlot = (x: number, y: number) => {
  const col = x / V0.W, top = y === 0, bot = y === V0.H + V0.HALL
  return (col === 0 || col === 1) && (top || bot) ? (top ? 0 : 2) + col : -1
}

/* ---------- layout de fábrica (cópia do original() do Turmeo) ---------- */
export function originalV0(baia = false): SalaV0 {
  const piso = grade(V0.W, V0.H, 'madeira'), div = grade(V0.W, V0.H, false)
  let id = 1
  const objs: Obj[] = []
  const add = (k: string, x: number, y: number, d?: number) => objs.push(d === undefined ? { id: id++, k, x, y } : { id: id++, k, x, y, d })
  add('tapete-chefe', 1, 7)
  for (let i = 0; i < V0.MAX; i++) {
    const tx = baia ? 9 + (i % 6) * 2 : 7 + (i % 4) * 4, ty = baia ? 5 + Math.floor(i / 6) * 5 : 4 + Math.floor(i / 4) * 4
    add('mesa', tx, ty, i)
  }
  add('mesa-chefe', 2, 9, V0.BOSS)
  if (baia) { add('painel-quartos', 2, 5); add('painel-placar', 2, 13) }
  for (const [x, y] of [[1, 2], [22, 2], [1, 14], [22, 14], [5, 14], [18, 14]]) add('planta', x, y)
  add('estante', 2, 2); add('arquivo', 19, 2); add('impressora', 20, 2); add('bebedouro', 21, 2)
  for (const x of [3, 17]) add('janela', x, 0)
  add('quadro-branco', 10, 0); add('quadro-paisagem', 1, 0); add('cartaz', 6, 0); add('foto-piscina', 7, 0)
  add('calendario', 13, 0); add('relogio', 14, 0); add('arte', 15, 0); add('tv', 20, 0)
  return { piso, div, objs }
}

/** confere o rooms.data; qualquer coisa estranha = layout de fábrica */
export function lerSalaV0(data: unknown, baia = false): SalaV0 {
  try {
    const s = data as SalaV0
    const ok = (g: unknown, f: (v: unknown) => boolean) => Array.isArray(g) && g.length === V0.H && g.every(r => Array.isArray(r) && r.length === V0.W && r.every(f))
    if (!s || !ok(s.piso, v => typeof v === 'string' && v in PISOS) || !ok(s.div, v => typeof v === 'boolean') || !Array.isArray(s.objs)) return originalV0(baia)
    const ids = new Set<number>(), ds = new Set<number>(), objs: Obj[] = []
    for (const o of s.objs) {
      const k = o && KINDS[o.k]
      if (!k || !Number.isInteger(o.id) || ids.has(o.id) || !Number.isInteger(o.x) || !Number.isInteger(o.y)) continue
      if (o.x < 0 || o.y < 0 || o.x + k.w > V0.W || o.y + k.h > V0.H) continue
      let d: number | undefined
      if (isDesk(o.k)) {
        d = o.k === 'mesa-chefe' ? V0.BOSS : o.d
        if (d === undefined || !Number.isInteger(d) || ds.has(d) || (o.k === 'mesa' && (d < 0 || d >= V0.MAX))) continue
        ds.add(d)
      }
      ids.add(o.id)
      objs.push(d === undefined ? { id: o.id, k: o.k, x: o.x, y: o.y } : { id: o.id, k: o.k, x: o.x, y: o.y, d })
    }
    return { piso: s.piso.map(r => [...r]), div: s.div.map(r => [...r]), objs }
  } catch { return originalV0(baia) }
}

const d0to1 = (d: number) => d === V0.BOSS ? CHEFE : d
const d1to0 = (d: number) => d === CHEFE ? V0.BOSS : d

/** v0 → documento do motor */
export function deV0(v: TurmeoV0, opts: { modelo?: string; id?: string } = {}): Doc {
  const m = modelo(opts.modelo ?? 'resort')
  const perfis = v.profiles ?? []
  const chefia = (id: string) => lerSalaV0(v.rooms.find(r => r.id === id)?.data, false).objs.some(o => o.k === 'mesa-chefe')
  const setores: Setor[] = v.depts.map(dp => ({
    id: dp.id, nome: dp.name, cor: dp.color, emblema: dp.flag ?? null, tipo: dp.vendas ? 'vendas' : 'setor',
    pessoas: perfis.filter(p => p.dept === dp.id).length, lider: chefia(dp.id),
  }))
  const andares = [...new Set(v.depts.map(d => d.floor))].sort((a, b) => a - b).map((fl, i): Andar => {
    const salas = v.depts.filter(d => d.floor === fl && d.slot >= 0 && d.slot < 4).map((dp): Sala => {
      const raw = lerSalaV0(v.rooms.find(r => r.id === dp.id)?.data, !!dp.vendas)
      const { x, y } = slotXY(dp.slot), top = dp.slot < 2
      const vid = top ? 's' as const : 'n' as const
      // parede de vidro em cima: janela some (vidro já é janela)
      const objs = raw.objs.filter(o => top || o.k !== 'janela').map(o => o.d === undefined ? o : { ...o, d: d0to1(o.d) })
      const s: Sala = { id: dp.id, nome: dp.name, tipo: dp.vendas ? 'vendas' : 'setor', setor: dp.id, x, y, w: V0.W, h: V0.H, piso: raw.piso, div: raw.div, objs, portas: [], vidro: [vid] }
      const pos = portaLivre(s, vid) ?? V0.W / 2 - 1
      return { ...s, portas: [{ lado: vid, pos }] }
    })
    const a: Andar = { id: `andar-${fl}`, nome: `${i + 1}º andar`, w: V0.W * 2, h: V0.H * 2 + V0.HALL, salas, corredor: { piso: m.corredor, objs: [] }, entrada: { x: 2, y: V0.H + 2 } }
    return { ...a, corredor: decorarCorredor(a, m, 1) }
  })
  const salas = andares.flatMap(a => a.salas)
  const pessoas: Pessoa[] = perfis.map(p => {
    const s = salas.find(x => x.id === p.dept)
    const d = d0to1(p.desk)
    const tem = s?.objs.some(o => isDesk(o.k) && o.d === d)
    return { id: p.id, nome: p.name, setor: p.dept ?? '', ...(p.desk === V0.BOSS ? { chefe: true } : {}), mesa: s && tem ? { sala: s.id, d } : null }
  })
  return {
    v: 1, id: opts.id ?? 'turmeo', empresa: v.empresa ?? { nome: 'Turmeo' }, tema: { ...TOKENS_PADRAO, ...m.tema }, modelo: m.id, seed: 1,
    setores, pessoas, andares: andares.length ? andares : [],
  }
}

/** v1 → v0. Só sai o que cabe no Turmeo de hoje (sala 24×16 numa das 4 vagas); o resto vai pros avisos */
export function paraV0(doc: Doc): { v0: TurmeoV0; avisos: string[] } {
  const avisos: string[] = [], depts: DeptV0[] = [], rooms: TurmeoV0['rooms'] = []
  doc.andares.forEach((a, fl) => {
    for (const s of a.salas) {
      const slot = xySlot(s.x, s.y)
      const st = doc.setores.find(x => x.id === s.setor)
      if (s.w !== V0.W || s.h !== V0.H || slot < 0) { avisos.push(`${s.nome}: tamanho ou posição fora das 4 vagas do Turmeo`); continue }
      if (!st) { avisos.push(`${s.nome}: sala sem setor não existe no Turmeo`); continue }
      const objs = s.objs.filter(o => o.d === undefined || (o.k === 'mesa' ? o.d >= 0 && o.d < V0.MAX : o.d === CHEFE)).map(o => o.d === undefined ? o : { ...o, d: d1to0(o.d) })
      if (objs.length < s.objs.length) avisos.push(`${s.nome}: mesas além da 12ª ficam de fora`)
      if (s.portas.length !== 1) avisos.push(`${s.nome}: o Turmeo calcula a porta sozinho`)
      const sala: SalaV0 = { piso: s.piso, div: s.div, objs }
      depts.push({ id: s.id, name: st.nome, color: st.cor, floor: fl, slot, flag: st.emblema ?? null, vendas: s.tipo === 'vendas' })
      rooms.push({ id: s.id, data: sala })
    }
  })
  const ids = new Set(depts.map(d => d.id))
  const profiles: PerfilV0[] = doc.pessoas.filter(p => p.mesa && ids.has(p.mesa.sala)).map(p => ({ id: p.id, name: p.nome, dept: p.mesa!.sala, desk: d1to0(p.mesa!.d) }))
  return { v0: { empresa: doc.empresa, depts, rooms, profiles }, avisos }
}
