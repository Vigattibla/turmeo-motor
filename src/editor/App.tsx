/** troca entre a tela inicial e o editor; o endereço (#/e/<id>) guarda qual escritório está aberto */
import { useEffect, useState } from 'react'
import { Editor } from './Editor'
import { Inicio } from './Inicio'
import { carregar } from './loja'

const daRota = () => /^#\/e\/(.+)$/.exec(location.hash)?.[1] ?? null
const abrir = (id: string) => { location.hash = '#/e/' + encodeURIComponent(id) }

export function App() {
  const [id, setId] = useState(daRota)
  useEffect(() => { const f = () => setId(daRota()); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f) }, [])
  const doc = id ? carregar(decodeURIComponent(id)) : null
  if (!doc) return <Inicio abrirEsc={abrir} />
  return <Editor key={doc.id} inicial={doc} voltar={() => { history.pushState(null, '', location.pathname); setId(null) }} />
}
