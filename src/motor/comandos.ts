/**
 * Toda mudança no documento é um comando puro (doc → doc novo). O histórico guarda fotos imutáveis:
 * desfazer/refazer é trocar de foto. Arrastar gera muitos comandos com a mesma chave: viram um passo só.
 * Comando que não pode acontecer lança Recusa com o motivo (o editor mostra e não muda nada).
 */
import { checkCorredor, sobrepoe } from './andar'
import { isDesk } from './catalogo'
import { autoAtribuir } from './pessoas'
import { uid } from './rng'
import { check, dentro, frentes, kd, novaSala, portaValida, proximaMesa, proximoId, reach, redimensionar } from './sala'
import type { Andar, Doc, Lado, Obj, Pessoa, Porta, Sala, Setor, TipoSala } from './tipos'

export type Cmd = (d: Doc) => Doc
export class Recusa extends Error {}
const recusa = (msg: string): never => { throw new Recusa(msg) }

/* ---------- histórico ---------- */
export class Historico {
  private passado: Doc[] = []
  private futuro: Doc[] = []
  private chave: string | null = null
  private quando = 0
  private ouvintes = new Set<(d: Doc) => void>()
  constructor(public doc: Doc, private limite = 200, private juntarMs = 800) {}

  /** aplica; devolve o motivo da recusa ou null. Mesma chave em menos de 800 ms = mesmo passo de desfazer */
  aplicar(cmd: Cmd, chave?: string): string | null {
    let novo: Doc
    try { novo = cmd(this.doc) } catch (e) { if (e instanceof Recusa) return e.message; throw e }
    if (novo === this.doc) return null
    const agora = Date.now()
    const junta = chave && chave === this.chave && agora - this.quando < this.juntarMs
    if (!junta) { this.passado.push(this.doc); if (this.passado.length > this.limite) this.passado.shift() }
    this.futuro = []; this.chave = chave ?? null; this.quando = agora
    this.trocar(novo)
    return null
  }
  /** fecha o passo atual (ex.: soltou o mouse) */
  selar() { this.chave = null }
  desfazer() { const d = this.passado.pop(); if (!d) return false; this.futuro.push(this.doc); this.chave = null; this.trocar(d); return true }
  refazer() { const d = this.futuro.pop(); if (!d) return false; this.passado.push(this.doc); this.chave = null; this.trocar(d); return true }
  get podeDesfazer() { return this.passado.length > 0 }
  get podeRefazer() { return this.futuro.length > 0 }
  /** troca o documento inteiro sem histórico (abrir arquivo) */
  zerar(d: Doc) { this.passado = []; this.futuro = []; this.chave = null; this.trocar(d) }
  ouvir(f: (d: Doc) => void) { this.ouvintes.add(f); return () => { this.ouvintes.delete(f) } }
  private trocar(d: Doc) { this.doc = d; for (const f of this.ouvintes) f(d) }
}

/* ---------- ajudantes ---------- */
export const todasSalas = (d: Doc) => d.andares.flatMap(a => a.salas)
export const acharSala = (d: Doc, id: string) => {
  for (const a of d.andares) { const s = a.salas.find(x => x.id === id); if (s) return { a, s } }
  return null
}
const comAndar = (d: Doc, id: string, f: (a: Andar) => Andar): Doc => {
  if (!d.andares.some(a => a.id === id)) recusa('Andar não existe')
  return { ...d, andares: d.andares.map(a => a.id === id ? f(a) : a) }
}
const comSala = (d: Doc, id: string, f: (s: Sala, a: Andar) => Sala): Doc => {
  const achou = acharSala(d, id) ?? recusa('Sala não existe')
  return comAndar(d, achou.a.id, a => ({ ...a, salas: a.salas.map(s => s.id === id ? f(s, a) : s) }))
}
const dono = (d: Doc, sala: string) => (n: number) => d.pessoas.find(p => p.mesa?.sala === sala && p.mesa.d === n)?.nome ?? null
/** confere o móvel e o caminho até as mesas; recusa com o motivo */
function conferir(d: Doc, s: Sala, o: Obj) {
  const why = check(s, o, dono(d, s.id))
  if (why) recusa(why)
  const depois = { ...s, objs: s.objs.some(x => x.id === o.id) ? s.objs.map(x => x.id === o.id ? o : x) : [...s.objs, o] }
  const r = !kd(o).camada && !kd(o).passa ? reach(depois, dono(d, s.id)) : null
  if (r) recusa(r)
  return depois
}
/** solta quem sentava em mesas que não existem mais na sala */
function soltarPessoas(d: Doc, salaId: string, objs?: Obj[]): Pessoa[] {
  return d.pessoas.map(p => {
    if (p.mesa?.sala !== salaId) return p
    if (objs && objs.some(o => isDesk(o.k) && o.d === p.mesa!.d)) return p
    return { ...p, mesa: null }
  })
}

