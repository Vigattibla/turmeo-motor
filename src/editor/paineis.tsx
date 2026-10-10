/** painéis do lado direito do editor */
import { useEffect, useRef, useState } from 'react'
import * as cmd from '../motor/comandos'
import { KINDS, PISOS, TEMAS, isDesk } from '../motor/catalogo'
import { remobiliar } from '../motor/gerador'
import { CORES, MODELOS } from '../motor/modelos'
import { kd } from '../motor/sala'
import { CHEFE, TIPOS, type Andar, type Doc, type Lado, type Problema, type Sala, type TipoSala } from '../motor/tipos'
import { EMBLEMAS, EMBLEMA_KEYS } from '../render/bandeira'
import type { Selecao } from '../render/andar'
import type { Tokens } from '../render/tokens'
import type { Aplicar } from './Editor'
import { desenharMovel, desenharPiso } from './util'

const LADOS: Record<Lado, string> = { n: 'cima', s: 'baixo', o: 'esquerda', l: 'direita' }

/** número que só confirma ao sair do campo ou no Enter (no meio da digitação o valor é inválido) */
function Num({ valor, min, max, ok }: { valor: number; min?: number; max?: number; ok: (v: number) => void }) {
  const [v, setV] = useState(String(valor))
  useEffect(() => setV(String(valor)), [valor])
  const confirma = () => { const n = Math.round(Number(v)); if (Number.isFinite(n) && n !== valor) ok(Math.max(min ?? -Infinity, Math.min(max ?? Infinity, n))); else setV(String(valor)) }
  return <input type="number" value={v} min={min} max={max} onChange={e => setV(e.target.value)} onBlur={confirma} onKeyDown={e => e.key === 'Enter' && confirma()} />
}

function substituirSala(ns: Sala): cmd.Cmd {
  return d => ({ ...d, andares: d.andares.map(a => ({ ...a, salas: a.salas.map(s => s.id === ns.id ? ns : s) })) })
}

