import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
          },
          success: {
            style: {
              background: '#27AE60',
              color: '#fff',
            },
          },
          error: {
            style: {
              background: '#E74C3C',
              color: '#fff',
            },
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
