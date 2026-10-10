/**
 * Tela inicial: "Meus escritórios" em cartões (estilo Trello) + criar um novo numa tela só.
 * Quem quer detalhar nomes e salas usa o assistente completo depois, dentro do editor.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { gerar, type Resultado } from '../motor/gerador'
import { CORES, MODELOS, modelo, sugerirExtras } from '../motor/modelos'
import { pessoasExemplo } from '../motor/pessoas'
import type { Doc, Setor } from '../motor/tipos'
import { T } from '../render/base'
import { desenharAndar } from '../render/andar'
import { apagar, carregar, duplicar, listar, renomear, salvar, type Resumo } from './loja'
import { fatiar } from './util'

/** planta do primeiro andar desenhada num canvas (o CSS escala) */
export function Planta({ doc, className }: { doc: Doc; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current, a = doc.andares[0]; if (!cv || !a) return
    cv.width = a.w * T; cv.height = a.h * T
    const c = cv.getContext('2d')!; c.imageSmoothingEnabled = false
    desenharAndar(c, doc, a, { t: 0 })
  }, [doc])
  return <canvas ref={ref} className={className} />
}

const quando = (t: number) => {
  const min = Math.round((Date.now() - t) / 60000)
  if (min < 1) return 'agora há pouco'
  if (min < 60) return `há ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `há ${h} h`
  return new Date(t).toLocaleDateString('pt-BR')
}

function Cartao({ r, abrirEsc, mudou }: { r: Resumo; abrirEsc: (id: string) => void; mudou: () => void }) {
  const doc = useMemo(() => carregar(r.id), [r])
  const [menu, setMenu] = useState(false)
  const [nomeando, setNomeando] = useState(false)
  const [nome, setNome] = useState(r.nome)
  const ok = () => { setNomeando(false); if (nome.trim() && nome.trim() !== r.nome) { renomear(r.id, nome.trim()); mudou() } else setNome(r.nome) }
  return (
    <article className="in-cartao">
      <button className="in-capa" onClick={() => abrirEsc(r.id)} aria-label={`Abrir ${r.nome}`}>
        {doc ? <Planta doc={doc} /> : <span>sem prévia</span>}
      </button>
      <div className="in-info">
        {nomeando
          ? <input autoFocus value={nome} onChange={e => setNome(e.target.value)} onBlur={ok} onKeyDown={e => { if (e.key === 'Enter') ok(); if (e.key === 'Escape') { setNome(r.nome); setNomeando(false) } }} aria-label="Novo nome" />
          : <b onDoubleClick={() => setNomeando(true)}>{r.nome || 'Sem nome'}</b>}
        <small>{r.pessoas} pessoas · {r.salas} salas{r.andares > 1 ? ` · ${r.andares} andares` : ''} · {quando(r.editado)}</small>
      </div>
      <button className="in-mais" onClick={() => setMenu(m => !m)} aria-label="Opções">⋯</button>
      {menu && <div className="in-menu" onMouseLeave={() => setMenu(false)}>
        <button onClick={() => abrirEsc(r.id)}>Abrir</button>
        <button onClick={() => { setMenu(false); setNomeando(true) }}>Renomear</button>
        <button onClick={() => { setMenu(false); duplicar(r.id); mudou() }}>Duplicar</button>
        <button className="perigo" onClick={() => { setMenu(false); if (confirm(`Apagar "${r.nome}"? Não tem como desfazer.`)) { apagar(r.id); mudou() } }}>Apagar</button>
      </div>}
    </article>
  )
}

export function Inicio({ abrirEsc }: { abrirEsc: (id: string) => void }) {
  const [lista, setLista] = useState(listar)
  const [criando, setCriando] = useState<string | null>(null)
  const mudou = () => setLista(listar())
  const criar = (d: Doc) => { salvar(d); abrirEsc(d.id) }
  const vazio = !lista.length

  return (
    <div className="in">
      <header className="in-topo"><b>Turmeo</b><span>escritórios</span></header>
      <main className="in-corpo">
        {vazio && <section className="in-hero">
          <h1>Monte o escritório da sua empresa em 1 minuto</h1>
          <p>Diga o nome, o tipo e quantas pessoas são. A gente desenha as salas e as mesas; depois é só ajustar arrastando.</p>
          <button className="prim grande" onClick={() => setCriando('escritorio')}>Criar meu escritório</button>
        </section>}

        {!vazio && <section>
          <h2>Meus escritórios</h2>
          <div className="in-grade">
            <button className="in-novo" onClick={() => setCriando('escritorio')}><span>＋</span>Criar escritório</button>
            {lista.map(r => <Cartao key={r.id + r.editado} r={r} abrirEsc={abrirEsc} mudou={mudou} />)}
          </div>
        </section>}

        <section>
          <h2>Começar de um modelo</h2>
          <div className="in-modelos">
            {Object.values(MODELOS).map(m => (
              <button key={m.id} className="in-modelo" onClick={() => setCriando(m.id)}>
                <span className="in-cores">{[m.tema.marca, m.tema.destaque, m.tema.pedraA].map(c => <i key={c} style={{ background: c }} />)}</span>
                <b>{m.nome}</b><small>{m.descricao}</small>
              </button>
            ))}
          </div>
        </section>
      </main>
      {criando && <Criar modeloInicial={criando} fechar={() => setCriando(null)} criar={criar} />}
    </div>
  )
}

/* ---------- criar escritório: uma tela só ---------- */

const TAMANHOS = [{ id: 'p', nome: 'Até 10', n: 8 }, { id: 'm', nome: '10 a 30', n: 20 }, { id: 'g', nome: '30 a 60', n: 45 }, { id: 'gg', nome: 'Mais de 60', n: 80 }]

type Opcao = { nome: string; on: boolean; base?: Omit<Setor, 'id'> }
const opcoesDoModelo = (id: string): Opcao[] => modelo(id).setores.map(s => ({ nome: s.nome, on: true, base: s }))

/** divide o total de pessoas entre os setores ligados, no peso que o modelo sugere */
function montarSetores(ops: Opcao[], total: number): Setor[] {
  const on = ops.filter(o => o.on)
  const peso = on.map(o => o.base?.pessoas ?? 4), soma = peso.reduce((a, b) => a + b, 0) || 1
  return on.map((o, i) => ({
    id: `setor-${fatiar(o.nome)}-${i}`, nome: o.nome, cor: o.base?.cor ?? CORES[i % CORES.length],
    pessoas: Math.max(1, Math.round(total * peso[i] / soma)), tipo: o.base?.tipo ?? 'setor', lider: o.base?.lider ?? total >= 15,
  }))
}

function Criar({ modeloInicial, fechar, criar }: { modeloInicial: string; fechar: () => void; criar: (d: Doc) => void }) {
  const [nome, setNome] = useState('')
  const [modeloId, setModeloId] = useState(modeloInicial)
  const [tam, setTam] = useState('m')
  const [ops, setOps] = useState(() => opcoesDoModelo(modeloInicial))
  const [novo, setNovo] = useState('')
  const [seed, setSeed] = useState(1)
  const [res, setRes] = useState<Resultado | null>(null)
  const total = TAMANHOS.find(t => t.id === tam)!.n
  const algum = ops.some(o => o.on)

  // prévia ao vivo (pequeno atraso pra não gerar a cada tecla)
  useEffect(() => {
    if (!algum) { setRes(null); return }
    const t = setTimeout(() => {
      const m = modelo(modeloId)
      const sts = montarSetores(ops, total)
      setRes(gerar({ empresa: { nome: nome.trim() || 'Meu escritório' }, modelo: m.id, setores: sts, pessoas: sts.flatMap(pessoasExemplo), extras: sugerirExtras(total, m) }, seed))
    }, 250)
    return () => clearTimeout(t)
  }, [nome, modeloId, total, ops, seed, algum])

  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar() }
    window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f)
  }, [fechar])

  const trocarModelo = (id: string) => { setModeloId(id); setOps(opcoesDoModelo(id)) }
  const addSetor = () => {
    const n = novo.trim(); if (!n) return
    if (!ops.some(o => o.nome.toLowerCase() === n.toLowerCase())) setOps(o => [...o, { nome: n, on: true }])
    setNovo('')
  }
  const pronto = !!(nome.trim() && res)
  const fazer = () => { if (pronto) criar({ ...res!.doc, empresa: { ...res!.doc.empresa, nome: nome.trim() } }) }

  return (
    <div className="as-fundo" onMouseDown={e => { if (e.target === e.currentTarget) fechar() }}>
      <div className="cr" role="dialog" aria-label="Criar escritório">
        <div className="cr-form">
          <header><h2>Criar escritório</h2><button className="as-x" onClick={fechar} aria-label="Fechar">×</button></header>

          <label className="cr-campo">Nome do escritório
            <input autoFocus value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex.: Padaria Pão Quente" onKeyDown={e => { if (e.key === 'Enter') fazer() }} />
          </label>

          <div className="cr-campo">Tipo
            <div className="cr-tipos">
              {Object.values(MODELOS).map(m => (
                <button key={m.id} className={m.id === modeloId ? 'on' : ''} onClick={() => trocarModelo(m.id)} title={m.descricao}>
                  <span className="in-cores">{[m.tema.marca, m.tema.destaque].map(c => <i key={c} style={{ background: c }} />)}</span>{m.nome}
                </button>
              ))}
            </div>
          </div>

          <div className="cr-campo">Quantas pessoas trabalham aí?
            <div className="cr-chips">{TAMANHOS.map(t => <button key={t.id} className={t.id === tam ? 'on' : ''} onClick={() => setTam(t.id)}>{t.nome}</button>)}</div>
          </div>

          <div className="cr-campo">Setores <small>(clique pra tirar ou pôr)</small>
            <div className="cr-chips">
              {ops.map((o, i) => <button key={o.nome} className={o.on ? 'on' : ''} onClick={() => setOps(l => l.map((x, j) => j === i ? { ...x, on: !x.on } : x))}>{o.on ? '✓ ' : ''}{o.nome}</button>)}
              <span className="cr-add">
                <input value={novo} onChange={e => setNovo(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addSetor() }} placeholder="Outro setor" aria-label="Nome do novo setor" />
                <button onClick={addSetor} disabled={!novo.trim()}>Pôr</button>
              </span>
            </div>
            {!algum && <p className="cr-erro">Ligue pelo menos um setor.</p>}
          </div>

          <footer className="cr-rodape">
            <button onClick={fechar}>Cancelar</button>
            <button className="prim" disabled={!pronto} onClick={fazer} title={nome.trim() ? '' : 'Dê um nome ao escritório'}>Criar escritório</button>
          </footer>
        </div>

        <aside className="cr-previa">
          {res ? <>
            <Planta doc={res.doc} className="cr-planta" />
            <p>{res.doc.pessoas.length} pessoas · {res.doc.andares.reduce((n, a) => n + a.salas.length, 0)} salas{res.doc.andares.length > 1 ? ` · ${res.doc.andares.length} andares` : ''}</p>
            <button onClick={() => setSeed(s => s + 1)}>↻ Outro arranjo</button>
          </> : <p className="cr-vazio">A prévia aparece aqui.</p>}
          <small>Depois dá pra mudar tudo: nomes das pessoas, salas, móveis e cores.</small>
        </aside>
      </div>
    </div>
  )
}