/* ---------- Inspetor ---------- */
type PInsp = { doc: Doc; andar: Andar; sel: Selecao; aplicar: Aplicar; selar: () => void; setSel: (s: Selecao) => void; avisar: (m: string) => void }
export function Inspetor(p: PInsp) {
  const { doc, andar, sel, aplicar, selar } = p
  const sala = sel.sala ? andar.salas.find(s => s.id === sel.sala) : undefined
  const obj = sala && sel.obj != null ? sala.objs.find(o => o.id === sel.obj) : undefined
  const corr = sel.corredor != null ? andar.corredor.objs.find(o => o.id === sel.corredor) : undefined

  if (sala && obj) {
    const k = kd(obj), mesa = isDesk(obj.k) && obj.d !== undefined
    const dono = mesa ? doc.pessoas.find(x => x.mesa?.sala === sala.id && x.mesa.d === obj.d) : undefined
    const candidatos = doc.pessoas.filter(x => !sala.setor || x.setor === sala.setor)
    return (
      <div className="pn">
        <h3>{k.nome}</h3>
        <p className="pn-dim">em {sala.nome} · posição {obj.x}, {obj.y} · {k.w}×{k.h}</p>
        {mesa && <>
          <label>Número da mesa {obj.d === CHEFE ? <b>chefia</b> : <Num valor={obj.d!} min={1} max={99} ok={n => aplicar(cmd.mesaNumero(sala.id, obj.id, n))} />}</label>
          <label>Quem senta aqui
            <select value={dono?.id ?? ''} onChange={e => {
              const id = e.target.value
              if (id) aplicar(cmd.atribuirMesa(id, { sala: sala.id, d: obj.d! }))
              else if (dono) aplicar(cmd.atribuirMesa(dono.id, null))
            }}>
              <option value="">— ninguém —</option>
              {candidatos.map(x => <option key={x.id} value={x.id}>{x.nome}{x.mesa && x.id !== dono?.id ? ' (troca de mesa)' : ''}</option>)}
            </select>
          </label>
        </>}
        <div className="pn-linha"><button className="perigo" onClick={() => aplicar(cmd.objDel(sala.id, obj.id))}>Remover (Del)</button></div>
        <p className="pn-dica">Setas movem 1 quadrado. Arraste pra mover livre.</p>
      </div>
    )
  }
  if (corr) {
    const k = kd(corr)
    return (
      <div className="pn">
        <h3>{k.nome}</h3>
        <p className="pn-dim">no corredor · posição {corr.x}, {corr.y}</p>
        <div className="pn-linha"><button className="perigo" onClick={() => aplicar(cmd.corredorDel(andar.id, corr.id))}>Remover (Del)</button></div>
      </div>
    )
  }
  if (sala) {
    const nMesas = sala.objs.filter(o => isDesk(o.k)).length
    const lados: Lado[] = ['n', 's', 'o', 'l']
    return (
      <div className="pn">
        <h3>Sala</h3>
        <label>Nome<input value={sala.nome} onChange={e => aplicar(cmd.salaEditar(sala.id, { nome: e.target.value }), 'nome-' + sala.id)} onBlur={selar} /></label>
        <label>Tipo
          <select value={sala.tipo} onChange={e => aplicar(cmd.salaEditar(sala.id, { tipo: e.target.value as TipoSala }))}>
            {Object.entries(TIPOS).map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
          </select>
        </label>
        <label>Setor dono
          <select value={sala.setor ?? ''} onChange={e => aplicar(cmd.salaEditar(sala.id, { setor: e.target.value || undefined }))}>
            <option value="">— sala comum —</option>
            {doc.setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </label>
        <div className="pn-dupla">
          <label>Largura<Num valor={sala.w} min={8} max={andar.w} ok={w => aplicar(cmd.salaRedim(sala.id, w, sala.h))} /></label>
          <label>Altura<Num valor={sala.h} min={8} max={andar.h} ok={h => aplicar(cmd.salaRedim(sala.id, sala.w, h))} /></label>
        </div>
        <label className="pn-check"><input type="checkbox" checked={!!sala.travada} onChange={e => aplicar(cmd.salaEditar(sala.id, { travada: e.target.checked }))} /> Travada (gerar de novo não mexe)</label>

        <h4>Portas</h4>
        {sala.portas.length === 0 && <p className="pn-dim">Sem porta: ninguém entra. Use a ferramenta Porta.</p>}
        {sala.portas.map((pt, i) => (
          <div key={i} className="pn-linha">
            <span>{LADOS[pt.lado]} · {pt.pos}</span>
            <button onClick={() => aplicar(cmd.portaMover(sala.id, i, pt.pos - 1))}>◀</button>
            <button onClick={() => aplicar(cmd.portaMover(sala.id, i, pt.pos + 1))}>▶</button>
            <button className="perigo" onClick={() => aplicar(cmd.portaDel(sala.id, i))}>✕</button>
          </div>
        ))}
        <h4>Vidro</h4>
        <div className="pn-chips">
          {lados.map(l => <label key={l} className="pn-check"><input type="checkbox" checked={!!sala.vidro?.includes(l)} onChange={e => aplicar(cmd.vidro(sala.id, l, e.target.checked))} /> {LADOS[l]}</label>)}
        </div>
        <p className="pn-dim">{sala.objs.length} móveis · {nMesas} mesas</p>
        <div className="pn-linha">
          <button onClick={() => { const ns = remobiliar(doc, sala.id, Math.floor(Math.random() * 1e6)); if (ns) aplicar(substituirSala(ns)) }}>Remobiliar</button>
          <button onClick={() => p.setSel({})}>Ver andar</button>
          <button className="perigo" onClick={() => aplicar(cmd.salaDel(sala.id))}>Remover sala</button>
        </div>
      </div>
    )
  }
  const faixa = andar.corredor.faixa
  return (
    <div className="pn">
      <h3>Andar</h3>
      <label>Nome<input value={andar.nome} onChange={e => aplicar(cmd.andarEditar(andar.id, { nome: e.target.value }), 'andar-nome')} onBlur={selar} /></label>
      <div className="pn-dupla">
        <label>Largura<Num valor={andar.w} min={12} max={120} ok={w => aplicar(cmd.andarEditar(andar.id, { w }))} /></label>
        <label>Altura<Num valor={andar.h} min={12} max={80} ok={h => aplicar(cmd.andarEditar(andar.id, { h }))} /></label>
      </div>
      <label>Piso do corredor
        <select value={andar.corredor.piso} onChange={e => aplicar(cmd.corredorEditar(andar.id, { piso: e.target.value }))}>
          <option value="pedra">Ladrilho do tema</option>
          {Object.entries(PISOS).map(([id, ps]) => <option key={id} value={id}>{ps.nome}</option>)}
        </select>
      </label>
      <label className="pn-check"><input type="checkbox" checked={!!faixa} onChange={e => aplicar(cmd.corredorEditar(andar.id, { faixa: e.target.checked ? { x: 3, y: andar.entrada.y - 1, w: Math.max(4, andar.w - 6), h: 3 } : null }))} /> Passadeira da marca</label>
      {faixa && <div className="pn-dupla">
        <label>Faixa y<Num valor={faixa.y} min={0} max={andar.h - 3} ok={y => aplicar(cmd.corredorEditar(andar.id, { faixa: { ...faixa, y } }))} /></label>
        <label>Faixa larg.<Num valor={faixa.w} min={2} max={andar.w} ok={w => aplicar(cmd.corredorEditar(andar.id, { faixa: { ...faixa, w } }))} /></label>
      </div>}
      <p className="pn-dim">{andar.salas.length} salas · {andar.corredor.objs.length} móveis no corredor · entrada em {andar.entrada.x}, {andar.entrada.y}</p>
      <div className="pn-linha">
        <button onClick={() => aplicar(cmd.andarOrdem(andar.id, Math.max(0, doc.andares.indexOf(andar) - 1)))}>Subir na lista</button>
        <button className="perigo" disabled={doc.andares.length < 2} onClick={() => aplicar(cmd.andarDel(andar.id))}>Remover andar</button>
      </div>
      <p className="pn-dica">Clique numa sala ou móvel pra editar. Ferramenta “Nova sala” desenha salas no corredor.</p>
    </div>
  )
}

/* ---------- Catálogo ---------- */
function Sprite({ k, tokens }: { k: string; tokens: Tokens }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [tam, setTam] = useState({ w: 36, h: 36 })
  useEffect(() => { const cv = ref.current; if (!cv) return; desenharMovel(cv, k, tokens); setTam({ w: cv.width, h: cv.height }) }, [k, tokens])
  const esc = Math.min(2, 64 / Math.max(tam.w, tam.h))
  return <canvas ref={ref} style={{ width: tam.w * esc, height: tam.h * esc }} />
}
function Ladrilho({ id }: { id: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => { if (ref.current) desenharPiso(ref.current, id) }, [id])
  return <canvas ref={ref} style={{ width: 48, height: 48 }} />
}
export function Catalogo({ doc, movel, piso, escolherMovel, escolherPiso }: { doc: Doc; movel: string; piso: string; escolherMovel: (k: string) => void; escolherPiso: (p: string) => void }) {
  const [busca, setBusca] = useState('')
  const [tema, setTema] = useState<string>('')
  const b = busca.trim().toLowerCase()
  const ver = Object.entries(KINDS).filter(([id, k]) => (!tema || k.tema === tema) && (!b || id.includes(b) || k.nome.toLowerCase().includes(b)))
  return (
    <div className="pn">
      <input className="pn-busca" placeholder="Buscar móvel…" value={busca} onChange={e => setBusca(e.target.value)} />
      <div className="pn-chips">
        <button className={!tema ? 'on' : ''} onClick={() => setTema('')}>Todos</button>
        {TEMAS.map(t => <button key={t} className={tema === t ? 'on' : ''} onClick={() => setTema(t)}>{t}</button>)}
      </div>
      <div className="pn-grade">
        {ver.map(([id, k]) => (
          <button key={id} className={'pn-item' + (id === movel ? ' on' : '')} onClick={() => escolherMovel(id)} title={`${k.nome} · ${k.w}×${k.h}${k.camada ? ' · ' + k.camada : ''}`}>
            <Sprite k={id} tokens={doc.tema} /><small>{k.nome}</small>
          </button>
        ))}
      </div>
      <h4>Pisos</h4>
      <div className="pn-grade">
        {Object.entries(PISOS).map(([id, ps]) => (
          <button key={id} className={'pn-item' + (id === piso ? ' on' : '')} onClick={() => escolherPiso(id)}><Ladrilho id={id} /><small>{ps.nome}</small></button>
        ))}
      </div>
      <p className="pn-dica">Novos móveis e pisos entram por registrarMovel / registrarPiso — aparecem aqui sozinhos.</p>
    </div>
  )
}

/* ---------- Setores ---------- */
export function Setores({ doc, aplicar, selar }: { doc: Doc; aplicar: Aplicar; selar: () => void }) {
  return (
    <div className="pn">
      {doc.setores.map(s => {
        const salas = doc.andares.flatMap(a => a.salas).filter(x => x.setor === s.id).length
        const gente = doc.pessoas.filter(x => x.setor === s.id).length
        return (
          <div key={s.id} className="pn-card" style={{ borderLeftColor: s.cor }}>
            <div className="pn-linha">
              <input type="color" value={s.cor} onChange={e => aplicar(cmd.setorEditar(s.id, { cor: e.target.value }), 'cor-' + s.id)} onBlur={selar} />
              <input value={s.nome} onChange={e => aplicar(cmd.setorEditar(s.id, { nome: e.target.value }), 'nome-' + s.id)} onBlur={selar} />
              <button className="perigo" title="Remover setor (salas viram comuns)" onClick={() => aplicar(cmd.setorDel(s.id))}>✕</button>
            </div>
            <div className="pn-dupla">
              <label>Tipo<select value={s.tipo} onChange={e => aplicar(cmd.setorEditar(s.id, { tipo: e.target.value as 'setor' | 'vendas' }))}><option value="setor">Mesas</option><option value="vendas">Baias (vendas)</option></select></label>
              <label>Pessoas<Num valor={s.pessoas} min={1} max={60} ok={n => aplicar(cmd.setorEditar(s.id, { pessoas: n }))} /></label>
            </div>
            <div className="pn-dupla">
              <label>Bandeira<select value={s.emblema ?? ''} onChange={e => aplicar(cmd.setorEditar(s.id, { emblema: e.target.value || null }))}>
                <option value="">— lisa —</option>
                {EMBLEMA_KEYS.map(k => <option key={k} value={k}>{EMBLEMAS[k].label}</option>)}
              </select></label>
              <label className="pn-check"><input type="checkbox" checked={!!s.lider} onChange={e => aplicar(cmd.setorEditar(s.id, { lider: e.target.checked }))} /> mesa de chefia</label>
            </div>
            <p className="pn-dim">{salas} sala(s) · {gente} pessoa(s) cadastrada(s)</p>
          </div>
        )
      })}
      <div className="pn-linha">
        <button onClick={() => aplicar(cmd.setorAdd({ nome: 'Novo setor', cor: CORES[doc.setores.length % CORES.length], pessoas: 4, tipo: 'setor', lider: false }))}>＋ Setor</button>
      </div>
      <p className="pn-dica">Setor novo ganha sala no “Gerar de novo”, ou desenhe uma sala e escolha o setor dono no Inspetor.</p>
    </div>
  )
}

/* ---------- Pessoas ---------- */
export function Pessoas({ doc, aplicar, selar, focar }: { doc: Doc; aplicar: Aplicar; selar: () => void; focar: (sala?: string, andar?: string, obj?: number) => void }) {
  const ondeEsta = (sala: string, d: number) => {
    for (const a of doc.andares) { const s = a.salas.find(x => x.id === sala); if (s) return { a, s, o: s.objs.find(o => o.d === d) } }
    return null
  }
  const semSetor = doc.pessoas.filter(p => !doc.setores.some(s => s.id === p.setor))
  return (
    <div className="pn">
      <div className="pn-linha">
        <button onClick={() => aplicar(cmd.distribuir(false))}>Distribuir quem está sem mesa</button>
        <button onClick={() => aplicar(cmd.distribuir(true))}>Refazer tudo</button>
      </div>
      {doc.setores.map(st => {
        const gente = doc.pessoas.filter(p => p.setor === st.id)
        return (
          <div key={st.id} className="pn-card" style={{ borderLeftColor: st.cor }}>
            <h4>{st.nome} <span className="pn-dim">({gente.length})</span></h4>
            {gente.map(p => {
              const w = p.mesa ? ondeEsta(p.mesa.sala, p.mesa.d) : null
              return (
                <div key={p.id} className="pn-linha">
                  <input value={p.nome} onChange={e => aplicar(cmd.pessoaEditar(p.id, { nome: e.target.value }), 'pn-' + p.id)} onBlur={selar} />
                  <label className="pn-check" title="Chefia"><input type="checkbox" checked={!!p.chefe} onChange={e => aplicar(cmd.pessoaEditar(p.id, { chefe: e.target.checked }))} />★</label>
                  {w ? <button className="pn-mesa" onClick={() => focar(w.s.id, w.a.id, w.o?.id)}>{p.mesa!.d === CHEFE ? 'chefia' : `mesa ${p.mesa!.d + 1}`}</button> : <span className="pn-sem">sem mesa</span>}
                  <button className="perigo" onClick={() => aplicar(cmd.pessoaDel(p.id))}>✕</button>
                </div>
              )
            })}
            <button onClick={() => aplicar(cmd.pessoaAdd({ nome: `${st.nome} ${gente.length + 1}`, setor: st.id }))}>＋ Pessoa</button>
          </div>
        )
      })}
      {semSetor.length > 0 && <p className="pn-dim">{semSetor.length} pessoa(s) com setor que não existe mais.</p>}
      {!doc.setores.length && <p className="pn-dica">Crie setores primeiro (aba Setores ou Assistente).</p>}
    </div>
  )
}

/* ---------- Problemas ---------- */
export function Problemas({ problemas, focar }: { problemas: Problema[]; focar: (sala?: string, andar?: string, obj?: number) => void }) {
  if (!problemas.length) return <div className="pn"><p className="pn-ok">Tudo certo: todo mundo chega na sua mesa e nada se sobrepõe.</p></div>
  const ord = [...problemas].sort((a, b) => (a.nivel === b.nivel ? 0 : a.nivel === 'erro' ? -1 : 1))
  return (
    <div className="pn">
      {ord.map((p, i) => (
        <button key={i} className={'pn-prob ' + p.nivel} onClick={() => focar(p.sala, p.andar, p.obj)}>
          <b>{p.nivel === 'erro' ? 'Erro' : 'Aviso'}</b> {p.msg}
        </button>
      ))}
    </div>
  )
}

/* ---------- Tema ---------- */
const NOMES_TOKEN: Record<keyof Tokens, string> = {
  marca: 'Cor da marca', destaque: 'Destaque', marcaClara: 'Marca clara (miolo)', marcaDetalhe: 'Detalhe da marca',
  pedraA: 'Ladrilho A', pedraB: 'Ladrilho B', rejunte: 'Rejunte',
}
export function TemaPainel({ doc, aplicar, selar }: { doc: Doc; aplicar: Aplicar; selar: () => void }) {
  return (
    <div className="pn">
      <h3>Tema da empresa</h3>
      {(Object.keys(NOMES_TOKEN) as (keyof Tokens)[]).map(k => (
        <label key={k} className="pn-cor">
          <input type="color" value={doc.tema[k]} onChange={e => aplicar(cmd.tema({ [k]: e.target.value }), 'tema-' + k)} onBlur={selar} />
          {NOMES_TOKEN[k]} <code>{doc.tema[k]}</code>
        </label>
      ))}
      <h4>Começar de um modelo</h4>
      <div className="pn-grade">
        {Object.values(MODELOS).map(m => (
          <button key={m.id} className={'pn-modelo' + (m.id === doc.modelo ? ' on' : '')} onClick={() => aplicar(cmd.lote(cmd.tema(m.tema), d => ({ ...d, modelo: m.id })))} title={m.descricao}>
            <span className="pn-amostra">{[m.tema.marca, m.tema.destaque, m.tema.pedraA].map(c => <i key={c} style={{ background: c }} />)}</span>
            <small>{m.nome}</small>
          </button>
        ))}
      </div>
      <p className="pn-dica">Trocar o modelo muda as cores agora; a decoração do modelo entra no “Gerar de novo”.</p>
    </div>
  )
}
