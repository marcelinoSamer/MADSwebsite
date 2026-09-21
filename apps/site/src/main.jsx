import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { DataProvider } from '@mads/db/react'
import './index.css'
import App from './App.jsx'
import { client } from './lib/client.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <DataProvider client={client}>
        <App />
      </DataProvider>
    </BrowserRouter>
  </StrictMode>,
)
