import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import router from './router';
import { DataProvider } from './contexts/DataContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DataProvider>
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-lg">Chargement...</div></div>}>
        <RouterProvider router={router} />
      </Suspense>
    </DataProvider>
  </React.StrictMode>
);
