import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Autenticando...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase procesa el token de la URL automáticamente
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error de sesión:', error);
          navigate('/login');
          return;
        }

        if (session) {
          const email = session.user.email;
          const fullName = session.user.user_metadata?.full_name || 
                          session.user.user_metadata?.name || 
                          email.split('@')[0];
          
          // Validar que sea correo corporativo
          if (!email.endsWith('@mdenglish.us')) {
            setStatus('Acceso no autorizado...');
            await supabase.auth.signOut();
            navigate('/login?error=unauthorized');
            return;
          }
          
          // Guardar info en localStorage para compatibilidad con código existente
          localStorage.setItem('user_email', email);
          localStorage.setItem('user_name', fullName);
          
          setStatus('¡Bienvenido!');
          
          // Redirigir al Home
          navigate('/home');
        } else {
          // No hay sesión, volver al login
          navigate('/login');
        }
      } catch (err) {
        console.error('Error en callback:', err);
        navigate('/login');
      }
    };
    
    // Pequeño delay para que Supabase procese el hash de la URL
    setTimeout(handleCallback, 100);
  }, [navigate]);

  return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#02214A] to-[#1717AF] flex items-center justify-center shadow-xl">
          <span className="text-white font-bold text-2xl">OV</span>
        </div>
        <p className="text-xl font-bookman text-[#1717AF] animate-pulse">
          {status} 🚀
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;