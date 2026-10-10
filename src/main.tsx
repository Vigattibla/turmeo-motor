import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './editor/App'
import './editor/editor.css'

createRoot(document.getElementById('raiz')!).render(<StrictMode><App /></StrictMode>)
