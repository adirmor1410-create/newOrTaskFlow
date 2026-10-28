import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@mantine/core/styles.css';
import '@fontsource/heebo/hebrew-400.css';
import '@fontsource/heebo/hebrew-500.css';
import '@fontsource/heebo/hebrew-700.css';
import '@fontsource/heebo/latin-400.css';
import '@fontsource/heebo/latin-500.css';
import '@fontsource/heebo/latin-700.css';
import './theme/tokens.css';
import './styles.css';
import App from './App';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
