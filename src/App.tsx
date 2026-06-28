/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { DemoProvider } from './context/DemoContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { FleetDashboard } from './pages/FleetDashboard';
import { EngineDetail } from './pages/EngineDetail';
import { Alerts } from './pages/Alerts';
import { Models } from './pages/Models';
import { Admin } from './pages/Admin';
import { Settings } from './pages/Settings';
import { Toaster } from 'react-hot-toast';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DemoProvider>
        <ThemeProvider>
          <AuthProvider>
            <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<FleetDashboard />} />
                <Route path="engines/:engineId" element={<EngineDetail />} />
                <Route path="alerts" element={<Alerts />} />
                <Route path="models" element={<Models />} />
                <Route path="admin" element={<Admin />} />
                <Route path="settings" element={<Settings />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Toaster position="top-right" />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
      </DemoProvider>
    </QueryClientProvider>
  );
}
