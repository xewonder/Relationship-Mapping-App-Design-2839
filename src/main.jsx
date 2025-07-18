import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Check if there's an auth token in the URL and log it
const hash = window.location.hash;
if (hash && hash.includes('access_token')) {
  console.log('Auth token detected in URL');
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);