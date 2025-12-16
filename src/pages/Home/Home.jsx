import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { 
  Users, 
  DollarSign, 
  Settings, 
  LogOut,
  ChevronRight,
  Sparkles
} from 'lucide-react';

// Configuración de módulos disponibles
const modulosConfig = {
  comercial: {
    id: 'comercial',
    nombre: 'Operación Comercial',
    descripcion: 'Gestión de leads y seguimiento de ventas',
    icono: Users,
    ruta: '/dashboard',
    color: 'from-blue-500 to-indigo-600',
    bgLight: 'bg-blue-50',
    iconColor: 'text-blue-600'
  },
  finanzas: {
    id: 'finanzas',
    nombre: 'Finanzas',
    descripcion: 'Control financiero y reportes contables',
    icono: DollarSign,
    ruta: '/finanzas',
    color: 'from-emerald-500 to-teal-600',
    bgLight: 'bg-emerald-50',
    iconColor: 'text-emerald-600'
  },
  admin: {
    id: 'admin',
    nombre: 'Administración',
    descripcion: 'Configuración del sistema',
    icono: Settings,
    ruta: '/admin',
    color: 'from-slate-500 to-slate-700',
    bgLight: 'bg-slate-50',
    iconColor: 'text-slate-600'
  }
};

export default function Home() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modulosPermitidos, setModulosPermitidos] = useState([]);

  const userName = localStorage.getItem('user_name') || 'Usuario';
  const userEmail = localStorage.getItem('user_email');

  useEffect(() => {
    verificarUsuario();
  }, []);

  const verificarUsuario = async () => {
    try {
      if (!userEmail) {
        navigate('/login');
        return;
      }

      // Buscar usuario con sus módulos desde la tabla intermedia
      const { data, error } = await supabase
        .from('usuarios')
        .select(`
          *,
          usuarios_modulos (
            modulo_id
          )
        `)
        .eq('email', userEmail)
        .eq('activo', true)
        .single();

      if (error || !data) {
        // Usuario no encontrado o inactivo
        setUsuario(null);
        setModulosPermitidos([]);
      } else {
        setUsuario(data);
        
        // Extraer los IDs de módulos de la relación
        const modulos = data.usuarios_modulos?.map(um => um.modulo_id) || [];
        setModulosPermitidos(modulos);
        
        // Guardar en localStorage para uso posterior
        localStorage.setItem('user_puede_ver_todos', data.puede_ver_todos);
        localStorage.setItem('user_rol', data.rol);
        localStorage.setItem('user_modulos', JSON.stringify(modulos));
      }
    } catch (err) {
      console.error('Error verificando usuario:', err);
      setUsuario(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const handleModuloClick = (modulo) => {
    navigate(modulo.ruta);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#02214A] to-[#1717AF] animate-pulse shadow-xl" />
            <div className="absolute inset-0 w-16 h-16 rounded-2xl border-4 border-[#1717AF]/20 border-t-[#1717AF] animate-spin" />
          </div>
          <p className="text-slate-600 mt-6 font-medium">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // Empty state - Usuario sin acceso
  if (!usuario) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        {/* Patrón decorativo */}
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-rose-100 rounded-full blur-3xl opacity-30" />
          <div className="absolute top-1/2 -left-40 w-96 h-96 bg-amber-100 rounded-full blur-3xl opacity-30" />
        </div>

        <div className="flex flex-col items-center justify-center min-h-screen px-6">
          <div className="max-w-md w-full text-center">
            {/* Icono */}
            <div className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shadow-xl">
              <span className="text-5xl">🔒</span>
            </div>
            
            {/* Mensaje */}
            <h1 className="text-2xl font-bold text-slate-800 mb-3">
              Acceso no autorizado
            </h1>
            <p className="text-slate-500 mb-2">
              El correo <span className="font-medium text-slate-700">{userEmail}</span> no tiene permisos para acceder al sistema.
            </p>
            <p className="text-slate-400 text-sm mb-8">
              Si crees que esto es un error, contacta al administrador.
            </p>

            {/* Botón de salir */}
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-700 transition-all duration-200 shadow-lg shadow-slate-200"
            >
              <LogOut size={18} />
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Home con módulos
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Patrón decorativo de fondo */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-40" />
        <div className="absolute top-1/3 -left-40 w-96 h-96 bg-violet-100 rounded-full blur-3xl opacity-40" />
        <div className="absolute -bottom-40 right-1/4 w-96 h-96 bg-emerald-100 rounded-full blur-3xl opacity-30" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 border-b border-slate-200/50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#02214A] to-[#1717AF] flex items-center justify-center shadow-lg shadow-[#02214A]/20">
              <span className="text-white font-bold text-lg">OV</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Oficina Virtual</h1>
              <p className="text-sm text-slate-500">MD English</p>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-slate-500 hover:text-rose-600 transition-all duration-200 text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-100"
          >
            <LogOut size={18} />
            <span className="hidden md:inline">Salir</span>
          </button>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Saludo */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="text-amber-500" size={24} />
            <span className="text-sm font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
              Bienvenido de vuelta
            </span>
          </div>
          <h2 className="text-4xl font-bold text-slate-800 mb-3">
            Hola, {userName.split(' ')[0]} 👋
          </h2>
          <p className="text-lg text-slate-500">
            Selecciona un módulo para comenzar
          </p>
        </div>

        {/* Grid de módulos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modulosPermitidos.map((moduloId) => {
            const modulo = modulosConfig[moduloId];
            if (!modulo) return null;
            
            const IconComponent = modulo.icono;
            
            return (
              <button
                key={modulo.id}
                onClick={() => handleModuloClick(modulo)}
                className="group relative bg-white/70 backdrop-blur-sm rounded-3xl p-8 border border-slate-200/60 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-slate-300/50 transition-all duration-300 hover:-translate-y-1 text-left overflow-hidden"
              >
                {/* Gradiente de fondo en hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${modulo.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                
                {/* Icono */}
                <div className={`w-14 h-14 rounded-2xl ${modulo.bgLight} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <IconComponent className={modulo.iconColor} size={28} />
                </div>
                
                {/* Contenido */}
                <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-slate-900 transition-colors">
                  {modulo.nombre}
                </h3>
                <p className="text-slate-500 text-sm mb-6">
                  {modulo.descripcion}
                </p>
                
                {/* Call to action */}
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-400 group-hover:text-slate-600 transition-colors">
                  <span>Ingresar</span>
                  <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </div>
                
                {/* Borde con gradiente en hover */}
                <div className={`absolute inset-0 rounded-3xl border-2 border-transparent bg-gradient-to-br ${modulo.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} style={{ WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude', padding: '2px' }} />
              </button>
            );
          })}
        </div>

        {/* Info del usuario */}
        <div className="mt-12 p-6 bg-white/50 backdrop-blur-sm rounded-2xl border border-slate-200/60">
          <p className="text-sm text-slate-400">
            Conectado como <span className="font-medium text-slate-600">{userEmail}</span>
            {usuario.rol && (
              <span className="ml-2 px-2 py-0.5 bg-slate-100 rounded-full text-xs text-slate-500">
                {usuario.rol}
              </span>
            )}
          </p>
        </div>
      </main>
    </div>
  );
}

