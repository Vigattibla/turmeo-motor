/**
 * Editor completo do motor: prancheta (canvas) + ferramentas + painéis + assistente.
 * Toda mudança passa por um comando puro no Historico — desfazer/refazer de graça.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { abrir } from '../motor/doc'
import { Historico } from '../motor/comandos'
import * as cmd from '../motor/comandos'
import { regerar } from '../motor/gerador'
import { paraV0 } from '../motor/migrar'
import { salaEm } from '../motor/andar'
import { hitTest, kd } from '../motor/sala'
import { validar, erros } from '../motor/validar'
import type { Doc, Lado, Obj, Sala } from '../motor/tipos'
import { T } from '../render/base'
import { desenharAndar, type Selecao } from '../render/andar'
import { Assistente } from './Assistente'
import { Catalogo, Inspetor, Pessoas, Problemas, Setores, TemaPainel } from './paineis'
import { baixar, escolherArquivo } from './util'
import { salvar } from './loja'

export type Ferramenta = 'sel' | 'add' | 'piso' | 'div' | 'sala' | 'porta' | 'vidro' | 'apagar' | 'entrada'
/** as quatro primeiras ficam sempre à vista; o resto em "Mais" */
const FERRAMENTAS: { id: Ferramenta; nome: string; icone: string; dica: string }[] = [
  { id: 'sel', nome: 'Mover', icone: '↖', dica: 'Clique numa sala ou móvel pra ver e mudar; arraste pra mover. O quadradinho amarelo no canto da sala muda o tamanho.' },
  { id: 'add', nome: 'Móvel', icone: '▣', dica: 'Escolha um móvel na aba Móveis e clique onde ele vai.' },
  { id: 'sala', nome: 'Nova sala', icone: '⬚', dica: 'Arraste no corredor pra desenhar a sala (precisa de pelo menos 8 quadradinhos de cada lado).' },
  { id: 'apagar', nome: 'Apagar', icone: '⌫', dica: 'Clique num móvel pra tirar. Pra apagar a sala inteira, selecione e aperte Delete.' },
  { id: 'piso', nome: 'Piso', icone: '▦', dica: 'Escolha o piso na aba Móveis e arraste pra pintar. No corredor troca o piso inteiro.' },
  { id: 'div', nome: 'Divisória', icone: '┃', dica: 'Arraste pra levantar; com Shift ou botão direito, tira.' },
  { id: 'porta', nome: 'Porta', icone: '⊓', dica: 'Clique numa parede pra pôr porta; clique numa porta pra tirar.' },
  { id: 'vidro', nome: 'Vidro', icone: '◫', dica: 'Clique numa parede pra ligar/desligar o vidro daquele lado.' },
  { id: 'entrada', nome: 'Entrada', icone: '⇲', dica: 'Clique no corredor onde a pessoa chega no andar.' },
]
const BASICAS = 4
type Aba = 'inspetor' | 'catalogo' | 'setores' | 'pessoas' | 'problemas' | 'tema'
const DICA_VISTA = 'turmeo-motor:dica-vista'

type Arrasto =
  | { tipo: 'obj'; sala: string; id: number; dx: number; dy: number; recusa?: string | null }
  | { tipo: 'corr'; id: number; dx: number; dy: number; recusa?: string | null }
  | { tipo: 'sala'; id: string; dx: number; dy: number; recusa?: string | null }
  | { tipo: 'redim'; id: string; recusa?: string | null }
  | { tipo: 'pincel'; liga: boolean }
  | { tipo: 'ret'; x0: number; y0: number }
  | { tipo: 'pan'; sx: number; sy: number; l: number; t: number }


/** qual parede o tile local toca; null = miolo */
function ladoDe(s: Sala, lx: number, ly: number): { lado: Lado; pos: number } | null {
  if ((lx === 0 || lx === s.w - 1) && ly >= 2 && ly <= s.h - 2) return { lado: lx === 0 ? 'o' : 'l', pos: ly }
  if (ly <= 1 && lx >= 1 && lx <= s.w - 2) return { lado: 'n', pos: lx }
  if (ly === s.h - 1 && lx >= 1 && lx <= s.w - 2) return { lado: 's', pos: lx }
  return null
}

