import React from 'react';
import logo from '../assets/logo.png';
import loginBg from '../assets/login-bg.jpg'; // O .jpg si tu archivo es jpg

const Login = () => {
  const handleLogin = () => {
    // URL de tu webhook de n8n
    window.location.href = "https://accounts.google.com/o/oauth2/v2/auth?client_id=72291957752-0qoch8qtua86qan19ni2tt7dfl57pb0e.apps.googleusercontent.com&redirect_uri=https://api.mdenglish.us/webhook/callback-google&response_type=code&scope=email%20profile&prompt=select_account";
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-white">
      
      {/* --- SECCIÓN IZQUIERDA (IMAGEN) --- */}
      <div className="hidden md:block md:w-1/2 relative overflow-hidden bg-gray-100">
        <img
          src={loginBg}
          alt="Fondo de oficina"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      {/* --- SECCIÓN DERECHA (FORMULARIO) --- */}
      {/* Agregamos 'items-center' para centrar horizontalmente todo el contenido */}
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center p-8 md:p-16 lg:p-24 bg-white">
        
        <div className="max-w-md w-full flex flex-col items-center">
            {/* Logo (Centrado) */}
            <div className="mb-12">
              <img 
                  src={logo} 
                  alt="MD English Logo" 
                  className="h-16 md:h-20" 
              />
            </div>

            {/* Título Principal (Con fuente Bookman y centrado) */}
            {/* font-bookman aplica la fuente que configuramos. font-bold la pone en negrita. */}
            <h1 className="font-bookman font-bold text-3xl md:text-4xl lg:text-5xl text-[#1a1a1a] mb-10 text-center leading-tight">
              ¡Bienvenido
              <br />
              nuevamente!
            </h1>

            {/* Botón de Iniciar Sesión (Centrado) */}
            <div className="w-full flex justify-center">
              <button
                  onClick={handleLogin}
                  className="bg-[#0066FF] hover:bg-blue-700 text-white font-semibold py-3.5 px-10 rounded-lg transition duration-300 ease-in-out flex items-center gap-3 text-base shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path fill="currentColor" d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.2,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12.1,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.25,22C17.6,22 21.5,18.33 21.5,12.91C21.5,11.76 21.35,11.1 21.35,11.1V11.1Z" />
                  </svg>
                  Iniciar sesión
              </button>
            </div>
        </div>

      </div>
    </div>
  );
};

export default Login;