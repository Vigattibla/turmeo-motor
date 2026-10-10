/** Confere o documento inteiro e devolve a lista de problemas (erro trava a publicação, aviso só informa). */
import { isDesk } from './catalogo'
import { alcance, corredorGrid, checkCorredor, sobrepoe, walkGrid } from './andar'
import { check, kd, mesas, portaDentro, portaFora, portaValida } from './sala'
import { CHEFE, type Andar, type Doc, type Problema } from './tipos'

export function validarAndar(a: Andar, doc?: Doc): Problema[] {
  const out: Problema[] = []
  const P = (nivel: Problema['nivel'], cod: string, msg: string, extra: Partial<Problema> = {}) => out.push({ nivel, cod, msg, andar: a.id, ...extra })
  const dono = (sala: string, d: number) => doc?.pessoas.find(p => p.mesa?.sala === sala && p.mesa.d === d)?.nome ?? null

  for (const s of a.salas) {
    const S = { sala: s.id }
    if (s.x < 0 || s.y < 0 || s.x + s.w > a.w || s.y + s.h > a.h) P('erro', 'sala-fora', `${s.nome} sai do andar`, S)
    for (const t of a.salas) if (t !== s && t.id < s.id && sobrepoe(s, t)) P('erro', 'sala-sobreposta', `${s.nome} está em cima de ${t.nome}`, S)
    if (s.piso.length !== s.h || s.piso.some(r => r.length !== s.w) || s.div.length !== s.h || s.div.some(r => r.length !== s.w)) P('erro', 'grade', `${s.nome}: grade do piso com tamanho errado`, S)
    const ids = new Set<number>(), ds = new Set<number>()
    for (const o of s.objs) {
      if (ids.has(o.id)) P('erro', 'obj-id', `${s.nome}: id de móvel repetido (${o.id})`, { ...S, obj: o.id })
      ids.add(o.id)
      const why = check(s, o, d => dono(s.id, d))
      if (why && why !== 'Número de mesa repetido') P('erro', 'obj', `${s.nome}: ${kd(o).nome} — ${why}`, { ...S, obj: o.id, x: s.x + o.x, y: s.y + o.y })
      if (isDesk(o.k) && o.d !== undefined) {
        if (ds.has(o.d)) P('erro', 'mesa-repetida', `${s.nome}: duas mesas com o número ${o.d}`, { ...S, obj: o.id })
        ds.add(o.d)
      }
    }
    if (!s.portas.length) P('erro', 'sem-porta', `${s.nome} não tem porta`, S)
    const hall = corredorGrid(a)
    for (const p of s.portas) {
      const why = portaValida(s, p)
      if (why) { P('erro', 'porta', `${s.nome}: ${why}`, S); continue }
      if (portaDentro(s, p).some(t => s.div[t.y][t.x])) P('erro', 'porta-bloqueada', `${s.nome}: divisória na frente da porta`, S)
      const fora = portaFora(s, p)
      const outra = (x: number, y: number) => a.salas.find(t => t !== s && x >= t.x && x < t.x + t.w && y >= t.y && y < t.y + t.h)
      if (!fora.every(t => hall[t.y]?.[t.x] || outra(t.x, t.y))) P('erro', 'porta-sem-saida', `${s.nome}: porta dá pra parede`, { ...S, x: fora[0].x, y: fora[0].y })
    }
  }

  const hall = corredorGrid(a)
  if (!hall[a.entrada.y]?.[a.entrada.x]) P('erro', 'entrada', 'A entrada do andar não está no corredor', { x: a.entrada.x, y: a.entrada.y })
  for (const o of a.corredor.objs) {
    const why = checkCorredor(a, o)
    if (why) P('erro', 'corredor', `Corredor: ${kd(o).nome} — ${why}`, { obj: o.id, x: o.x, y: o.y })
  }

  const walk = walkGrid(a), viu = alcance(a, a.entrada, walk)
  if (viu.size) for (const s of a.salas) {
    for (const p of s.portas) {
      const t = portaDentro(s, p)[0]
      if (!viu.has((s.y + t.y) * a.w + s.x + t.x)) { P('erro', 'porta-inalcancavel', `Não dá pra chegar na porta de ${s.nome}`, { sala: s.id }); break }
    }
    for (const o of s.objs) if (isDesk(o.k)) {
      const sx = s.x + o.x + Math.floor((kd(o).w - 1) / 2), sy = s.y + o.y - 1
      if (!viu.has(sy * a.w + sx)) {
        const n = o.d === undefined ? null : dono(s.id, o.d)
        P('erro', 'mesa-inalcancavel', `${s.nome}: ${n ? 'a mesa de ' + n : 'uma mesa'} fica sem caminho`, { sala: s.id, obj: o.id, x: s.x + o.x, y: s.y + o.y })
      }
    }
  }
  return out
}

export function validar(doc: Doc): Problema[] {
  const out: Problema[] = []
  if (!doc.andares.length) out.push({ nivel: 'erro', cod: 'sem-andar', msg: 'Nenhum andar' })
  const ids = new Set<string>()
  for (const a of doc.andares) {
    for (const s of a.salas) {
      if (ids.has(s.id)) out.push({ nivel: 'erro', cod: 'sala-id', msg: `Id de sala repetido: ${s.id}`, andar: a.id, sala: s.id })
      ids.add(s.id)
    }
    out.push(...validarAndar(a, doc))
  }
  const salas = doc.andares.flatMap(a => a.salas.map(s => ({ a, s })))
  const setores = new Set(doc.setores.map(s => s.id))
  const ocupada = new Map<string, string>()
  for (const p of doc.pessoas) {
    if (!setores.has(p.setor)) out.push({ nivel: 'aviso', cod: 'pessoa-setor', msg: `${p.nome} está num setor que não existe` })
    if (!p.mesa) { out.push({ nivel: 'aviso', cod: 'pessoa-sem-mesa', msg: `${p.nome} está sem mesa` }); continue }
    const alvo = salas.find(x => x.s.id === p.mesa!.sala)
    const mesa = alvo?.s.objs.find(o => isDesk(o.k) && o.d === p.mesa!.d)
    if (!alvo || !mesa) { out.push({ nivel: 'erro', cod: 'mesa-sumiu', msg: `A mesa de ${p.nome} não existe mais`, sala: p.mesa.sala }); continue }
    const key = p.mesa.sala + '#' + p.mesa.d
    if (ocupada.has(key)) out.push({ nivel: 'erro', cod: 'mesa-dupla', msg: `${p.nome} e ${ocupada.get(key)} na mesma mesa`, andar: alvo.a.id, sala: alvo.s.id, obj: mesa.id })
    ocupada.set(key, p.nome)
    if (p.mesa.d === CHEFE && !p.chefe) out.push({ nivel: 'aviso', cod: 'chefia', msg: `${p.nome} está na mesa da chefia`, sala: alvo.s.id })
  }
  for (const st of doc.setores) {
    const minhas = salas.filter(x => x.s.setor === st.id)
    if (!minhas.length) { out.push({ nivel: 'aviso', cod: 'setor-sem-sala', msg: `${st.nome} não tem sala` }); continue }
    const lugares = minhas.reduce((n, x) => n + mesas(x.s).length, 0)
    const gente = Math.max(st.pessoas, doc.pessoas.filter(p => p.setor === st.id).length)
    if (lugares < gente) out.push({ nivel: 'aviso', cod: 'setor-lotado', msg: `${st.nome}: ${gente} pessoas pra ${lugares} mesas` })
  }
  return out
}
export const erros = (ps: Problema[]) => ps.filter(p => p.nivel === 'erro')
