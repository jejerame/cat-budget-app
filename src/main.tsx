import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './style.css'

const rootElement = document.getElementById('app')

if (!rootElement) {
  throw new Error('앱 루트 노드를 찾을 수 없습니다.')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
