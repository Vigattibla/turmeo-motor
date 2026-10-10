/** ajudantes do editor: arquivo, armazenamento local, desenho de miniatura */
import { deskFrom, kd } from '../motor/sala'
import { isDesk, PISOS } from '../motor/catalogo'
import { drawDesk } from '../render/mesa'
import { T } from '../render/base'
import { usarTokens, type Tokens } from '../render/tokens'

export const CHAVE_LOCAL = 'turmeo-motor:doc'
export function lerLocal(): string | null { try { return localStorage.getItem(CHAVE_LOCAL) } catch { return null } }
export function gravarLocal(txt: string) { try { localStorage.setItem(CHAVE_LOCAL, txt) } catch { /* sem armazenamento: segue só na memória */ } }

export function baixar(nome: string, txt: string) {
  const url = URL.createObjectURL(new Blob([txt], { type: 'application/json' }))
  const a = document.createElement('a'); a.href = url; a.download = nome; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export function escolherArquivo(): Promise<string | null> {
  return new Promise(ok => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json'
    i.onchange = () => { const f = i.files?.[0]; if (!f) return ok(null); f.text().then(ok, () => ok(null)) }
    i.click()
  })
}
export const fatiar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x'

/** desenha um móvel do catálogo pra miniatura */
export function desenharMovel(cv: HTMLCanvasElement, k: string, tokens: Tokens) {
  const def = kd({ id: 0, k, x: 0, y: 0 }), up = def.camada === 'parede' ? 0 : def.up ?? 0
  const h = def.camada === 'parede' ? 2 : def.h + up
  cv.width = def.w * T + 4; cv.height = h * T + 4
  const c = cv.getContext('2d')!
  c.imageSmoothingEnabled = false
  usarTokens(tokens)
  if (isDesk(k)) {
    // mesa não tem draw próprio (a sala desenha com dono/cadeira): monta uma mesa solta na origem
    cv.height += T; c.imageSmoothingEnabled = false
    c.save(); c.translate(2, 2)
    drawDesk(c, deskFrom({ id: 0, k, x: 0, y: up }), k === 'mesa-chefe', { pile: 0, inbox: false, busy: false, owned: true, t: 0 })
    c.restore(); return
  }
  try { def.draw(c, 2, def.camada === 'parede' ? 2 : up * T + 2, 0) } catch { /* móvel que depende da sala: fica vazio */ }
}
export function desenharPiso(cv: HTMLCanvasElement, id: string) {
  cv.width = 2 * T; cv.height = 2 * T
  const c = cv.getContext('2d')!
  for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) PISOS[id]?.draw(c, a * T, b * T)
}
