/**
 * Gerador: (entrada, semente) → documento pronto. Função pura: mesma entrada e semente, mesmo layout.
 *
 * Andar em "espinha": faixa de salas em cima, corredor de 5 linhas, faixa de salas embaixo.
 * Cada sala vai pra faixa mais curta; passou da largura máxima, abre outro andar.
 * Sobra na faixa curta vira sala livre (lounge) ou alarga a última sala.
 */
import { TOKENS_PADRAO } from '../render/tokens'
import { checkCorredor } from './andar'
import { CAP, largura, mobiliar } from './mobiliar'
import { modelo as achaModelo, type Modelo } from './modelos'
import { autoAtribuir } from './pessoas'
import { hash, mulberry32, pick, uid } from './rng'
import { novaSala, redimensionar } from './sala'
import type { Andar, Corredor, Doc, Lado, Obj, Pessoa, Problema, Sala, Setor, TipoSala } from './tipos'
import { erros, validar } from './validar'

/** altura da sala, linhas do corredor e altura do andar */
export const D = 16, CORR = 5, ALTURA = D * 2 + CORR
export const MAX_LARGURA = 80

export type Entrada = {
  id?: string
  empresa: { nome: string; logo?: string | null }
  modelo: string
  setores: Setor[]
  pessoas?: Pessoa[]
  /** salas comuns (pode repetir: 2× reunião) */ extras?: TipoSala[]
  tema?: Partial<Doc['tema']>
  maxLargura?: number
}
export type Resultado = { doc: Doc; problemas: Problema[]; seed: number }

const NOMES: Record<TipoSala, string> = { setor: 'Sala', vendas: 'Vendas', reuniao: 'Reunião', copa: 'Copa', recepcao: 'Recepção', foco: 'Foco', livre: 'Lounge' }
const LETRA = 'ABCDEFGHIJ'

type Item = { id: string; nome: string; tipo: TipoSala; setor?: string; w: number; n: number; lider: boolean; fixa?: Sala; faixa?: 'cima' | 'baixo' }

/** setores e extras viram a lista de salas a empacotar */
export function planejar(e: Entrada): Item[] {
  const itens: Item[] = []
  const extras = e.extras ?? []
  const conta: Record<string, number> = {}
  const extra = (t: TipoSala) => { conta[t] = (conta[t] ?? 0) + 1; const k = conta[t]; return { id: `sala-${t}-${k}`, nome: NOMES[t] + (extras.filter(x => x === t).length > 1 ? ' ' + k : ''), tipo: t, w: largura(t), n: t === 'foco' ? 4 : 0, lider: false } }
  for (const t of extras) if (t === 'recepcao') itens.push(extra(t))
  for (const st of e.setores) {
    const tipo: TipoSala = st.tipo === 'vendas' ? 'vendas' : 'setor'
    const nomeados = (e.pessoas ?? []).filter(p => p.setor === st.id).length
    const total = Math.max(1, st.pessoas, nomeados)
    const lider = !!st.lider
    const mesas = Math.max(1, total - (lider ? 1 : 0)), cap = CAP[tipo]!
    const partes = Math.ceil(mesas / cap)
    for (let k = 0; k < partes; k++) {
      const n = Math.floor(mesas / partes) + (k < mesas % partes ? 1 : 0)
      itens.push({ id: `sala-${st.id}${k ? '-' + (k + 1) : ''}`, nome: st.nome + (partes > 1 ? ' ' + LETRA[k] : ''), tipo, setor: st.id, w: largura(tipo, n), n, lider: lider && k === 0 })
    }
  }
  for (const t of extras) if (t !== 'recepcao') itens.push(extra(t))
  return itens
}

type Faixa = { itens: Item[]; w: number }
type Pac = { cima: Faixa; baixo: Faixa }

/** empacota: cada sala na faixa mais curta; não coube, andar novo */
export function empacotar(itens: Item[], max = MAX_LARGURA): Pac[] {
  const andares: Pac[] = [{ cima: { itens: [], w: 0 }, baixo: { itens: [], w: 0 } }]
  for (const it of itens) {
    const w = it.fixa?.w ?? it.w
    let a = andares[andares.length - 1]
    const ordem: ('cima' | 'baixo')[] = it.faixa ? [it.faixa] : a.cima.w <= a.baixo.w ? ['cima', 'baixo'] : ['baixo', 'cima']
    let lado = ordem.find(l => a[l].w + w <= max)
    if (!lado) { a = { cima: { itens: [], w: 0 }, baixo: { itens: [], w: 0 } }; andares.push(a); lado = ordem[0] }
    a[lado].itens.push(it); a[lado].w += w
  }
  return andares
}

function portaPadrao(s: Sala, lado: Lado): Sala {
  return { ...s, portas: [{ lado, pos: Math.floor(s.w / 2) - 1 }], vidro: [lado] }
}

/** monta o corredor: pontas, bancos encostados no vidro de cima, canteiros embaixo, passadeira */
export function decorarCorredor(a: Andar, m: Modelo, seed: number): Corredor {
  const rng = mulberry32(hash(seed, a.id, 'corredor'))
  const cor: Corredor = { piso: m.corredor, objs: [], faixa: { x: 3, y: D + 1, w: Math.max(1, a.w - 6), h: CORR - 2 } }
  const tmp: Andar = { ...a, corredor: cor }
  const poe = (k: string, x: number, y: number) => {
    const o: Obj = { id: cor.objs.length + 1, k, x, y }
    if (checkCorredor(tmp, o)) return false
    cor.objs.push(o); return true
  }
  const y0 = D, y1 = D + CORR - 1
  for (const [x, y] of [[1, y0], [a.w - 2, y0], [1, y1], [a.w - 2, y1]]) poe(m.decorCorredor.pontas, x, y)
  for (let x = 5; x < a.w - 5; x += 7 + Math.floor(rng() * 4)) poe(pick(rng, m.decorCorredor.cima), x, y0) || poe('planta', x, y0)
  for (let x = 8; x < a.w - 5; x += 8 + Math.floor(rng() * 4)) poe(pick(rng, m.decorCorredor.baixo), x, y1) || poe('planta', x, y1)
  return cor
}

