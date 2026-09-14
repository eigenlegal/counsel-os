import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { bootstrapToken } from '../api/token';
import { WorkspaceApp } from './WorkspaceApp';
import './workspace.css';
import './layout.css';
import './chat.css';
import '../controls.css';
import './sidebar.css';

bootstrapToken();
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WorkspaceApp />
  </StrictMode>,
);
