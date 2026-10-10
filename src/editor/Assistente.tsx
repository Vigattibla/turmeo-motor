/** assistente de criação: empresa → modelo → setores → pessoas → salas comuns → resultado */
import { useEffect, useMemo, useRef, useState } from 'react'
import { gerar, type Resultado } from '../motor/gerador'
import { CORES, MODELOS, modelo, sugerirExtras } from '../motor/modelos'
import { pessoasExemplo } from '../motor/pessoas'
import { erros } from '../motor/validar'
import { TIPOS, type Andar, type Doc, type Pessoa, type Setor, type TipoSala } from '../motor/tipos'
import { T } from '../render/base'
import { desenharAndar } from '../render/andar'
import { fatiar } from './util'

const PASSOS = ['Empresa', 'Modelo', 'Setores', 'Pessoas', 'Salas comuns', 'Resultado']
const COMUNS: TipoSala[] = ['recepcao', 'reuniao', 'copa', 'foco', 'livre']

function Miniatura({ doc, andar }: { doc: Doc; andar: Andar }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current; if (!cv) return
    cv.width = andar.w * T; cv.height = andar.h * T
    const c = cv.getContext('2d')!; c.imageSmoothingEnabled = false
    desenharAndar(c, doc, andar, { t: 0 })
  }, [doc, andar])
  return <canvas ref={ref} className="as-mini" />
}

function setoresDoModelo(id: string): Setor[] {
  return modelo(id).setores.map((s, i) => ({ ...s, id: `setor-${fatiar(s.nome)}-${i}` }))
}
function lerNomes(txt: string, st: Setor): Pessoa[] {
  const linhas = txt.split('\n').map(l => l.trim()).filter(Boolean)
  const marcou = linhas.some(l => l.startsWith('*'))
  return linhas.map((l, i) => {
    const chefe = l.startsWith('*') || (!marcou && i === 0 && !!st.lider)
    return { id: `${st.id}-p${i + 1}`, nome: l.replace(/^\*\s*/, ''), setor: st.id, ...(chefe ? { chefe: true } : {}), mesa: null }
  })
}

