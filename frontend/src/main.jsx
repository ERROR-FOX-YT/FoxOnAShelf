import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { ServerStatusProvider } from './context/ServerStatusContext.jsx';
import { setApiBase } from './api/client.js';
import './styles/index.css';

const params = new URLSearchParams(window.location.search);
const apiBaseParam = params.get('apiBase');
if (apiBaseParam) {
  setApiBase(apiBaseParam);
  window.history.replaceState({}, '', window.location.pathname + window.location.hash);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={(import.meta.env.VITE_ROUTER_BASE || '/').trim()}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <ServerStatusProvider>
              <App />
            </ServerStatusProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
