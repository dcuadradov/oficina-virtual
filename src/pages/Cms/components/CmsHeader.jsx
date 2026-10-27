import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, LogOut } from 'lucide-react';
import { supabase } from '../../../supabaseClient';

export default function CmsHeader({ subtitle = 'CMS Blog página WEB MD' }) {
  const navigate = useNavigate();
  const userName = localStorage.getItem('user_name') || 'Usuario';

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 border-b border-slate-200/50 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center gap-4">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <div className="hidden sm:flex w-10 h-10 shrink-0 rounded-2xl bg-gradient-to-br from-[#02214A] to-[#1717AF] items-center justify-center shadow-lg shadow-[#02214A]/20">
            <span className="text-white font-bold text-lg font-bookman">OV</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-800 truncate">Oficina Virtual</h1>
            <p className="text-sm text-slate-500 truncate">
              Hola, <span className="font-medium text-slate-700">{userName}</span> 👋
              {subtitle && <span className="hidden sm:inline"> · {subtitle}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigate('/home')}
            className="flex items-center gap-2 text-slate-500 hover:text-[#1717AF] transition-all duration-200 text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-blue-50 border border-transparent hover:border-blue-100"
          >
            <Home size={18} />
            <span className="hidden md:inline">Inicio</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-slate-500 hover:text-rose-600 transition-all duration-200 text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-100"
          >
            <LogOut size={18} />
            <span className="hidden md:inline">Salir</span>
          </button>
        </div>
      </div>
    </header>
  );
}
