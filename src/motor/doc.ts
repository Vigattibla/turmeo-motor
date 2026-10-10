/**
 * Arquivo do motor: criar, abrir (com migração de versão) e exportar.
 * abrir() nunca devolve documento quebrado: ou sai um Doc v1 que passa no esquema, ou lança Recusa com o motivo.
 */
import { TOKENS_PADRAO } from '../render/tokens'
import { PISOS } from './catalogo'
import { Recusa } from './comandos'
import { ALTURA, D, decorarCorredor } from './gerador'
import { deV0, type TurmeoV0 } from './migrar'
import { modelo } from './modelos'
import { uid } from './rng'
import type { Andar, Doc } from './tipos'
import { validar } from './validar'

export const VERSAO = 1 as const

/** documento vazio: um andar só com corredor */
export function novoDoc(p: { nome: string; modelo?: string; w?: number } = { nome: 'Nova empresa' }): Doc {
  const m = modelo(p.modelo ?? 'escritorio')
  const a: Andar = { id: 'andar-1', nome: '1º andar', w: p.w ?? 48, h: ALTURA, salas: [], corredor: { piso: m.corredor, objs: [] }, entrada: { x: 2, y: D + 2 } }
  return { v: VERSAO, id: uid('doc-'), empresa: { nome: p.nome }, tema: { ...TOKENS_PADRAO, ...m.tema }, modelo: m.id, seed: 1, setores: [], pessoas: [], andares: [{ ...a, corredor: decorarCorredor(a, m, 1) }] }
}

/* ---------- migrações: cada passo leva da versão n pra n+1 ---------- */
type Bruto = Record<string, unknown>
const MIGRAR: Record<number, (d: Bruto) => Bruto> = {
  // 0 = formato do Turmeo de hoje (depts/rooms/profiles)
  0: d => deV0(d as unknown as TurmeoV0) as unknown as Bruto,
}
const versaoDe = (d: Bruto) => typeof d.v === 'number' ? d.v : Array.isArray(d.depts) ? 0 : -1

/* ---------- esquema mínimo (o validar() cuida do resto: sobreposição, caminho, portas) ---------- */
const eStr = (v: unknown) => typeof v === 'string'
const eInt = (v: unknown) => Number.isInteger(v)
const eArr = Array.isArray
function esquema(d: Bruto): string | null {
  if (!eStr(d.id) || !d.empresa || !eStr((d.empresa as Bruto).nome)) return 'falta id ou nome da empresa'
  if (!eArr(d.setores) || !eArr(d.pessoas) || !eArr(d.andares) || !(d.andares as unknown[]).length) return 'faltam setores, pessoas ou andares'
  for (const a of d.andares as Bruto[]) {
    if (!eStr(a.id) || !eInt(a.w) || !eInt(a.h) || !eArr(a.salas) || !a.corredor || !a.entrada) return `andar ${String(a.id)} incompleto`
    for (const s of a.salas as Bruto[]) {
      if (!eStr(s.id) || !eStr(s.nome) || ![s.x, s.y, s.w, s.h].every(eInt)) return `sala ${String(s.id)} sem posição ou tamanho`
      if (!eArr(s.piso) || !eArr(s.div) || !eArr(s.objs) || !eArr(s.portas)) return `sala ${String(s.nome)} incompleta`
      if ((s.piso as unknown[][]).some(r => !eArr(r) || r.some(t => !eStr(t) || !((t as string) in PISOS)))) return `sala ${String(s.nome)}: piso desconhecido`
      for (const o of s.objs as Bruto[]) if (!eInt(o.id) || !eStr(o.k) || !eInt(o.x) || !eInt(o.y)) return `sala ${String(s.nome)}: móvel inválido`
    }
  }
  return null
}

/** abre texto ou objeto: migra até a versão atual, completa o tema e confere */
export function abrir(entrada: string | unknown): { doc: Doc; problemas: ReturnType<typeof validar>; migrado: boolean } {
  let d: Bruto
  try { d = (typeof entrada === 'string' ? JSON.parse(entrada) : entrada) as Bruto } catch { throw new Recusa('arquivo não é JSON') }
  if (!d || typeof d !== 'object') throw new Recusa('arquivo vazio')
  let v = versaoDe(d)
  if (v < 0) throw new Recusa('formato desconhecido')
  if (v > VERSAO) throw new Recusa(`arquivo da versão ${v}; este motor lê até a ${VERSAO}`)
  const migrado = v < VERSAO
  while (v < VERSAO) { d = MIGRAR[v](d); v++ }
  const erro = esquema(d)
  if (erro) throw new Recusa(erro)
  const doc = { ...(d as unknown as Doc), tema: { ...TOKENS_PADRAO, ...(d.tema as object) }, seed: eInt(d.seed) ? d.seed as number : 1, modelo: eStr(d.modelo) ? d.modelo as string : 'escritorio' }
  return { doc, problemas: validar(doc), migrado }
}

export const exportar = (doc: Doc) => JSON.stringify(doc)
