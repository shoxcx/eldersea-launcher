import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

if (typeof window !== 'undefined' && window.require) {
  window.ipcRenderer = window.require('electron').ipcRenderer;
}

createRoot(document.getElementById('root')).render(
  <App />,
)
