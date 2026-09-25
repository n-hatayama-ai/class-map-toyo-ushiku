import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { PasscodeGate } from './components/PasscodeGate.tsx';
import 'leaflet/dist/leaflet.css';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PasscodeGate>{(dataset) => <App initialData={dataset} />}</PasscodeGate>
  </StrictMode>,
);
