import { describe, expect, it } from 'vitest'
import { isDesk, KINDS } from '../src/motor/catalogo'
import * as C from '../src/motor/comandos'
import { gerar } from '../src/motor/gerador'
import { deV0, lerSalaV0, originalV0, paraV0, slotXY, type TurmeoV0 } from '../src/motor/migrar'
import { MODELOS } from '../src/motor/modelos'
import { pessoasExemplo } from '../src/motor/pessoas'
import { CHEFE, type Doc, type Sala } from '../src/motor/tipos'
import { erros, validar } from '../src/motor/validar'

const base = (): Doc => {
  const setores = MODELOS.escritorio.setores.map((s, i) => ({ ...s, id: `s${i + 1}` }))
  return gerar({ empresa: { nome: 'Teste' }, modelo: 'escritorio', setores, pessoas: setores.flatMap(pessoasExemplo), extras: ['reuniao'] }, 1).doc
}
const sala = (d: Doc, f: (s: Sala) => boolean = s => s.tipo === 'setor') => d.andares[0].salas.find(f)!
const comSala = (d: Doc, s: Sala): Doc => ({ ...d, andares: d.andares.map(a => ({ ...a, salas: a.salas.map(x => x.id === s.id ? s : x) })) })
const cods = (d: Doc) => erros(validar(d)).map(p => p.cod)

describe('validador', () => {
  it('documento gerado sai limpo', () => expect(cods(base())).toEqual([]))
  it('pega sala em cima de sala', () => {
    const d = base(), [a, b] = d.andares[0].salas
    expect(cods(comSala(d, { ...b, x: a.x, y: a.y }))).toContain('sala-sobreposta')
  })
  it('pega sala fora do andar', () => {
    const d = base(), s = sala(d)
    expect(cods(comSala(d, { ...s, x: d.andares[0].w - 2 }))).toContain('sala-fora')
  })
  it('pega porta bloqueada', () => {
    const d = base(), s = sala(d), p = s.portas[0]
    // estante na frente da porta (porta do lado sul → linha h-2)
    const bloq: Sala = { ...s, objs: [...s.objs.filter(o => !(o.y >= s.h - 3 && o.x >= p.pos - 2 && o.x <= p.pos + 2)), { id: 999, k: 'estante', x: p.pos, y: s.h - 2 }] }
    const c = cods(comSala(d, bloq))
    expect(c.some(x => x.startsWith('porta-'))).toBe(true)
  })
  it('pega mesa sem caminho', () => {
    const d = base(), s = sala(d), m = s.objs.find(o => o.k === 'mesa')!
    // cerca a cadeira com divisória
    const div = s.div.map(r => [...r])
    for (let y = m.y - 2; y <= m.y + 2; y++) for (let x = m.x - 1; x <= m.x + KINDS.mesa.w; x++) if (y > 1 && y < s.h - 1 && x > 0 && x < s.w - 1 && (y === m.y - 2 || x === m.x - 1 || x === m.x + KINDS.mesa.w || y === m.y + 2)) div[y][x] = true
    expect(cods(comSala(d, { ...s, div }))).toContain('mesa-inalcancavel')
  })
})

describe('comandos', () => {
  it('recusa móvel em cima de móvel e diz por quê', () => {
    const d = base(), s = sala(d), o = s.objs.find(x => x.k === 'estante')!
    expect(() => C.objAdd(s.id, { k: 'estante', x: o.x, y: o.y })(d)).toThrow(C.Recusa)
  })
  it('apagar mesa solta quem estava nela', () => {
    const d = base(), s = sala(d), m = s.objs.find(o => isDesk(o.k) && d.pessoas.some(p => p.mesa?.sala === s.id && p.mesa.d === o.d))!
    const d2 = C.objDel(s.id, m.id)(d)
    expect(d2.pessoas.some(p => p.mesa?.sala === s.id && p.mesa.d === m.d)).toBe(false)
  })
  it('redimensionar puxando pela esquerda mantém os móveis no lugar do andar', () => {
    const d = base(), s = d.andares[0].salas.find(x => x.x > 0 && x.y === 0)!
    const prev = d.andares[0].salas.find(x => x.y === 0 && x.x + x.w === s.x)!
    const d1 = C.salaRedim(prev.id, prev.w - 2, prev.h)(d)
    const d2 = C.salaRedim(s.id, s.w + 2, s.h, s.x - 2)(d1)
    const s2 = sala(d2, x => x.id === s.id), o = s.objs[0], o2 = s2.objs.find(x => x.id === o.id)!
    expect(s2.x + o2.x).toBe(s.x + o.x)
    expect(cods(d2)).toEqual([])
  })
  it('recusa sala nova em cima de outra', () => {
    const d = base()
    expect(() => C.salaAdd(d.andares[0].id, { nome: 'X', x: 0, y: 0, w: 10, h: 10 })(d)).toThrow(C.Recusa)
  })
  it('não apaga o último andar', () => {
    const d = base()
    const so1 = { ...d, andares: [d.andares[0]] }
    expect(() => C.andarDel(so1.andares[0].id)(so1)).toThrow(C.Recusa)
  })
  it('lote aplica tudo em ordem', () => {
    const d = C.lote(C.empresa({ nome: 'Nova' }), C.setorAdd({ id: 'x', nome: 'X', cor: '#000', tipo: 'setor', pessoas: 2 }))(base())
    expect(d.empresa.nome).toBe('Nova')
    expect(d.setores.at(-1)!.id).toBe('x')
  })
})

