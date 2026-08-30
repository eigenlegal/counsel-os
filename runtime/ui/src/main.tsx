import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { bootstrapToken } from './api/token';
import { Root } from './app';
import { bootstrapUiFlag } from './ui-flag';
import './styles.css';

// FIRST, before React renders anything: the app's very first effect asks
// `/health`, and that request needs the token that is sitting in the URL
// fragment right now. This also strips the fragment, so what a reload, a
// bookmark or a screenshot carries is the route and not the credential.
bootstrapToken();

// Likewise before React renders: `?ui=v1` / `?ui=v2` is read out of the fragment and
// stripped here, so no component has to mutate the URL from its render phase.
bootstrapUiFlag();

const root = document.getElementById('root');
if (root === null) throw new Error('counsel-os: no #root element in the page shell');

createRoot(root).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
