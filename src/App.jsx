import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Home from './pages/Home/Home';
import Dashboard from './pages/Dashboard/Dashboard';
import { supabase } from './supabaseClient';

// Este componente actúa como "Guardia de Seguridad"
const ProtectedRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Obtener sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Mientras carga, mostrar loading
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-[#02214A] to-[#1717AF] animate-pulse" />
          <p className="text-slate-500 mt-4">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // Si no hay sesión, redirigir al login
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

export default function App() {
  return (
    <Routes>
      {/* Ruta pública */}
      <Route path="/login" element={<Login />} />
      
      {/* Ruta donde aterriza n8n */}
      <Route path="/auth/callback" element={<AuthCallback />} />
      
      {/* Home - Selección de módulos */}
      <Route 
        path="/home" 
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } 
      />
      
      {/* Dashboard Comercial */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* Dashboard con lead específico (abre sidebar automáticamente) */}
      <Route 
        path="/dashboard/:cardId" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />

      {/* Si entran a cualquier otro lado, mandar al home (el guardia decidirá si entran o no) */}
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}