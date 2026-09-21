import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initFirebase } from './lib/firebase';
import './styles/theme.css';

const root = document.getElementById('root')!;

initFirebase()
  .then(() => {
    createRoot(root).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  })
  .catch((err) => {
    const message = err instanceof Error ? err.message : 'Error al iniciar Firebase';
    root.replaceChildren();
    const wrap = document.createElement('div');
    wrap.style.cssText =
      'font-family:system-ui;padding:24px;max-width:420px;margin:40px auto;color:#1A1A2E';
    const h1 = document.createElement('h1');
    h1.style.fontSize = '18px';
    h1.textContent = 'No se pudo iniciar la app';
    const p = document.createElement('p');
    p.style.cssText = 'color:#6B7280;font-size:14px';
    p.textContent = message;
    wrap.append(h1, p);
    root.append(wrap);
  });
