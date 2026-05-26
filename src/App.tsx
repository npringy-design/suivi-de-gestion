import React, { Suspense } from 'react';
import { RouterProvider } from 'react-router-dom';

import { DataProvider } from '@/contexts/DataContext';

import router from './router';

export default function App() {
  return (
    <React.StrictMode>
      <DataProvider>
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Chargement...</div></div>}>
          <RouterProvider router={router} />
        </Suspense>
      </DataProvider>
    </React.StrictMode>
  );
}