/* ---------- móveis da sala ---------- */
export const objAdd = (salaId: string, o: { k: string; x: number; y: number; d?: number }, chefia = false): Cmd => d => {
  const achou = acharSala(d, salaId) ?? recusa('Sala não existe')
  const s = achou.s
  const novo: Obj = { id: proximoId(s.objs), k: o.k, x: o.x, y: o.y }
  if (isDesk(o.k)) novo.d = o.d ?? proximaMesa(s, chefia || o.k === 'mesa-chefe')
  const depois = conferir(d, s, novo)
  return comSala(d, salaId, () => depois)
}
export const objMover = (salaId: string, id: number, x: number, y: number): Cmd => d => {
  const s = acharSala(d, salaId)?.s ?? recusa('Sala não existe')
  const o = s.objs.find(x => x.id === id) ?? recusa('Móvel não existe')
  if (o.x === x && o.y === y) return d
  const depois = conferir(d, s, { ...o, x, y })
  return comSala(d, salaId, () => depois)
}
export const objDel = (salaId: string, id: number): Cmd => d => {
  const s = acharSala(d, salaId)?.s ?? recusa('Sala não existe')
  const objs = s.objs.filter(o => o.id !== id)
  return { ...comSala(d, salaId, x => ({ ...x, objs })), pessoas: soltarPessoas(d, salaId, objs) }
}
/** troca o número da mesa (quem senta nela vai junto) */
export const mesaNumero = (salaId: string, id: number, n: number): Cmd => d => {
  const s = acharSala(d, salaId)?.s ?? recusa('Sala não existe')
  const o = s.objs.find(x => x.id === id && isDesk(x.k)) ?? recusa('Não é mesa')
  if (s.objs.some(x => x.id !== id && isDesk(x.k) && x.d === n)) recusa('Número de mesa repetido')
  const antes = o.d
  return {
    ...comSala(d, salaId, x => ({ ...x, objs: x.objs.map(q => q.id === id ? { ...q, d: n } : q) })),
    pessoas: d.pessoas.map(p => p.mesa?.sala === salaId && p.mesa.d === antes ? { ...p, mesa: { sala: salaId, d: n } } : p),
  }
}

/* ---------- piso e divisórias ---------- */
export const pintarPiso = (salaId: string, tiles: { x: number; y: number }[], piso: string): Cmd => d =>
  comSala(d, salaId, s => {
    const g = s.piso.map(r => [...r])
    let mudou = false
    for (const { x, y } of tiles) if (g[y]?.[x] !== undefined && g[y][x] !== piso) { g[y][x] = piso; mudou = true }
    return mudou ? { ...s, piso: g } : s
  })
export const divisoria = (salaId: string, tiles: { x: number; y: number }[], liga: boolean): Cmd => d => {
  const s = acharSala(d, salaId)?.s ?? recusa('Sala não existe')
  const g = s.div.map(r => [...r]), fr = frentes(s)
  const ocupado = (x: number, y: number) => s.objs.some(o => { const k = kd(o); return !k.camada && x >= o.x && x < o.x + k.w && y >= o.y && y < o.y + k.h })
  let mudou = false
  for (const { x, y } of tiles) {
    if (!dentro(s, x, y) || g[y][x] === liga) continue
    if (liga && (fr.has(x + ',' + y) || ocupado(x, y))) continue
    g[y][x] = liga; mudou = true
  }
  if (!mudou) return d
  const depois = { ...s, div: g }
  const r = reach(depois, dono(d, salaId))
  if (r) recusa(r)
  return comSala(d, salaId, () => depois)
}

