import React, { Suspense } from 'react';
import { RouterProvider } from 'react-router-dom';

import AuthGate from '@/AuthGate';
import { DataProvider } from '@/contexts/DataContext';

import router from './router';

export default function App() {
  return (
    <React.StrictMode>
      <AuthGate>
        <DataProvider>
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Chargement...</div></div>}>
            <RouterProvider router={router} />
          </Suspense>
        </DataProvider>
      </AuthGate>
    </React.StrictMode>
  );
}
