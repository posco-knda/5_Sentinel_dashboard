import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { PresentCursor } from './components/PresentCursor.tsx'
import { applyDemoParams, presentOn } from './lib/demoMode.ts'

// 촬영 준비용 주소 인자(?demo=reset 등)를 먼저 처리한다
applyDemoParams()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    {presentOn() && <PresentCursor />}
  </StrictMode>,
)
