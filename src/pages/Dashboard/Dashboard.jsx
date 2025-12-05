import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import DashboardStats from './components/DashboardStats';
import { LogOut, RefreshCcw } from 'lucide-react';

export default function Dashboard() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const userName = localStorage.getItem('user_name') || 'Comercial';

  useEffect(() => {
    // 1. Carga inicial
    fetchLeads();

    // 2. Configurar RECARGA AUTOMÁTICA cada 3 minutos (180,000 ms)
    const intervalId = setInterval(() => {
      console.log("🔄 Actualizando datos en segundo plano...");
      fetchLeads(true); // true = modo silencioso (sin spinner de carga total)
    }, 180000); 

    // 3. Limpieza al salir
    return () => clearInterval(intervalId);
  }, []);

  const fetchLeads = async (silent = false) => {
    try {
      // Solo mostramos spinner grande si NO es una recarga silenciosa
      if (!silent) setLoading(true);
      if (silent) setIsRefreshing(true); // Indicador pequeño opcional
      
      const userEmail = localStorage.getItem('user_email');
      
      if (!userEmail) {
        console.error("No hay email de usuario");
        return;
      }

      // Consulta a Supabase trayendo SOLO los leads del comercial actual
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          recordatorios (
            fecha_programada,
            estado
          )
        `)
        .eq('comercial_email', userEmail);

      if (error) throw error;
      
      // Actualizamos el estado
      setLeads(data || []);
      
    } catch (error) {
      console.error('Error cargando leads:', error.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* --- HEADER --- */}
      <header className="flex justify-between items-center mb-8 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-bookman font-bold text-slate-800 flex items-center gap-3">
            Oficina Virtual
            {isRefreshing && (
              <span className="text-xs font-sans font-normal text-blue-500 bg-blue-50 px-2 py-1 rounded-full animate-pulse flex items-center gap-1">
                <RefreshCcw size={12} className="animate-spin" /> Actualizando...
              </span>
            )}
          </h1>
          <p className="text-slate-500">Hola, {userName} 👋</p>
        </div>
        
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 text-slate-500 hover:text-red-600 transition-colors text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-100"
        >
          <LogOut size={18} />
          <span className="hidden md:inline">Cerrar sesión</span>
        </button>
      </header>

      {/* --- CONTENIDO PRINCIPAL --- */}
      <main className="max-w-7xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-slate-400 animate-pulse">Cargando tu oficina...</p>
          </div>
        ) : (
          <>
            {/* 1. SECCIÓN DE KPIs (Los números grandes) */}
            {/* Aquí se inyecta la lógica de 48h y recordatorios que hicimos antes */}
            <DashboardStats leads={leads} />

            {/* 2. TABLA (Espacio reservado para el siguiente paso) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 text-center text-slate-400 mt-6">
              <p>(Aquí va la tabla de gestión de leads)</p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}