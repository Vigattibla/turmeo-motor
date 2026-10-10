import { describe, expect, it } from 'vitest'
import { gerar, regerar } from '../src/motor/gerador'
import { MODELOS, sugerirExtras } from '../src/motor/modelos'
import { pessoasExemplo } from '../src/motor/pessoas'
import { erros } from '../src/motor/validar'
import type { Setor } from '../src/motor/tipos'
import { isDesk } from '../src/motor/catalogo'

const setoresDe = (id: string): Setor[] => MODELOS[id].setores.map((s, i) => ({ ...s, id: `s${i + 1}` }))
const entrada = (id: string, mult = 1) => {
  const setores = setoresDe(id).map(s => ({ ...s, pessoas: s.pessoas * mult }))
  const total = setores.reduce((n, s) => n + s.pessoas, 0)
  return { empresa: { nome: 'Teste' }, modelo: id, setores, pessoas: setores.flatMap(pessoasExemplo), extras: sugerirExtras(total, MODELOS[id]) }
}

describe('gerador', () => {
  for (const id of Object.keys(MODELOS)) for (const mult of [1, 3]) {
    it(`${id} ×${mult}: 30 sementes sem erro, todo mundo com mesa`, () => {
      for (let seed = 1; seed <= 30; seed++) {
        const r = gerar(entrada(id, mult), seed)
        const e = erros(r.problemas)
        expect(e.map(p => p.msg), `seed ${seed}`).toEqual([])
        expect(r.doc.pessoas.filter(p => !p.mesa).map(p => p.nome), `seed ${seed}`).toEqual([])
        const mesas = r.doc.andares.flatMap(a => a.salas.flatMap(s => s.objs.filter(o => isDesk(o.k))))
        expect(mesas.length).toBeGreaterThanOrEqual(r.doc.pessoas.length)
      }
    })
  }
  it('determinístico', () => {
    const a = gerar({ ...entrada('startup'), id: 'x' }, 7), b = gerar({ ...entrada('startup'), id: 'x' }, 7)
    expect(JSON.stringify(a.doc)).toBe(JSON.stringify(b.doc))
  })
  it('setor grande divide em A/B', () => {
    const e = entrada('escritorio')
    e.setores[0].pessoas = 40
    const r = gerar(e, 1)
    const nomes = r.doc.andares.flatMap(a => a.salas.map(s => s.nome))
    expect(nomes).toContain('Diretoria A')
    expect(nomes).toContain('Diretoria C')
  })
  it('regerar mantém sala travada', () => {
    const r = gerar(entrada('resort'), 3)
    const a = r.doc.andares[0]
    a.salas[1] = { ...a.salas[1], travada: true, nome: 'Fixa' }
    const r2 = regerar(r.doc, 9)
    const fixa = r2.doc.andares.flatMap(x => x.salas).find(s => s.id === a.salas[1].id)!
    expect(fixa.nome).toBe('Fixa')
    expect(fixa.objs).toEqual(a.salas[1].objs)
  })
})
