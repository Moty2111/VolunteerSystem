import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import App from './App';
import './index.css';
import { ToastProvider } from './components/Toast';
import { ThemeProvider } from './context/ThemeContext';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
    {/* reducedMotion="user" — анимации отключаются, если пользователь
        попросил в системе уменьшить движение */}
    <MotionConfig reducedMotion="user">
    <ThemeProvider>
    <ToastProvider>
    <App />
    </ToastProvider>
    </ThemeProvider>
    </MotionConfig>
    </StrictMode>
);
