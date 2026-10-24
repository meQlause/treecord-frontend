import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { App } from './app/App';
import { forgetStoredSession } from './shared/api/session';

// D-7: no kept login; the SDK mounts only after this
forgetStoredSession();

const root = document.getElementById('root');

if (root === null) {
  throw new Error('index.html has no #root element');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
