import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { ToastProvider } from './components/Toast';
import { ThemeProvider } from './context/ThemeContext';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
    <ThemeProvider>
    <ToastProvider>
    <App />
    </ToastProvider>
    </ThemeProvider>
    </StrictMode>
);