import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { bootstrapToken } from './api/token';
import { App } from './app';
import './styles.css';

// FIRST, before React renders anything: the app's very first effect asks
// `/health`, and that request needs the token that is sitting in the URL
// fragment right now. This also strips the fragment, so what a reload, a
// bookmark or a screenshot carries is the route and not the credential.
bootstrapToken();

const root = document.getElementById('root');
if (root === null) throw new Error('counsel-os: no #root element in the page shell');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