/* ---------- salas ---------- */
function encaixa(a: Andar, r: { id?: string; x: number; y: number; w: number; h: number }) {
  if (r.x < 0 || r.y < 0 || r.x + r.w > a.w || r.y + r.h > a.h) recusa('Sai do andar')
  if (a.salas.some(s => s.id !== r.id && sobrepoe(s, r))) recusa('Em cima de outra sala')
}
export const salaAdd = (andarId: string, p: { nome: string; tipo?: TipoSala; setor?: string; x: number; y: number; w: number; h: number; piso?: string; id?: string }): Cmd => d => {
  const s = novaSala({ ...p, id: p.id ?? uid('sala-') })
  return comAndar(d, andarId, a => { encaixa(a, s); return { ...a, salas: [...a.salas, s] } })
}
export const salaMover = (salaId: string, x: number, y: number): Cmd => d =>
  comSala(d, salaId, (s, a) => { if (s.x === x && s.y === y) return s; encaixa(a, { ...s, x, y }); return { ...s, x, y } })
/** muda tamanho; x/y opcionais pra puxar pela borda esquerda/de cima (o conteúdo acompanha) */
export const salaRedim = (salaId: string, w: number, h: number, x?: number, y?: number): Cmd => d => {
  const s0 = acharSala(d, salaId)?.s ?? recusa('Sala não existe')
  const nx = x ?? s0.x, ny = y ?? s0.y
  const dx = s0.x - nx, dy = s0.y - ny
  // puxou pela esquerda/cima: desloca o conteúdo antes de cortar
  let s = s0
  if (dx || dy) {
    const W = s0.w + Math.max(0, dx), H = s0.h + Math.max(0, dy)
    const cel = <V,>(g: V[][], v: V) => Array.from({ length: H }, (_, j) => Array.from({ length: W }, (_, i) => g[j - Math.max(0, dy)]?.[i - Math.max(0, dx)] ?? v))
    const piso0 = s0.piso[2]?.[1] ?? 'madeira'
    s = {
      ...s0, w: W, h: H, piso: cel(s0.piso, piso0), div: cel(s0.div, false),
      objs: s0.objs.map(o => ({ ...o, x: o.x + Math.max(0, dx), y: kd(o).camada === 'parede' ? 0 : o.y + Math.max(0, dy) })),
      portas: s0.portas.map(p => ({ ...p, pos: p.pos + (p.lado === 'n' || p.lado === 's' ? Math.max(0, dx) : Math.max(0, dy)) })),
    }
    if (dx < 0 || dy < 0) {
      // encolheu pela esquerda/cima: tira a borda
      const cx = -Math.min(0, dx), cy = -Math.min(0, dy)
      s = {
        ...s, w: s.w - cx, h: s.h - cy, piso: s.piso.slice(cy).map(r => r.slice(cx)), div: s.div.slice(cy).map(r => r.slice(cx)),
        objs: s.objs.map(o => ({ ...o, x: o.x - cx, y: kd(o).camada === 'parede' ? 0 : o.y - cy })).filter(o => o.x >= 1 && (kd(o).camada === 'parede' || o.y >= 2)),
        portas: s.portas.map(p => ({ ...p, pos: p.pos - (p.lado === 'n' || p.lado === 's' ? cx : cy) })),
      }
    }
  }
  const r = { ...redimensionar(s, w, h), x: nx, y: ny }
  return {
    ...comSala(d, salaId, (_, a) => { encaixa(a, r); return r }),
    pessoas: soltarPessoas(d, salaId, r.objs),
  }
}
export const salaDel = (salaId: string): Cmd => d => {
  const achou = acharSala(d, salaId) ?? recusa('Sala não existe')
  return { ...comAndar(d, achou.a.id, a => ({ ...a, salas: a.salas.filter(s => s.id !== salaId) })), pessoas: soltarPessoas(d, salaId, []) }
}
export const salaEditar = (salaId: string, p: Partial<Pick<Sala, 'nome' | 'tipo' | 'setor' | 'travada'>>): Cmd => d =>
  comSala(d, salaId, s => {
    const n = { ...s, ...p }
    if ('setor' in p && !p.setor) delete n.setor
    return n
  })

