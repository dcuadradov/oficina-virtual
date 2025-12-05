import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import DashboardStats from './components/DashboardStats';
import LeadsTable from './components/LeadsTable';
import { LogOut, RefreshCcw } from 'lucide-react';

// Función para clasificar un lead en su estado de gestión
const getLeadCategory = (lead) => {
  const now = new Date();
  
  // Fases especiales
  if (lead.fase_id_pipefy === "339756299") return 'nuevaMatricula';
  if (lead.fase_id_pipefy === "341189602") return 'matriculaCaida';

  const recordatorios = lead.recordatorios || [];
  if (recordatorios.length === 0) return 'sinGestionar';
  
  const recordatoriosConFecha = recordatorios.filter(r => r.fecha_programada);
  if (recordatoriosConFecha.length === 0) return 'sinGestionar';

  const tieneVigente = recordatoriosConFecha.some(r => new Date(r.fecha_programada) >= now);
  if (tieneVigente) return 'gestionado';

  const masReciente = recordatoriosConFecha
    .map(r => new Date(r.fecha_programada))
    .sort((a, b) => b - a)[0];
  
  const horasDiferencia = (now - masReciente) / (1000 * 60 * 60);
  return horasDiferencia > 48 ? 'atrasado' : 'sinGestionar';
};

export default function Dashboard() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('todos');
  const userName = localStorage.getItem('user_name') || 'Comercial';

  // Filtrar leads según el filtro activo
  const filteredLeads = leads.filter(lead => {
    if (activeFilter === 'todos') return true;
    return getLeadCategory(lead) === activeFilter;
  });

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Patrón de fondo decorativo */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-100 rounded-full blur-3xl opacity-30" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-violet-100 rounded-full blur-3xl opacity-30" />
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-emerald-100 rounded-full blur-3xl opacity-20" />
      </div>

      {/* --- HEADER MODERNO CON COLORES CORPORATIVOS --- */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 border-b border-slate-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#02214A] to-[#1717AF] flex items-center justify-center shadow-lg shadow-[#02214A]/20">
              <span className="text-white font-bold text-lg font-bookman">OV</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                Oficina Virtual
                {isRefreshing && (
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full animate-pulse flex items-center gap-1.5">
                    <RefreshCcw size={10} className="animate-spin" /> Sincronizando
                  </span>
                )}
              </h1>
              <p className="text-sm text-slate-500">Hola, <span className="font-medium text-slate-700">{userName}</span> 👋</p>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-slate-500 hover:text-rose-600 transition-all duration-200 text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-100"
          >
            <LogOut size={18} />
            <span className="hidden md:inline">Cerrar sesión</span>
          </button>
        </div>
      </header>

      {/* --- CONTENIDO PRINCIPAL --- */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#02214A] to-[#1717AF] animate-pulse shadow-xl shadow-[#02214A]/20" />
              <div className="absolute inset-0 w-16 h-16 rounded-2xl border-4 border-[#1717AF]/20 border-t-[#1717AF] animate-spin" />
            </div>
            <p className="text-[#02214A] mt-6 font-medium font-bookman">Cargando tu oficina...</p>
            <p className="text-slate-400 text-sm mt-1">Preparando todo para ti</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 1. SECCIÓN DE KPIs - Clickeables para filtrar */}
            <DashboardStats 
              leads={leads} 
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
            />

            {/* Indicador de filtro activo con colores corporativos */}
            {activeFilter !== 'todos' && (
              <div className="flex items-center gap-3 px-4 py-3 bg-[#1717AF]/5 border border-[#1717AF]/20 rounded-2xl">
                <div className="w-2 h-2 rounded-full bg-[#1717AF] animate-pulse" />
                <span className="text-sm text-slate-600">
                  Mostrando <strong className="text-[#02214A]">{filteredLeads.length}</strong> leads filtrados
                </span>
                <button
                  onClick={() => setActiveFilter('todos')}
                  className="ml-auto text-sm text-[#1717AF] hover:text-[#02214A] font-medium hover:underline transition-all"
                >
                  Limpiar filtro
                </button>
              </div>
            )}

            {/* 2. TABLA DE LEADS */}
            <LeadsTable 
              leads={filteredLeads}
              onOpenModal={(lead) => console.log('Abrir modal:', lead)}
              onOpenReminder={(lead) => console.log('Abrir recordatorio:', lead)}
            />
          </div>
        )}
      </main>
    </div>
  );
}