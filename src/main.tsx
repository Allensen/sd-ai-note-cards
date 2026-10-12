import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { fontCss } from './fonts';

const fontStyle = document.createElement('style'); fontStyle.textContent = fontCss; document.head.append(fontStyle);
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
