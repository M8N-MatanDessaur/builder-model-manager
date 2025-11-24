import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fortawesome/fontawesome-free/css/all.min.css'
import './index.css'
import App from './App.tsx'
import { introspectInputType, introspectUpdateModelInput } from './services/schemaHelper'

// Make schema introspection available in browser console
(window as any).introspect = introspectInputType;
(window as any).introspectUpdateModelInput = introspectUpdateModelInput;
console.log('Debug helpers available:');
console.log('  window.introspect("CreateModelInput")');
console.log('  window.introspect("UpdateModelInput")');
console.log('  window.introspect("DeleteModelInput")');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
