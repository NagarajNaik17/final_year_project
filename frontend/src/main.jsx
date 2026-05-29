import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { MetaMaskProvider } from './context/MetaMaskContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MetaMaskProvider>
      <App />
    </MetaMaskProvider>
  </StrictMode>,
)
