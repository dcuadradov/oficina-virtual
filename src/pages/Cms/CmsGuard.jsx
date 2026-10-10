import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { supabase } from '../../supabaseClient';

export default function CmsGuard({ children }) {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState(null);
  const userEmail = localStorage.getItem('user_email');

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      try {
        if (!userEmail) {
          navigate('/login');
          return;
        }
        const { data, error } = await supabase
          .from('usuarios')
          .select('activo, usuarios_modulos(modulo_id)')
          .eq('email', userEmail)
          .eq('activo', true)
          .single();

        if (error || !data) {
          if (!cancelled) setAllowed(false);
          return;
        }

        const modulos = data.usuarios_modulos?.map((um) => um.modulo_id) || [];
        localStorage.setItem('user_modulos', JSON.stringify(modulos));
        if (!cancelled) setAllowed(modulos.includes('cms'));
      } catch {
        if (!cancelled) setAllowed(false);
      }
    };

    verify();
    return () => {
      cancelled = true;
    };
  }, [navigate, userEmail]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    navigate('/login');
  };

  if (allowed === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-[#02214A] to-[#1717AF] animate-pulse" />
          <p className="text-slate-500 mt-4">Verificando acceso al CMS...</p>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-slate-100 flex items-center justify-center">
            <span className="text-4xl">🔒</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Sin acceso al CMS</h1>
          <p className="text-slate-500 mb-8">
            Tu usuario no tiene el módulo <span className="font-medium text-slate-700">cms</span> asignado.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => navigate('/home')}
              className="px-5 py-2.5 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-700"
            >
              Volver al inicio
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-slate-500 hover:text-rose-600"
            >
              <LogOut size={16} />
              Salir
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
