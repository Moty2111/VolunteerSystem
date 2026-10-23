import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import App from './App';

/* Шрифт Unbounded — локально, из npm-пакета. Раньше он тянулся с
   fonts.googleapis.com, который в России недоступен: приложение стартовало
   с ошибками в консоли и без фирменного шрифта. Теперь он собирается
   вместе с проектом и работает без интернета. */
import '@fontsource/unbounded/latin-400.css';
import '@fontsource/unbounded/latin-500.css';
import '@fontsource/unbounded/latin-600.css';
import '@fontsource/unbounded/latin-700.css';
import '@fontsource/unbounded/latin-800.css';
import '@fontsource/unbounded/cyrillic-400.css';
import '@fontsource/unbounded/cyrillic-500.css';
import '@fontsource/unbounded/cyrillic-600.css';
import '@fontsource/unbounded/cyrillic-700.css';
import '@fontsource/unbounded/cyrillic-800.css';

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
