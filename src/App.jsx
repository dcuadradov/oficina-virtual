import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard/Dashboard';

// Este componente actúa como "Guardia de Seguridad"
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('sb_token');
  
  // Si no tiene token, ¡pa' fuera! (al login)
  if (!token) {
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
      
      {/* Ruta privada (Dashboard) */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />

      {/* Si entran a cualquier otro lado, mandar al dashboard (el guardia decidirá si entran o no) */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}