/* ---------- portas e vidro ---------- */
export const portaAdd = (salaId: string, p: Porta): Cmd => d =>
  comSala(d, salaId, s => {
    const why = portaValida(s, p)
    if (why) recusa(why)
    const n = { ...s, portas: [...s.portas, p] }
    if (s.objs.some(o => !kd(o).camada && !kd(o).passa && check(n, o) === 'Na frente da porta')) recusa('Tem móvel na frente')
    if (p.lado === 'n' && s.objs.some(o => kd(o).camada === 'parede' && check(n, o) === 'Em cima da porta')) recusa('Tem quadro em cima')
    return n
  })
export const portaMover = (salaId: string, i: number, pos: number): Cmd => d =>
  comSala(d, salaId, s => {
    const p = s.portas[i] ?? recusa('Porta não existe')
    if (p.pos === pos) return s
    const resto = { ...s, portas: s.portas.filter((_, j) => j !== i) }
    const np = { ...p, pos }
    const why = portaValida(resto, np)
    if (why) recusa(why)
    const n = { ...s, portas: s.portas.map((q, j) => j === i ? np : q) }
    if (s.objs.some(o => { const w = check(n, o); return w === 'Na frente da porta' || w === 'Em cima da porta' })) recusa('Tem móvel no caminho')
    return n
  })
export const portaDel = (salaId: string, i: number): Cmd => d =>
  comSala(d, salaId, s => ({ ...s, portas: s.portas.filter((_, j) => j !== i) }))
export const vidro = (salaId: string, lado: Lado, liga: boolean): Cmd => d =>
  comSala(d, salaId, s => {
    const v = new Set(s.vidro ?? [])
    if (liga === v.has(lado)) return s
    if (liga) v.add(lado); else v.delete(lado)
    // janela em parede de vidro não faz sentido: sai
    const objs = liga && lado === 'n' ? s.objs.filter(o => o.k !== 'janela') : s.objs
    return { ...s, vidro: [...v], objs }
  })

/* ---------- setores e pessoas ---------- */
export const setorAdd = (st: Omit<Setor, 'id'> & { id?: string }): Cmd => d => ({ ...d, setores: [...d.setores, { ...st, id: st.id ?? uid('setor-') }] })
export const setorEditar = (id: string, p: Partial<Omit<Setor, 'id'>>): Cmd => d => {
  if (!d.setores.some(s => s.id === id)) recusa('Setor não existe')
  return { ...d, setores: d.setores.map(s => s.id === id ? { ...s, ...p } : s) }
}
/** apaga o setor; as salas viram comuns e as pessoas dele saem junto (ou passam pra outro setor) */
export const setorDel = (id: string, passarPara?: string): Cmd => d => ({
  ...d,
  setores: d.setores.filter(s => s.id !== id),
  pessoas: passarPara ? d.pessoas.map(p => p.setor === id ? { ...p, setor: passarPara, mesa: null } : p) : d.pessoas.filter(p => p.setor !== id),
  andares: d.andares.map(a => ({ ...a, salas: a.salas.map(s => { if (s.setor !== id) return s; const n = { ...s }; delete n.setor; return n }) })),
})
export const pessoaAdd = (p: Omit<Pessoa, 'id'> & { id?: string }): Cmd => d => ({ ...d, pessoas: [...d.pessoas, { mesa: null, ...p, id: p.id ?? uid('p-') }] })
export const pessoaEditar = (id: string, p: Partial<Omit<Pessoa, 'id'>>): Cmd => d => {
  if (!d.pessoas.some(x => x.id === id)) recusa('Pessoa não existe')
  return { ...d, pessoas: d.pessoas.map(x => x.id === id ? { ...x, ...p } : x) }
}
export const pessoaDel = (id: string): Cmd => d => ({ ...d, pessoas: d.pessoas.filter(p => p.id !== id) })
/** senta a pessoa na mesa (quem estava lá fica sem mesa); null = levanta */
export const atribuirMesa = (pessoaId: string, mesa: { sala: string; d: number } | null): Cmd => d => {
  if (mesa) {
    const s = acharSala(d, mesa.sala)?.s ?? recusa('Sala não existe')
    if (!s.objs.some(o => isDesk(o.k) && o.d === mesa.d)) recusa('Mesa não existe')
  }
  return {
    ...d,
    pessoas: d.pessoas.map(p => p.id === pessoaId ? { ...p, mesa } : mesa && p.mesa?.sala === mesa.sala && p.mesa.d === mesa.d ? { ...p, mesa: null } : p),
  }
}
export const distribuir = (refazer = false): Cmd => d => autoAtribuir(d, refazer)