export function Editor({ inicial, voltar }: { inicial: Doc; voltar: () => void }) {
  const ini = useMemo(() => ({ doc: inicial }), [inicial])
  const hist = useMemo(() => new Historico(ini.doc), [ini])
  const [doc, setDoc] = useState(ini.doc)
  const [, setVer] = useState(0)
  useEffect(() => hist.ouvir(d => { setDoc(d); setVer(v => v + 1) }), [hist])

  const [andarId, setAndarId] = useState(ini.doc.andares[0].id)
  const andar = doc.andares.find(a => a.id === andarId) ?? doc.andares[0]
  const [ferramenta, setFerramenta] = useState<Ferramenta>('sel')
  const [movel, setMovel] = useState('planta')
  const [piso, setPiso] = useState('madeira')
  const [sel, setSel] = useState<Selecao>({})
  const [zoom, setZoom] = useState(2)
  const [grade, setGrade] = useState(false)
  const [aba, setAba] = useState<Aba>('inspetor')
  const [aviso, setAviso] = useState<string | null>(null)
  const [assistente, setAssistente] = useState(false)
  const [mais, setMais] = useState(false)
  const [menu, setMenu] = useState(false)
  const [salvo, setSalvo] = useState(true)
  const [dica, setDica] = useState(() => { try { return !localStorage.getItem(DICA_VISTA) } catch { return false } })
  const fecharDica = () => { setDica(false); try { localStorage.setItem(DICA_VISTA, '1') } catch { /* sem armazenamento */ } }

  const canvas = useRef<HTMLCanvasElement>(null)
  const palco = useRef<HTMLDivElement>(null)
  const arrasto = useRef<Arrasto | null>(null)
  const mouse = useRef<{ px: number; py: number } | null>(null)
  const ret = useRef<{ x: number; y: number; w: number; h: number } | null>(null)

  const avisar = useCallback((m: string | null) => { setAviso(m); if (m) setTimeout(() => setAviso(a => a === m ? null : a), 4000) }, [])
  const aplicar = useCallback((c: cmd.Cmd, chave?: string) => { const r = hist.aplicar(c, chave); if (r) avisar(r); return r }, [hist, avisar])

  // salvar sozinho (no navegador), sem travar a digitação
  const primeiro = useRef(true)
  useEffect(() => {
    if (primeiro.current) { primeiro.current = false; return }
    setSalvo(false)
    const t = setTimeout(() => { salvar(doc); setSalvo(true) }, 400); return () => clearTimeout(t)
  }, [doc])
  // seleção que sumiu (desfazer, regerar) é limpa
  useEffect(() => {
    if (!doc.andares.some(a => a.id === andarId)) setAndarId(doc.andares[0].id)
    setSel(s => {
      if (s.sala && !andar.salas.some(x => x.id === s.sala)) return {}
      if (s.sala && s.obj != null && !andar.salas.find(x => x.id === s.sala)?.objs.some(o => o.id === s.obj)) return { sala: s.sala }
      if (s.corredor != null && !andar.corredor.objs.some(o => o.id === s.corredor)) return {}
      return s
    })
  }, [doc, andarId, andar])

  const problemas = useMemo(() => validar(doc), [doc])
  const nErros = erros(problemas).length

  /* ---------- desenho (rAF; fundos ficam em cache no render) ---------- */
  // zoom que cabe o andar inteiro no palco (ao abrir, trocar de andar ou mudar o tamanho)
  const ajustar = useCallback(() => {
    const p = palco.current; if (!p) return
    const z = Math.min((p.clientWidth - 48) / (andar.w * T), (p.clientHeight - 48) / (andar.h * T))
    setZoom(Math.max(0.5, Math.min(4, Math.floor(z * 4) / 4)))
  }, [andar.w, andar.h])
  useEffect(() => { ajustar() }, [ajustar, andar.id])

  const estado = useRef({ doc, andar, sel, grade, ferramenta, movel })
  estado.current = { doc, andar, sel, grade, ferramenta, movel }
  useEffect(() => {
    let id = 0
    const passo = (agora: number) => {
      const cv = canvas.current
      if (cv) {
        const { doc, andar: a, sel, grade, ferramenta, movel } = estado.current
        if (cv.width !== a.w * T || cv.height !== a.h * T) { cv.width = a.w * T; cv.height = a.h * T }
        const c = cv.getContext('2d')!
        c.imageSmoothingEnabled = false
        c.clearRect(0, 0, cv.width, cv.height)
        const ar = arrasto.current
        desenharAndar(c, doc, a, { t: agora / 1000, grade, sel })
        const m = mouse.current
        if (ret.current) {
          const r = ret.current
          c.save(); c.fillStyle = 'rgba(36,64,255,.18)'; c.fillRect(r.x * T, r.y * T, r.w * T, r.h * T)
          c.strokeStyle = r.w >= 8 && r.h >= 8 ? '#2440FF' : '#e2553f'; c.lineWidth = 2; c.setLineDash([6, 3]); c.strokeRect(r.x * T + 1, r.y * T + 1, r.w * T - 2, r.h * T - 2)
          c.fillStyle = '#1b2240'; c.font = 'bold 12px system-ui'; c.fillText(`${r.w}×${r.h}`, r.x * T + 6, r.y * T + 16); c.restore()
        }
        if (sel.sala && sel.obj == null && ferramenta === 'sel') {
          const s = a.salas.find(x => x.id === sel.sala)
          if (s) { c.fillStyle = '#FFC600'; c.fillRect((s.x + s.w) * T - 9, (s.y + s.h) * T - 9, 8, 8); c.strokeStyle = '#1b2240'; c.lineWidth = 1; c.strokeRect((s.x + s.w) * T - 8.5, (s.y + s.h) * T - 8.5, 7, 7) }
        }
        if (m && !ar) {
          const tx = Math.floor(m.px / T), ty = Math.floor(m.py / T)
          if (ferramenta === 'add') {
            const k = kd({ id: 0, k: movel, x: 0, y: 0 }), s = salaEm(a, tx, ty)
            c.save(); c.globalAlpha = 0.6
            try { k.draw(c, tx * T, k.camada === 'parede' && s ? s.y * T : ty * T, 0) } catch { /* sem prévia */ }
            c.restore()
            c.strokeStyle = '#2440FF'; c.lineWidth = 1; c.strokeRect(tx * T + 0.5, ty * T + 0.5, k.w * T - 1, k.h * T - 1)
          } else if (ferramenta !== 'sel') {
            c.strokeStyle = ferramenta === 'apagar' ? '#e2553f' : '#2440FF'; c.lineWidth = 1
            const w = ferramenta === 'porta' ? 2 : 1
            c.strokeRect(tx * T + 0.5, ty * T + 0.5, w * T - 1, T - 1)
          }
        }
      }
      id = requestAnimationFrame(passo)
    }
    id = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(id)
  }, [])

  /* ---------- mouse na prancheta ---------- */
  const ponto = (e: React.MouseEvent) => {
    const r = canvas.current!.getBoundingClientRect()
    const px = (e.clientX - r.left) / zoom, py = (e.clientY - r.top) / zoom
    return { px, py, tx: Math.floor(px / T), ty: Math.floor(py / T) }
  }
  const alvo = (px: number, py: number) => {
    const tx = Math.floor(px / T), ty = Math.floor(py / T)
    const s = salaEm(andar, tx, ty)
    if (s) return { s, o: hitTest(s.objs, px - s.x * T, py - s.y * T), lx: tx - s.x, ly: ty - s.y }
    return { s: undefined, corr: hitTest(andar.corredor.objs, px, py), lx: 0, ly: 0 }
  }
  const pincel = (px: number, py: number, liga: boolean) => {
    const tx = Math.floor(px / T), ty = Math.floor(py / T), s = salaEm(andar, tx, ty)
    if (!s) return
    const t = { x: tx - s.x, y: ty - s.y }
    if (ferramenta === 'piso') aplicar(cmd.pintarPiso(s.id, [t], piso), 'piso')
    else hist.aplicar(cmd.divisoria(s.id, [t], liga), 'div')
  }

  const baixo = (e: React.MouseEvent) => {
    const { px, py, tx, ty } = ponto(e)
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      const p = palco.current!; arrasto.current = { tipo: 'pan', sx: e.clientX, sy: e.clientY, l: p.scrollLeft, t: p.scrollTop }; return
    }
    const a = alvo(px, py)
    switch (ferramenta) {
      case 'sel': {
        const sS = sel.sala ? andar.salas.find(x => x.id === sel.sala) : undefined
        if (sS && sel.obj == null && tx === sS.x + sS.w - 1 && ty === sS.y + sS.h - 1 && px >= (sS.x + sS.w) * T - 10 && py >= (sS.y + sS.h) * T - 10) {
          arrasto.current = { tipo: 'redim', id: sS.id }; return
        }
        if (a.s && a.o) { setSel({ sala: a.s.id, obj: a.o.id }); setAba('inspetor'); arrasto.current = { tipo: 'obj', sala: a.s.id, id: a.o.id, dx: a.lx - a.o.x, dy: a.ly - a.o.y }; return }
        if (a.s) { setSel({ sala: a.s.id }); setAba('inspetor'); arrasto.current = { tipo: 'sala', id: a.s.id, dx: tx - a.s.x, dy: ty - a.s.y }; return }
        if (a.corr) { setSel({ corredor: a.corr.id }); setAba('inspetor'); arrasto.current = { tipo: 'corr', id: a.corr.id, dx: tx - a.corr.x, dy: ty - a.corr.y }; return }
        setSel({}); return
      }
      case 'add': {
        const k = kd({ id: 0, k: movel, x: 0, y: 0 })
        if (a.s) { if (!aplicar(cmd.objAdd(a.s.id, { k: movel, x: a.lx, y: k.camada === 'parede' ? 0 : a.ly }, movel === 'mesa-chefe'))) avisar(null) }
        else aplicar(cmd.corredorAdd(andar.id, { k: movel, x: tx, y: ty }))
        return
      }
      case 'piso': case 'div': {
        if (!a.s) { if (ferramenta === 'piso') aplicar(cmd.corredorEditar(andar.id, { piso })); return }
        const liga = !(e.shiftKey || e.button === 2)
        arrasto.current = { tipo: 'pincel', liga }; pincel(px, py, liga); return
      }
      case 'sala': {
        if (a.s) { avisar('Comece o retângulo no corredor'); return }
        arrasto.current = { tipo: 'ret', x0: tx, y0: ty }; ret.current = { x: tx, y: ty, w: 1, h: 1 }; return
      }
      case 'porta': {
        if (!a.s) return
        const l = ladoDe(a.s, a.lx, a.ly)
        if (!l) { avisar('Clique numa parede da sala'); return }
        const i = a.s.portas.findIndex(p => p.lado === l.lado && (p.pos === l.pos || p.pos === l.pos - 1))
        if (i >= 0) aplicar(cmd.portaDel(a.s.id, i))
        else aplicar(cmd.portaAdd(a.s.id, { lado: l.lado, pos: l.pos }))
        return
      }
      case 'vidro': {
        if (!a.s) return
        const l = ladoDe(a.s, a.lx, a.ly)
        if (!l) { avisar('Clique numa parede da sala'); return }
        aplicar(cmd.vidro(a.s.id, l.lado, !a.s.vidro?.includes(l.lado))); return
      }
      case 'apagar': {
        if (a.s && a.o) aplicar(cmd.objDel(a.s.id, a.o.id))
        else if (a.corr) aplicar(cmd.corredorDel(andar.id, a.corr.id))
        return
      }
      case 'entrada': if (!a.s) aplicar(cmd.entrada(andar.id, tx, ty)); return
    }
  }
  const mover = (e: React.MouseEvent) => {
    const { px, py, tx, ty } = ponto(e)
    mouse.current = { px, py }
    const ar = arrasto.current
    if (!ar) return
    switch (ar.tipo) {
      case 'pan': { const p = palco.current!; p.scrollLeft = ar.l - (e.clientX - ar.sx); p.scrollTop = ar.t - (e.clientY - ar.sy); return }
      case 'obj': { const s = andar.salas.find(x => x.id === ar.sala); if (!s) return; const o = s.objs.find(x => x.id === ar.id)!; const lx = tx - s.x - ar.dx, ly = kd(o).camada === 'parede' ? o.y : ty - s.y - ar.dy; ar.recusa = hist.aplicar(cmd.objMover(ar.sala, ar.id, lx, ly), 'mv-o' + ar.id); return }
      case 'corr': ar.recusa = hist.aplicar(cmd.corredorMover(andar.id, ar.id, tx - ar.dx, ty - ar.dy), 'mv-c' + ar.id); return
      case 'sala': ar.recusa = hist.aplicar(cmd.salaMover(ar.id, tx - ar.dx, ty - ar.dy), 'mv-s' + ar.id); return
      case 'redim': { const s = andar.salas.find(x => x.id === ar.id); if (s) ar.recusa = hist.aplicar(cmd.salaRedim(s.id, tx - s.x + 1, ty - s.y + 1), 'rd-' + s.id); return }
      case 'pincel': pincel(px, py, ar.liga); return
      case 'ret': ret.current = { x: Math.min(ar.x0, tx), y: Math.min(ar.y0, ty), w: Math.abs(tx - ar.x0) + 1, h: Math.abs(ty - ar.y0) + 1 }; return
    }
  }
  const cima = () => {
    const ar = arrasto.current
    arrasto.current = null
    hist.selar()
    if (!ar) return
    if ('recusa' in ar && ar.recusa) avisar(ar.recusa)
    if (ar.tipo === 'ret' && ret.current) {
      const r = ret.current; ret.current = null
      if (r.w < 8 || r.h < 8) { avisar('Sala precisa de pelo menos 8×8'); return }
      const id = 'sala-' + Date.now().toString(36)
      if (!aplicar(cmd.salaAdd(andar.id, { nome: 'Nova sala', tipo: 'livre', id, ...r }))) { setSel({ sala: id }); setAba('inspetor'); setFerramenta('sel') }
    }
  }

  /* ---------- teclado ---------- */
  const teclas = useRef<(e: KeyboardEvent) => void>(() => {})
  teclas.current = (e: KeyboardEvent) => {
    const el = e.target as HTMLElement
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return
    const ctrl = e.ctrlKey || e.metaKey
    if (ctrl && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) hist.refazer(); else hist.desfazer(); return }
    if (ctrl && e.key.toLowerCase() === 'y') { e.preventDefault(); hist.refazer(); return }
    if (ctrl) return
    if (e.key === 'Escape') { setSel({}); setFerramenta('sel'); setMenu(false); ret.current = null; arrasto.current = null; return }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (sel.sala && sel.obj != null) aplicar(cmd.objDel(sel.sala, sel.obj))
      else if (sel.corredor != null) aplicar(cmd.corredorDel(andar.id, sel.corredor))
      else if (sel.sala) aplicar(cmd.salaDel(sel.sala))
      return
    }
    const seta: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
    if (seta[e.key]) {
      e.preventDefault()
      const [dx, dy] = seta[e.key]
      if (sel.sala && sel.obj != null) { const o = andar.salas.find(s => s.id === sel.sala)?.objs.find(x => x.id === sel.obj); if (o) aplicar(cmd.objMover(sel.sala, o.id, o.x + dx, o.y + dy), 'seta') }
      else if (sel.corredor != null) { const o = andar.corredor.objs.find(x => x.id === sel.corredor); if (o) aplicar(cmd.corredorMover(andar.id, o.id, o.x + dx, o.y + dy), 'seta') }
      else if (sel.sala) { const s = andar.salas.find(x => x.id === sel.sala); if (s) aplicar(cmd.salaMover(s.id, s.x + dx, s.y + dy), 'seta') }
      return
    }
    const n = Number(e.key)
    if (n >= 1 && n <= FERRAMENTAS.length) { setFerramenta(FERRAMENTAS[n - 1].id); return }
    if (e.key === 'g') setGrade(g => !g)
    if (e.key === '+' || e.key === '=') setZoom(z => Math.min(4, z + 0.5))
    if (e.key === '-') setZoom(z => Math.max(0.5, z - 0.5))
    if (e.key === '0') ajustar()
  }
  useEffect(() => {
    const f = (e: KeyboardEvent) => teclas.current(e)
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [])
  // ctrl+roda = zoom (precisa de listener não-passivo)
  useEffect(() => {
    const p = palco.current
    if (!p) return
    const f = (e: WheelEvent) => { if (!e.ctrlKey) return; e.preventDefault(); setZoom(z => Math.max(0.5, Math.min(4, z + (e.deltaY < 0 ? 0.25 : -0.25)))) }
    p.addEventListener('wheel', f, { passive: false })
    return () => p.removeEventListener('wheel', f)
  }, [])

  /* ---------- arquivo ---------- */
  const abrirArquivo = async () => {
    const txt = await escolherArquivo()
    if (!txt) return
    try {
      const r = abrir(txt)
      hist.aplicar(cmd.substituir(r.doc)); setAndarId(r.doc.andares[0].id); setSel({})
      const n = erros(r.problemas).length
      avisar(`Arquivo carregado.${n ? ` Tem ${n} coisa(s) pra arrumar: veja a aba Conferir.` : ''}`)
    } catch (e) { avisar(e instanceof Error ? e.message : 'Não abriu') }
  }
  const exportarV0 = () => {
    const { v0, avisos } = paraV0(doc)
    baixar(`${doc.empresa.nome || 'turmeo'}-v0.json`, JSON.stringify(v0, null, 2))
    avisar(avisos.length ? `Baixado, mas ${avisos.length} coisa(s) não cabem no formato antigo: ${avisos[0]}${avisos.length > 1 ? '…' : ''}` : 'Baixado no formato antigo, sem perdas.')
  }
  const gerarDeNovo = () => {
    const r = regerar(doc)
    hist.aplicar(cmd.substituir(r.doc)); setSel({})
    avisar(erros(r.problemas).length ? 'Salas rearrumadas. Tem coisa pra arrumar: veja a aba Conferir.' : 'Salas rearrumadas. Não gostou? Ctrl+Z volta.')
  }
  const focar = (salaId?: string, andarAlvo?: string, obj?: number) => {
    if (andarAlvo) setAndarId(andarAlvo)
    if (salaId) setSel({ sala: salaId, obj: obj ?? null })
    setAba('inspetor')
  }
  const novoAndar = () => {
    const id = 'andar-' + Date.now().toString(36)
    if (!aplicar(cmd.andarAdd({ id, w: andar.w, h: andar.h }))) setAndarId(id)
  }

  const ferr = FERRAMENTAS.find(f => f.id === ferramenta)!
  const cursor = ferramenta === 'sel' ? 'default' : 'crosshair'
  const avancada = FERRAMENTAS.findIndex(f => f.id === ferramenta) >= BASICAS
  const verMais = mais || avancada
  const item = (f: () => void) => () => { setMenu(false); f() }

  return (
    <div className="ed">
      <header className="ed-topo">
        <button className="ed-voltar" onClick={() => { salvar(doc); voltar() }} title="Voltar pra tela inicial">← Meus escritórios</button>
        <input className="ed-empresa" value={doc.empresa.nome} onChange={e => aplicar(cmd.empresa({ nome: e.target.value }), 'empresa')} onBlur={() => hist.selar()} aria-label="Nome do escritório" placeholder="Nome do escritório" />
        <nav className="ed-andares">
          {doc.andares.map(a => <button key={a.id} className={a.id === andar.id ? 'on' : ''} onClick={() => { setAndarId(a.id); setSel({}) }}>{a.nome}</button>)}
          <button title="Pôr mais um andar" onClick={novoAndar}>＋ andar</button>
        </nav>
        <div className="ed-acoes">
          <span className="ed-salvo" aria-live="polite">{salvo ? '✓ Salvo' : 'Salvando…'}</span>
          <button onClick={() => hist.desfazer()} disabled={!hist.podeDesfazer} title="Desfazer (Ctrl+Z)">↶ Desfazer</button>
          <button onClick={() => hist.refazer()} disabled={!hist.podeRefazer} title="Refazer (Ctrl+Y)" aria-label="Refazer">↷</button>
          <span className="ed-menu-ancora">
            <button onClick={() => setMenu(m => !m)} aria-expanded={menu}>⋯ Mais</button>
            {menu && <div className="ed-menu" role="menu">
              <button onClick={item(() => aplicar(cmd.distribuir(false)))}>Pôr quem está sem mesa numa mesa livre</button>
              <button onClick={item(gerarDeNovo)}>Rearrumar as salas sozinho</button>
              <button onClick={item(() => setAssistente(true))}>Refazer com o assistente (nomes, salas…)</button>
              <hr />
              <button onClick={item(() => baixar(`${doc.empresa.nome || 'escritorio'}.json`, JSON.stringify(doc, null, 2)))}>Baixar cópia do arquivo</button>
              <button onClick={item(abrirArquivo)}>Carregar arquivo…</button>
              <details><summary>Avançado</summary>
                <button onClick={item(exportarV0)}>Baixar no formato do Turmeo antigo</button>
                <button onClick={item(() => setGrade(g => !g))}>{grade ? 'Esconder' : 'Mostrar'} a grade (G)</button>
              </details>
            </div>}
          </span>
        </div>
      </header>

      <aside className="ed-ferr">
        {FERRAMENTAS.map((f, i) => (i < BASICAS || verMais) && (
          <button key={f.id} className={f.id === ferramenta ? 'on' : ''} onClick={() => { setFerramenta(f.id); if (f.id === 'add' || f.id === 'piso') setAba('catalogo') }} title={`${f.nome} (${i + 1})`}>
            <span>{f.icone}</span><small>{f.nome}</small>
          </button>
        ))}
        <button className="ed-ferr-mais" onClick={() => { if (verMais) { setMais(false); if (avancada) setFerramenta('sel') } else setMais(true) }}>
          <span>{verMais ? '−' : '…'}</span><small>{verMais ? 'Menos' : 'Mais'}</small>
        </button>
      </aside>

      <main className="ed-palco" ref={palco} onContextMenu={e => e.preventDefault()} onMouseDown={() => setMenu(false)}>
        <canvas
          ref={canvas}
          style={{ width: andar.w * T * zoom, height: andar.h * T * zoom, cursor }}
          onMouseDown={baixo} onMouseMove={mover} onMouseUp={cima}
          onMouseLeave={() => { mouse.current = null; cima() }}
        />
        {dica && <div className="ed-dica" onMouseDown={e => e.stopPropagation()}>
          <b>Pronto! Seu escritório já está montado.</b>
          <ul>
            <li>Clique numa sala pra trocar o nome; arraste pra mudar de lugar.</li>
            <li>Arraste uma mesa ou móvel pra reposicionar.</li>
            <li>Na aba <b>Pessoas</b> você escreve os nomes de verdade.</li>
            <li>Errou? <b>↶ Desfazer</b> (Ctrl+Z). Tudo salva sozinho.</li>
          </ul>
          <button className="prim" onClick={fecharDica}>Entendi</button>
        </div>}
      </main>

      <section className="ed-lado">
        <nav className="ed-abas">
          {([['inspetor', 'Selecionado'], ['catalogo', 'Móveis'], ['pessoas', 'Pessoas'], ['setores', 'Setores'], ['tema', 'Cores'], ['problemas', nErros ? `Conferir (${nErros})` : 'Conferir']] as [Aba, string][]).map(([id, nome]) =>
            <button key={id} className={(aba === id ? 'on ' : '') + (id === 'problemas' && nErros ? 'erro' : '')} onClick={() => setAba(id)}>{nome}</button>)}
        </nav>
        <div className="ed-painel">
          {aba === 'inspetor' && <Inspetor doc={doc} andar={andar} sel={sel} aplicar={aplicar} selar={() => hist.selar()} setSel={setSel} avisar={avisar} />}
          {aba === 'catalogo' && <Catalogo doc={doc} movel={movel} piso={piso} escolherMovel={k => { setMovel(k); setFerramenta('add') }} escolherPiso={p => { setPiso(p); setFerramenta('piso') }} />}
          {aba === 'setores' && <Setores doc={doc} aplicar={aplicar} selar={() => hist.selar()} />}
          {aba === 'pessoas' && <Pessoas doc={doc} aplicar={aplicar} selar={() => hist.selar()} focar={focar} />}
          {aba === 'problemas' && <Problemas problemas={problemas} focar={focar} />}
          {aba === 'tema' && <TemaPainel doc={doc} aplicar={aplicar} selar={() => hist.selar()} />}
        </div>
      </section>

      <footer className="ed-rodape">
        <span><b>{ferr.nome}:</b> {ferr.dica}</span>
        <span className="ed-zoom">
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.5))} aria-label="Afastar">−</button>
          {Math.round(zoom * 100)}%
          <button onClick={() => setZoom(z => Math.min(4, z + 0.5))} aria-label="Aproximar">＋</button>
          <button onClick={ajustar} title="Caber na tela (0)">⤢ Caber</button>
        </span>
      </footer>

      {aviso && <div className="ed-aviso" role="status" onClick={() => setAviso(null)}>{aviso}</div>}
      {assistente && <Assistente doc={doc} podeFechar fechar={() => setAssistente(false)} usar={d => { hist.aplicar(cmd.substituir({ ...d, id: doc.id })); setAndarId(d.andares[0].id); setSel({}); setAssistente(false); avisar('Layout refeito. Não gostou? Ctrl+Z volta.') }} />}
    </div>
  )
}

export type Aplicar = (c: cmd.Cmd, chave?: string) => string | null
export type { Obj }
