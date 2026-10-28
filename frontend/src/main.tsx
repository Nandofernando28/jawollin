// Leaflet CSS must load before app styles — do NOT move inside index.css
import 'leaflet/dist/leaflet.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { SoundProvider } from './audio/SoundProvider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <SoundProvider>
    <App />
  </SoundProvider>
);
