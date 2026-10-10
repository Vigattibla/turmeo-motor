/** escritórios salvos no navegador: um índice leve (pra tela inicial) + o documento de cada um */
import { abrir, exportar } from '../motor/doc'
import type { Doc } from '../motor/tipos'

export type Resumo = { id: string; nome: string; pessoas: number; salas: number; andares: number; editado: number }

const INDICE = 'turmeo-motor:escritorios'
const DOC = (id: string) => 'turmeo-motor:esc:' + id
const ANTIGO = 'turmeo-motor:doc'

const ler = (k: string) => { try { return localStorage.getItem(k) } catch { return null } }
const gravar = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* sem armazenamento: segue só na memória */ } }
const tirar = (k: string) => { try { localStorage.removeItem(k) } catch { /* idem */ } }

export const resumir = (d: Doc, editado = Date.now()): Resumo => ({
  id: d.id, nome: d.empresa.nome, pessoas: d.pessoas.length,
  salas: d.andares.reduce((n, a) => n + a.salas.length, 0), andares: d.andares.length, editado,
})

function lerIndice(): Resumo[] {
  try { const v = JSON.parse(ler(INDICE) ?? '[]'); return Array.isArray(v) ? v : [] } catch { return [] }
}
const gravarIndice = (l: Resumo[]) => gravar(INDICE, JSON.stringify(l))

/** o editor de antes guardava um documento só: vira o primeiro escritório da lista */
function migrar() {
  const txt = ler(ANTIGO)
  if (!txt) return
  try { const d = abrir(txt).doc; if (!ler(DOC(d.id))) salvar(d) } catch { /* salvo quebrado: ignora */ }
  tirar(ANTIGO)
}

export function listar(): Resumo[] {
  migrar()
  return lerIndice().sort((a, b) => b.editado - a.editado)
}
export function carregar(id: string): Doc | null {
  const txt = ler(DOC(id))
  if (!txt) return null
  try { return abrir(txt).doc } catch { return null }
}
export function salvar(d: Doc) {
  gravar(DOC(d.id), exportar(d))
  gravarIndice([resumir(d), ...lerIndice().filter(r => r.id !== d.id)])
}
export function apagar(id: string) {
  tirar(DOC(id))
  gravarIndice(lerIndice().filter(r => r.id !== id))
}
export function renomear(id: string, nome: string) {
  const d = carregar(id)
  if (d) salvar({ ...d, empresa: { ...d.empresa, nome } })
}
export function duplicar(id: string): Doc | null {
  const d = carregar(id)
  if (!d) return null
  const copia = { ...d, id: 'doc-' + Date.now().toString(36), empresa: { ...d.empresa, nome: d.empresa.nome + ' (cópia)' } }
  salvar(copia)
  return copia
}
