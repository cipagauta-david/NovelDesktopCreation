import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter/index.css'
import '@fontsource-variable/crimson-pro/index.css'
import './index.css'
import App from './App.tsx'
import { initObservability } from './services/observability'
import { TooltipProvider } from '@/components/ui/tooltip'

initObservability()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TooltipProvider>
      <App />
    </TooltipProvider>
  </StrictMode>,
)