export function Assistente({ doc, podeFechar, fechar, usar }: { doc: Doc; podeFechar: boolean; fechar: () => void; usar: (d: Doc) => void }) {
  const [passo, setPasso] = useState(0)
  const [nome, setNome] = useState(doc.empresa.nome === 'Nova empresa' ? '' : doc.empresa.nome)
  const [modeloId, setModeloId] = useState(doc.setores.length ? doc.modelo : 'escritorio')
  const [setores, setSetores] = useState<Setor[]>(() => doc.setores.length ? doc.setores : setoresDoModelo('escritorio'))
  const [nomes, setNomes] = useState<Record<string, string>>({})
  const [extras, setExtras] = useState<Partial<Record<TipoSala, number>> | null>(null)
  const [seed, setSeed] = useState(1)
  const [r, setR] = useState<Resultado | null>(null)

  const m = modelo(modeloId)
  const pessoas = useMemo(() => setores.flatMap(st => nomes[st.id]?.trim() ? lerNomes(nomes[st.id], st) : pessoasExemplo(st)), [setores, nomes])
  const total = pessoas.length
  const contagem = extras ?? Object.fromEntries(COMUNS.map(t => [t, sugerirExtras(total, m).filter(x => x === t).length]))
  const listaExtras = COMUNS.flatMap(t => Array<TipoSala>(contagem[t] ?? 0).fill(t))

  const trocarModelo = (id: string) => { setModeloId(id); setSetores(setoresDoModelo(id)); setNomes({}); setExtras(null) }
  const editarSetor = (i: number, p: Partial<Setor>) => setSetores(ss => ss.map((s, j) => j === i ? { ...s, ...p } : s))

  const rodar = (sd: number) => {
    const sts = setores.map(st => { const n = pessoas.filter(p => p.setor === st.id).length; return n ? { ...st, pessoas: n } : st })
    const res = gerar({ empresa: { nome: nome.trim() || 'Minha empresa' }, modelo: modeloId, setores: sts, pessoas, extras: listaExtras }, sd)
    setR(res); setSeed(res.seed)
  }
  const ir = (n: number) => { if (n === 5) rodar(seed); setPasso(n) }
  const podeSeguir = passo === 0 ? true : passo === 2 ? setores.length > 0 && setores.every(s => s.nome.trim()) : true

  return (
    <div className="as-fundo" onMouseDown={e => { if (e.target === e.currentTarget && podeFechar) fechar() }}>
      <div className="as" role="dialog" aria-label="Assistente de layout">
        <header className="as-topo">
          <ol>{PASSOS.map((p, i) => <li key={p} className={i === passo ? 'on' : i < passo ? 'feito' : ''} onClick={() => i < passo && setPasso(i)}>{p}</li>)}</ol>
          {podeFechar && <button className="as-x" onClick={fechar} aria-label="Fechar">✕</button>}
        </header>

        <div className="as-corpo">
          {passo === 0 && <>
            <h2>Qual é a empresa?</h2>
            <p>O nome vai na placa da entrada e nos arquivos exportados.</p>
            <input autoFocus className="as-grande" placeholder="Ex.: Village Resort" value={nome} onChange={e => setNome(e.target.value)} onKeyDown={e => e.key === 'Enter' && ir(1)} />
          </>}

          {passo === 1 && <>
            <h2>Que tipo de escritório?</h2>
            <p>O modelo define cores, pisos, móveis e decoração. Dá pra mudar tudo depois.</p>
            <div className="as-modelos">
              {Object.values(MODELOS).map(md => (
                <button key={md.id} className={md.id === modeloId ? 'on' : ''} onClick={() => trocarModelo(md.id)}>
                  <span className="as-amostra">{[md.tema.marca, md.tema.marcaClara, md.tema.destaque, md.tema.pedraA].map((c, i) => <i key={i} style={{ background: c }} />)}</span>
                  <b>{md.nome}</b><small>{md.descricao}</small>
                  <small className="as-dim">{md.setores.length} setores sugeridos</small>
                </button>
              ))}
            </div>
          </>}

          {passo === 2 && <>
            <h2>Setores</h2>
            <p>Cada setor ganha sala própria, cor e bandeira na porta. Vendas usa baias.</p>
            <div className="as-tabela">
              <div className="as-cab"><span>Cor</span><span>Nome</span><span>Pessoas</span><span>Tipo</span><span>Chefia</span><span /></div>
              {setores.map((s, i) => (
                <div key={s.id} className="as-lin">
                  <input type="color" value={s.cor} onChange={e => editarSetor(i, { cor: e.target.value })} />
                  <input value={s.nome} onChange={e => editarSetor(i, { nome: e.target.value })} />
                  <input type="number" min={1} max={60} value={s.pessoas} onChange={e => editarSetor(i, { pessoas: Math.max(1, Math.min(60, Number(e.target.value) || 1)) })} />
                  <select value={s.tipo} onChange={e => editarSetor(i, { tipo: e.target.value as Setor['tipo'] })}><option value="setor">Mesas</option><option value="vendas">Baias</option></select>
                  <input type="checkbox" checked={!!s.lider} onChange={e => editarSetor(i, { lider: e.target.checked })} />
                  <button onClick={() => setSetores(ss => ss.filter((_, j) => j !== i))} aria-label="Remover">✕</button>
                </div>
              ))}
            </div>
            <button onClick={() => setSetores(ss => [...ss, { id: `setor-${Date.now().toString(36)}`, nome: 'Novo setor', cor: CORES[ss.length % CORES.length], pessoas: 4, tipo: 'setor', lider: false }])}>＋ Setor</button>
          </>}

          {passo === 3 && <>
            <h2>Pessoas</h2>
            <p>Opcional. Um nome por linha; <code>*</code> na frente marca a chefia. Em branco, o motor cria nomes de exemplo.</p>
            <div className="as-pessoas">
              {setores.map(st => (
                <label key={st.id} style={{ borderTopColor: st.cor }}>
                  <b>{st.nome}</b> <small>{nomes[st.id]?.trim() ? lerNomes(nomes[st.id], st).length : st.pessoas} pessoa(s)</small>
                  <textarea rows={5} placeholder={pessoasExemplo(st).map(p => (p.chefe ? '*' : '') + p.nome).join('\n')} value={nomes[st.id] ?? ''} onChange={e => setNomes(n => ({ ...n, [st.id]: e.target.value }))} />
                </label>
              ))}
            </div>
          </>}

          {passo === 4 && <>
            <h2>Salas comuns</h2>
            <p>Sugestão para {total} pessoas no modelo {m.nome}. Ajuste a quantidade de cada uma.</p>
            <div className="as-comuns">
              {COMUNS.map(t => (
                <label key={t}>
                  <span>{TIPOS[t]}</span>
                  <span className="as-cont">
                    <button onClick={() => setExtras({ ...contagem, [t]: Math.max(0, (contagem[t] ?? 0) - 1) })}>−</button>
                    <b>{contagem[t] ?? 0}</b>
                    <button onClick={() => setExtras({ ...contagem, [t]: Math.min(4, (contagem[t] ?? 0) + 1) })}>＋</button>
                  </span>
                </label>
              ))}
            </div>
          </>}

          {passo === 5 && r && <>
            <h2>{r.doc.andares.length > 1 ? `${r.doc.andares.length} andares` : 'Seu andar'} <small className="as-dim">opção {r.seed}</small></h2>
            <p>{erros(r.problemas).length ? `${erros(r.problemas).length} problema(s) — dá pra corrigir no editor (aba Problemas).` : 'Sem problemas: todo mundo chega na sua mesa.'} {r.problemas.length - erros(r.problemas).length ? `${r.problemas.length - erros(r.problemas).length} aviso(s).` : ''}</p>
            <div className="as-res">{r.doc.andares.map(a => <figure key={a.id}><figcaption>{a.nome}</figcaption><Miniatura doc={r.doc} andar={a} /></figure>)}</div>
          </>}
        </div>

        <footer className="as-rodape">
          {passo > 0 ? <button onClick={() => setPasso(passo - 1)}>Voltar</button> : <span />}
          {passo < 5 && <button className="prim" disabled={!podeSeguir} onClick={() => ir(passo + 1)}>{passo === 4 ? 'Gerar layout' : 'Continuar'}</button>}
          {passo === 5 && <span className="as-fim">
            <button onClick={() => rodar(seed + 1)}>Outra opção</button>
            <button className="prim" onClick={() => r && usar(r.doc)}>Usar este layout</button>
          </span>}
        </footer>
      </div>
    </div>
  )
}