describe('histórico', () => {
  it('arrastar com a mesma chave vira um passo só; desfaz e refaz', () => {
    const d = base(), s = sala(d), o = s.objs.find(x => x.k === 'estante')!
    const h = new C.Historico(d)
    for (const dx of [0, 1]) expect(h.aplicar(C.objMover(s.id, o.id, o.x, o.y + 1 + dx), 'arrasta')).toBeNull()
    h.selar()
    h.aplicar(C.empresa({ nome: 'Y' }))
    expect(h.desfazer()).toBe(true)
    expect(h.desfazer()).toBe(true)
    expect(h.doc).toBe(d)
    expect(h.podeDesfazer).toBe(false)
    expect(h.refazer()).toBe(true)
    expect(sala(h.doc, x => x.id === s.id).objs.find(x => x.id === o.id)!.y).toBe(o.y + 2)
  })
  it('recusa não mexe no documento', () => {
    const d = base(), h = new C.Historico(d), s = sala(d), o = s.objs.find(x => x.k === 'estante')!
    expect(typeof h.aplicar(C.objAdd(s.id, { k: 'estante', x: o.x, y: o.y }))).toBe('string')
    expect(h.doc).toBe(d)
    expect(h.podeDesfazer).toBe(false)
  })
})

describe('migração v0', () => {
  const v0: TurmeoV0 = {
    depts: [
      { id: 'mkt', name: 'Marketing', color: '#f60', floor: 0, slot: 0 },
      { id: 'ven', name: 'Vendas', color: '#06f', floor: 0, slot: 1, vendas: true },
      { id: 'fin', name: 'Financeiro', color: '#0a0', floor: 0, slot: 2 },
      { id: 'rh', name: 'RH', color: '#a0a', floor: 1, slot: 3 },
    ],
    rooms: [{ id: 'mkt', data: originalV0() }, { id: 'ven', data: 'lixo' }, { id: 'fin', data: { piso: [[1]], div: [], objs: [] } }],
    profiles: [
      { id: 'a', name: 'Ana', dept: 'mkt', desk: 12 },
      { id: 'b', name: 'Bia', dept: 'mkt', desk: 0 },
      { id: 'c', name: 'Caio', dept: 'ven', desk: 3 },
    ],
  }
  it('abre limpo, nas vagas certas, chefia virando CHEFE', () => {
    const d = deV0(v0)
    expect(d.andares.length).toBe(2)
    expect(cods(d)).toEqual([])
    const mkt = sala(d, s => s.id === 'mkt'), fin = sala(d, s => s.id === 'fin')
    expect([mkt.x, mkt.y]).toEqual([slotXY(0).x, slotXY(0).y])
    expect(fin.y).toBe(21)
    expect(fin.portas[0].lado).toBe('n')
    expect(fin.objs.some(o => o.k === 'janela')).toBe(false)
    expect(mkt.objs.find(o => o.k === 'mesa-chefe')!.d).toBe(CHEFE)
    expect(d.pessoas.find(p => p.id === 'a')).toMatchObject({ chefe: true, mesa: { sala: 'mkt', d: CHEFE } })
  })
  it('sala estragada volta pro layout de fábrica', () => {
    expect(lerSalaV0('lixo', true)).toEqual(originalV0(true))
    expect(lerSalaV0({ piso: [[1]], div: [], objs: [] })).toEqual(originalV0())
  })
  it('ida e volta preserva salas e mesas', () => {
    const d = deV0(v0)
    const { v0: volta, avisos } = paraV0(d)
    expect(avisos).toEqual([])
    expect(volta.depts.map(x => [x.id, x.floor, x.slot])).toEqual([['mkt', 0, 0], ['ven', 0, 1], ['fin', 0, 2], ['rh', 1, 3]])
    const mkt = volta.rooms.find(r => r.id === 'mkt')!.data as ReturnType<typeof originalV0>
    expect(mkt.objs.find(o => o.k === 'mesa-chefe')!.d).toBe(12)
    expect(volta.profiles!.find(p => p.id === 'a')!.desk).toBe(12)
    expect(deV0(volta).andares[0].salas.find(s => s.id === 'mkt')!.objs).toEqual(sala(d, s => s.id === 'mkt').objs)
  })
  it('sala fora do padrão vira aviso, não some calada', () => {
    const d = C.salaRedim('mkt', 22, 16)(deV0(v0))
    const { v0: volta, avisos } = paraV0(d)
    expect(volta.depts.some(x => x.id === 'mkt')).toBe(false)
    expect(avisos.some(a => a.startsWith('Marketing'))).toBe(true)
  })
})
