/** Quem senta onde. Mantém o que já está certo e distribui o resto pelas salas do setor. */
import { isDesk } from './catalogo'
import { CHEFE, type Doc, type Pessoa, type Sala } from './tipos'

const salasDe = (doc: Doc) => doc.andares.flatMap(a => a.salas)
const temMesa = (s: Sala, d: number) => s.objs.some(o => isDesk(o.k) && o.d === d)

export function autoAtribuir(doc: Doc, refazer = false): Doc {
  const salas = salasDe(doc), ocupadas = new Set<string>()
  const key = (sala: string, d: number) => sala + '#' + d
  // 1) mantém quem já tem mesa válida
  const pessoas: Pessoa[] = doc.pessoas.map(p => {
    if (refazer || !p.mesa) return { ...p, mesa: null }
    const s = salas.find(x => x.id === p.mesa!.sala)
    if (!s || !temMesa(s, p.mesa.d) || ocupadas.has(key(s.id, p.mesa.d))) return { ...p, mesa: null }
    ocupadas.add(key(s.id, p.mesa.d))
    return p
  })
  const livre = (s: Sala, chefia: boolean) => s.objs
    .filter(o => isDesk(o.k) && o.d !== undefined && (chefia ? o.d === CHEFE : o.d !== CHEFE) && !ocupadas.has(key(s.id, o.d!)))
    .sort((a, b) => a.d! - b.d!)[0]
  // 2) chefia primeiro, depois o resto, na ordem da lista
  const ordem = [...pessoas.keys()].sort((a, b) => Number(!!pessoas[b].chefe) - Number(!!pessoas[a].chefe))
  for (const i of ordem) {
    const p = pessoas[i]
    if (p.mesa) continue
    const minhas = salas.filter(s => s.setor === p.setor)
    const tenta = [
      ...(p.chefe ? minhas.map(s => [s, true] as const) : []),
      ...minhas.map(s => [s, false] as const),
      ...salas.filter(s => s.tipo === 'foco').map(s => [s, false] as const),
    ]
    for (const [s, chefia] of tenta) {
      const o = livre(s, chefia)
      if (!o) continue
      ocupadas.add(key(s.id, o.d!))
      pessoas[i] = { ...p, mesa: { sala: s.id, d: o.d! } }
      break
    }
  }
  return { ...doc, pessoas }
}

/** nomes de exemplo pro setor (chefia conta dentro do total) */
export function pessoasExemplo(setor: { id: string; nome: string; pessoas: number; lider?: boolean }): Pessoa[] {
  return Array.from({ length: setor.pessoas }, (_, i) => ({
    id: `${setor.id}-p${i + 1}`, nome: i === 0 && setor.lider ? `Chefia ${setor.nome}` : `${setor.nome} ${i + (setor.lider ? 0 : 1)}`,
    setor: setor.id, ...(i === 0 && setor.lider ? { chefe: true } : {}), mesa: null,
  }))
}
