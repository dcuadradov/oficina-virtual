import React, { useState } from 'react';
import logo from '../assets/logo.png';
import loginBg from '../assets/login-bg.jpg';
import { Sparkles } from 'lucide-react';

const Login = () => {
  const [isHovering, setIsHovering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = () => {
    setIsLoading(true);
    // Pequeño delay para mostrar animación
    setTimeout(() => {
      window.location.href = "https://accounts.google.com/o/oauth2/v2/auth?client_id=72291957752-0qoch8qtua86qan19ni2tt7dfl57pb0e.apps.googleusercontent.com&redirect_uri=https://api.mdenglish.us/webhook/callback-google&response_type=code&scope=email%20profile&prompt=select_account";
    }, 500);
  };

  return (
    <div className="flex min-h-screen bg-[#02214A]">
      
      {/* --- SECCIÓN IZQUIERDA (IMAGEN CON OVERLAY) --- */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Imagen de fondo */}
        <img
          src={loginBg}
          alt="Fondo"
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Overlay con gradiente usando colores corporativos */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#02214A]/95 via-[#1717AF]/70 to-[#02214A]/95" />
        
        {/* Patrón de puntos decorativo */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '30px 30px'
        }} />
        
        {/* Contenido sobre la imagen */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo arriba */}
          <div>
            <img src={logo} alt="Logo" className="h-12 brightness-0 invert opacity-90" />
          </div>
          
          {/* Texto central */}
          <div className="max-w-md">
            <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6 font-bookman">
              Gestiona tus leads de forma
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-cyan-200 pb-2">
                inteligente
              </span>
            </h2>
            <p className="text-blue-200/80 text-lg leading-relaxed">
              Tu oficina virtual para mantener el control de cada oportunidad de venta. 
              Organiza, prioriza y cierra más negocios.
            </p>
          </div>
          
          {/* Espacio para mantener el layout */}
          <div />
        </div>
        
        {/* Círculos decorativos con colores corporativos */}
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-[#1717AF]/30 rounded-full blur-3xl" />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#1717AF]/20 rounded-full blur-3xl" />
      </div>

      {/* --- SECCIÓN DERECHA (LOGIN) --- */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 md:p-16 relative overflow-hidden">
        
        {/* Fondo con gradiente para móvil y desktop */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50" />
        
        {/* Manchas de color decorativas con colores corporativos */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#1717AF]/10 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#02214A]/10 rounded-full blur-3xl opacity-40 translate-y-1/2 -translate-x-1/2" />
        
        {/* Contenido del login */}
        <div className="relative z-10 w-full max-w-md">
          
          {/* Logo para móvil */}
          <div className="lg:hidden flex justify-center mb-8">
            <img src={logo} alt="Logo" className="h-14" />
          </div>
          
          {/* Card de login con glassmorphism */}
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-200/50 border border-white/50 p-8 md:p-10">
            
            {/* Encabezado */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#02214A]/5 rounded-full mb-6">
                <Sparkles size={16} className="text-[#1717AF]" />
                <span className="text-sm font-medium text-[#02214A]">Oficina Virtual</span>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold text-[#02214A] mb-3 font-bookman">
                ¡Bienvenido!
              </h1>
              <p className="text-slate-500">
                Inicia sesión para acceder a tu dashboard
              </p>
            </div>
            
            {/* Botón de Google con colores corporativos */}
            <button
              onClick={handleLogin}
              disabled={isLoading}
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              className={`
                w-full relative overflow-hidden
                bg-[#02214A] hover:bg-[#1717AF]
                text-white font-semibold 
                py-4 px-6 rounded-2xl 
                transition-all duration-300 ease-out
                flex items-center justify-center gap-3
                shadow-xl shadow-[#02214A]/30
                hover:shadow-2xl hover:shadow-[#1717AF]/30
                hover:-translate-y-0.5
                disabled:opacity-70 disabled:cursor-not-allowed
                group
              `}
            >
              {/* Efecto de brillo en hover */}
              <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full ${isHovering ? 'translate-x-full' : ''} transition-transform duration-700`} />
              
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Conectando...</span>
                </>
              ) : (
                <>
                  {/* Icono de Google */}
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>Continuar con Google</span>
                  <svg className="w-4 h-4 opacity-50 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
            
            {/* Separador */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 uppercase tracking-wider">Acceso seguro</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
            
            {/* Info de seguridad */}
            <div className="flex items-center justify-center gap-6 text-slate-400">
              <div className="flex items-center gap-2 text-xs">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>SSL Seguro</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Verificado</span>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <p className="text-center text-sm text-slate-400 mt-8">
            Al continuar, aceptas nuestros{' '}
            <a href="#" className="text-[#1717AF] hover:underline">Términos</a>
            {' '}y{' '}
            <a href="#" className="text-[#1717AF] hover:underline">Privacidad</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
