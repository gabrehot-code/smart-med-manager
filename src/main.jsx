import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './i18n/index.js';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/Toast';

window.onerror = (msg, src, line, col, err) => {
  document.body.innerHTML = '<div style="padding:20px;font-size:14px;color:red;direction:rtl">' +
    '<h2>Debug Error:</h2><pre>' + msg + '\n' + src + ':' + line + '</pre></div>';
};
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ToastProvider>
  </React.StrictMode>,
);
