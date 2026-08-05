import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App.jsx';
import './index.css';
import UnsavedChangesProvider from './components/UnsavedChangesProvider';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <UnsavedChangesProvider>
        <App />
      </UnsavedChangesProvider>
    </BrowserRouter>
  </React.StrictMode>
);