/* ---------- andares e corredor ---------- */
export const andarAdd = (p: { nome?: string; w: number; h: number; id?: string }): Cmd => d => {
  const id = p.id ?? uid('andar-')
  const a: Andar = { id, nome: p.nome ?? `${d.andares.length + 1}º andar`, w: Math.max(12, p.w), h: Math.max(12, p.h), salas: [], corredor: { piso: 'pedra', objs: [], faixa: null }, entrada: { x: 2, y: Math.floor(p.h / 2) } }
  return { ...d, andares: [...d.andares, a] }
}
export const andarDel = (id: string): Cmd => d => {
  if (d.andares.length <= 1) recusa('Precisa ter pelo menos um andar')
  const a = d.andares.find(x => x.id === id) ?? recusa('Andar não existe')
  const ids = new Set(a.salas.map(s => s.id))
  return { ...d, andares: d.andares.filter(x => x.id !== id), pessoas: d.pessoas.map(p => p.mesa && ids.has(p.mesa.sala) ? { ...p, mesa: null } : p) }
}
export const andarEditar = (id: string, p: { nome?: string; w?: number; h?: number }): Cmd => d =>
  comAndar(d, id, a => {
    const n = { ...a, ...p }
    if (a.salas.some(s => s.x + s.w > n.w || s.y + s.h > n.h)) recusa('Tem sala fora do novo tamanho')
    return n
  })
export const andarOrdem = (id: string, para: number): Cmd => d => {
  const i = d.andares.findIndex(a => a.id === id)
  if (i < 0) recusa('Andar não existe')
  const xs = [...d.andares]; const [a] = xs.splice(i, 1); xs.splice(Math.max(0, Math.min(xs.length, para)), 0, a)
  return { ...d, andares: xs }
}
export const corredorAdd = (andarId: string, o: { k: string; x: number; y: number }): Cmd => d =>
  comAndar(d, andarId, a => {
    const n: Obj = { id: proximoId(a.corredor.objs), ...o }
    const why = checkCorredor(a, n); if (why) recusa(why)
    return { ...a, corredor: { ...a.corredor, objs: [...a.corredor.objs, n] } }
  })
export const corredorMover = (andarId: string, id: number, x: number, y: number): Cmd => d =>
  comAndar(d, andarId, a => {
    const o = a.corredor.objs.find(q => q.id === id) ?? recusa('Móvel não existe')
    if (o.x === x && o.y === y) return a
    const n = { ...o, x, y }, why = checkCorredor(a, n); if (why) recusa(why)
    return { ...a, corredor: { ...a.corredor, objs: a.corredor.objs.map(q => q.id === id ? n : q) } }
  })
export const corredorDel = (andarId: string, id: number): Cmd => d =>
  comAndar(d, andarId, a => ({ ...a, corredor: { ...a.corredor, objs: a.corredor.objs.filter(q => q.id !== id) } }))
export const corredorEditar = (andarId: string, p: { piso?: string; faixa?: Andar['corredor']['faixa'] }): Cmd => d =>
  comAndar(d, andarId, a => ({ ...a, corredor: { ...a.corredor, ...p } }))
export const entrada = (andarId: string, x: number, y: number): Cmd => d =>
  comAndar(d, andarId, a => {
    const o: Obj = { id: -1, k: 'planta', x, y }
    // entrada precisa ser corredor livre
    const why = checkCorredor({ ...a, entrada: { x: -1, y: -1 } }, o)
    if (why === 'Fora do corredor') recusa('A entrada tem que ficar no corredor')
    if (why) recusa('Tem coisa ali')
    return { ...a, entrada: { x, y } }
  })

/* ---------- documento ---------- */
export const empresa = (p: Partial<Doc['empresa']>): Cmd => d => ({ ...d, empresa: { ...d.empresa, ...p } })
export const tema = (p: Partial<Doc['tema']>): Cmd => d => ({ ...d, tema: { ...d.tema, ...p } })
export const substituir = (novo: Doc): Cmd => () => novo
/** junta vários comandos num passo só (se um recusar, nada muda) */
export const lote = (...cmds: Cmd[]): Cmd => d => cmds.reduce((x, c) => c(x), d)
