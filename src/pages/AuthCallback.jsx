import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Leer el token que nos mandó n8n en la URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const email = params.get('email');
    const name = params.get('name');

    if (token) {
      // 2. Guardar las llaves en el bolsillo (localStorage)
      localStorage.setItem('sb_token', token);
      localStorage.setItem('user_email', email);
      localStorage.setItem('user_name', name);

      // 3. Redirigir al Home (que verificará permisos y mostrará módulos)
      window.location.href = '/home';
      
    } else {
      // Si algo salió mal, volver al login
      navigate('/login');
    }
  }, [navigate]);

  return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <p className="text-xl font-bookman text-blue-600 animate-pulse">
        Autenticando... 🚀
      </p>
    </div>
  );
};

export default AuthCallback;