/** um andar a partir do pacote */
function montarAndar(p: Pac, idx: number, m: Modelo, seed: number): Andar {
  const W = Math.max(24, p.cima.w, p.baixo.w)
  const id = `andar-${idx + 1}`
  const salas: Sala[] = []
  for (const lado of ['cima', 'baixo'] as const) {
    const f = p[lado], y = lado === 'cima' ? 0 : D + CORR, porta: Lado = lado === 'cima' ? 's' : 'n'
    const its = [...f.itens]
    const sobra = W - f.w
    if (sobra >= 10) its.push({ id: `sala-livre-${idx + 1}-${lado}`, nome: 'Lounge', tipo: 'livre', w: sobra, n: 0, lider: false })
    let x = 0
    its.forEach((it, i) => {
      const extra = sobra > 0 && sobra < 10 && i === its.length - 1 && !it.fixa ? sobra : 0
      let s: Sala
      if (it.fixa) {
        // travada: conteúdo intacto, só muda de lugar
        s = { ...it.fixa, x, y }
      } else {
        const w = it.w + extra
        s = novaSala({ id: it.id, nome: it.nome, tipo: it.tipo, setor: it.setor, x, y, w, h: D, piso: m.pisos[it.tipo] ?? m.pisos.padrao })
        s = portaPadrao(s, porta)
        s = mobiliar(s, m, mulberry32(hash(seed, it.id)), it.n, it.lider)
      }
      salas.push(s); x += s.w
    })
  }
  const a: Andar = { id, nome: `${idx + 1}º andar`, w: W, h: ALTURA, salas, corredor: { piso: m.corredor, objs: [] }, entrada: { x: 2, y: D + 2 } }
  return { ...a, corredor: decorarCorredor(a, m, seed) }
}

function montar(e: Entrada, seed: number, travadas: Sala[] = []): Doc {
  const m = achaModelo(e.modelo)
  const itens = planejar(e)
  // salas travadas entram no lugar do item de mesmo id (ou no fim), na mesma faixa de antes
  for (const s of travadas) {
    const it: Item = { id: s.id, nome: s.nome, tipo: s.tipo, setor: s.setor, w: s.w, n: 0, lider: false, fixa: s, faixa: s.y === 0 ? 'cima' : 'baixo' }
    const i = itens.findIndex(x => x.id === s.id)
    if (i >= 0) itens[i] = it; else itens.push(it)
  }
  const andares = empacotar(itens, e.maxLargura ?? MAX_LARGURA).map((p, i) => montarAndar(p, i, m, seed))
  const doc: Doc = {
    v: 1, id: e.id ?? uid('doc-'), empresa: e.empresa, tema: { ...TOKENS_PADRAO, ...m.tema, ...e.tema }, modelo: m.id, seed,
    setores: e.setores, pessoas: e.pessoas ?? [], andares,
  }
  return autoAtribuir(doc)
}

/** gera; se sair com erro, tenta as próximas sementes (até 5) e fica com o melhor */
export function gerar(e: Entrada, seed = 1, travadas: Sala[] = []): Resultado {
  let melhor: Resultado | null = null
  for (let k = 0; k < 5; k++) {
    const doc = montar(e, seed + k, travadas), problemas = validar(doc)
    const r = { doc, problemas, seed: seed + k }
    if (!erros(problemas).length) return r
    if (!melhor || erros(problemas).length < erros(melhor.problemas).length) melhor = r
  }
  return melhor!
}

/** gera de novo a partir do documento (mesmos setores e pessoas), mantendo as salas travadas */
export function regerar(doc: Doc, seed = doc.seed + 1, extras?: TipoSala[]): Resultado {
  const salas = doc.andares.flatMap(a => a.salas)
  // extras = salas sem setor, menos o lounge de sobra que o próprio gerador cria
  const ex = extras ?? salas.filter(s => !s.setor && !/^sala-livre-\d+-(cima|baixo)$/.test(s.id)).map(s => s.tipo)
  const travadas = salas.filter(s => s.travada)
  const r = gerar({ id: doc.id, empresa: doc.empresa, modelo: doc.modelo, setores: doc.setores, pessoas: doc.pessoas, extras: ex, tema: doc.tema }, seed, travadas)
  return r
}

/** remobilia uma sala do jeito do gerador (mantém portas, piso e tamanho) */
export function remobiliar(doc: Doc, salaId: string, seed = doc.seed): Sala | null {
  const s = doc.andares.flatMap(a => a.salas).find(x => x.id === salaId)
  if (!s) return null
  const st = doc.setores.find(x => x.id === s.setor)
  const total = st ? Math.max(1, st.pessoas, doc.pessoas.filter(p => p.setor === st.id).length) : 0
  const lider = !!st?.lider
  const n = s.tipo === 'foco' ? 4 : Math.min(CAP[s.tipo] ?? 0, Math.max(0, total - (lider ? 1 : 0)))
  return mobiliar(s, achaModelo(doc.modelo), mulberry32(hash(seed, s.id, 'remobiliar')), n, lider)
}
export { redimensionar }
