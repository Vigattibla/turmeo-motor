import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Editor } from './editor/Editor'
import './editor/editor.css'

createRoot(document.getElementById('raiz')!).render(<StrictMode><Editor /></StrictMode>)
