import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import { AppProvider } from './context';

// No StrictMode: its dev-only double effects would record every product view twice.
createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <AppProvider>
      <App />
    </AppProvider>
  </BrowserRouter>,
);
