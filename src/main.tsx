import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { forgetStoredSession } from './shared/api/session';

// D-7: no kept login; the SDK mounts only after this
forgetStoredSession();

const root = document.getElementById('root');

if (root === null) {
  throw new Error('index.html has no #root element');
}

// phases.md F0a replaces this with the app frame (src/app/)
createRoot(root).render(<StrictMode />);
