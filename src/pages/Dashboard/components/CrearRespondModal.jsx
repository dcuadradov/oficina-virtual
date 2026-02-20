import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, ChevronDown, Check, Search, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../../supabaseClient';

// Lista de países con códigos telefónicos, banderas y longitudes de número
const PAISES_TELEFONO = [
  { codigo: '57', pais: 'Colombia', bandera: '🇨🇴', longitud: [10], placeholder: '3001234567' },
  { codigo: '52', pais: 'México', bandera: '🇲🇽', longitud: [10], placeholder: '5512345678' },
  { codigo: '1', pais: 'Estados Unidos', bandera: '🇺🇸', longitud: [10], placeholder: '2025551234' },
  { codigo: '34', pais: 'España', bandera: '🇪🇸', longitud: [9], placeholder: '612345678' },
  { codigo: '54', pais: 'Argentina', bandera: '🇦🇷', longitud: [10, 11], placeholder: '1123456789' },
  { codigo: '56', pais: 'Chile', bandera: '🇨🇱', longitud: [9], placeholder: '912345678' },
  { codigo: '51', pais: 'Perú', bandera: '🇵🇪', longitud: [9], placeholder: '912345678' },
  { codigo: '593', pais: 'Ecuador', bandera: '🇪🇨', longitud: [9, 10], placeholder: '991234567' },
  { codigo: '58', pais: 'Venezuela', bandera: '🇻🇪', longitud: [10], placeholder: '4121234567' },
  { codigo: '507', pais: 'Panamá', bandera: '🇵🇦', longitud: [8], placeholder: '61234567' },
  { codigo: '506', pais: 'Costa Rica', bandera: '🇨🇷', longitud: [8], placeholder: '61234567' },
  { codigo: '503', pais: 'El Salvador', bandera: '🇸🇻', longitud: [8], placeholder: '71234567' },
  { codigo: '502', pais: 'Guatemala', bandera: '🇬🇹', longitud: [8], placeholder: '51234567' },
  { codigo: '504', pais: 'Honduras', bandera: '🇭🇳', longitud: [8], placeholder: '91234567' },
  { codigo: '505', pais: 'Nicaragua', bandera: '🇳🇮', longitud: [8], placeholder: '81234567' },
  { codigo: '591', pais: 'Bolivia', bandera: '🇧🇴', longitud: [8], placeholder: '71234567' },
  { codigo: '595', pais: 'Paraguay', bandera: '🇵🇾', longitud: [9], placeholder: '981234567' },
  { codigo: '598', pais: 'Uruguay', bandera: '🇺🇾', longitud: [8, 9], placeholder: '91234567' },
  { codigo: '55', pais: 'Brasil', bandera: '🇧🇷', longitud: [10, 11], placeholder: '11912345678' },
  { codigo: '53', pais: 'Cuba', bandera: '🇨🇺', longitud: [8], placeholder: '51234567' },
  { codigo: '1809', pais: 'República Dominicana (1809)', bandera: '🇩🇴', longitud: [7], placeholder: '2345678' },
  { codigo: '1829', pais: 'República Dominicana (1829)', bandera: '🇩🇴', longitud: [7], placeholder: '2345678' },
  { codigo: '1849', pais: 'República Dominicana (1849)', bandera: '🇩🇴', longitud: [7], placeholder: '2345678' },
  { codigo: '787', pais: 'Puerto Rico', bandera: '🇵🇷', longitud: [10], placeholder: '7871234567' },
];

export default function CrearRespondModal({ isOpen, onClose, lead, onSuccess }) {
  const [codigoPais, setCodigoPais] = useState('57'); // Colombia por defecto
  const [numero, setNumero] = useState('');
  const [paisDropdownOpen, setPaisDropdownOpen] = useState(false);
  const [paisBusqueda, setPaisBusqueda] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [toast, setToast] = useState(null);
  
  const paisSearchRef = useRef(null);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (paisDropdownOpen && !event.target.closest('.pais-dropdown-container')) {
        setPaisDropdownOpen(false);
        setPaisBusqueda('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [paisDropdownOpen]);

  // Focus en búsqueda cuando se abre el dropdown
  useEffect(() => {
    if (paisDropdownOpen && paisSearchRef.current) {
      setTimeout(() => paisSearchRef.current?.focus(), 50);
    }
  }, [paisDropdownOpen]);

  // Resetear cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      // Intentar extraer código de país del teléfono actual del lead
      if (lead?.telefono) {
        const match = lead.telefono.match(/^\+(\d{1,3})/);
        if (match) {
          const codigoExtraido = match[1];
          const paisEncontrado = PAISES_TELEFONO.find(p => p.codigo === codigoExtraido);
          if (paisEncontrado) {
            setCodigoPais(codigoExtraido);
            // Extraer el número sin el código
            const numeroSinCodigo = lead.telefono.replace(`+${codigoExtraido}`, '').replace(/\D/g, '');
            setNumero(numeroSinCodigo);
          }
        }
      }
      setToast(null);
    }
  }, [isOpen, lead?.telefono]);

  // Validar número según el país
  const validarTelefono = () => {
    if (!numero) return { valido: false, mensaje: 'Ingresa el número de teléfono' };
    
    const paisConfig = PAISES_TELEFONO.find(p => p.codigo === codigoPais);
    if (!paisConfig) return { valido: true, mensaje: '' };
    
    const longitudValida = paisConfig.longitud.includes(numero.length);
    if (!longitudValida) {
      const longitudesStr = paisConfig.longitud.join(' o ');
      return { 
        valido: false, 
        mensaje: `El número debe tener ${longitudesStr} dígitos para ${paisConfig.pais}` 
      };
    }
    return { valido: true, mensaje: '' };
  };

  // Enviar al webhook
  const handleSubmit = async () => {
    const validacion = validarTelefono();
    if (!validacion.valido) {
      setToast({ type: 'error', message: validacion.mensaje });
      return;
    }

    setEnviando(true);
    setToast(null);

    try {
      const telefonoCompleto = `+${codigoPais}${numero}`;
      
      // Preparar payload con toda la info del lead y el teléfono actualizado
      const payload = {
        ...lead,
        telefono: telefonoCompleto
      };

      // Enviar al webhook y esperar respuesta
      const response = await fetch('https://api.mdenglish.us/webhook/crear_lead_en_respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Error en la respuesta del webhook');
      }

      const data = await response.json();
      
      // El webhook responde con un array, tomar el primer elemento
      const resultado = Array.isArray(data) ? data[0] : data;
      
      // Verificar que tenemos respond_url
      if (!resultado?.respond_url) {
        throw new Error('No se recibió la URL de Respond.io');
      }

      // Guardar en la base de datos
      const { error: updateError } = await supabase
        .from('leads')
        .update({ 
          respond_io_url: resultado.respond_url,
          telefono: telefonoCompleto
        })
        .eq('card_id', resultado.card_id || lead.card_id);

      if (updateError) {
        console.error('Error actualizando BD:', updateError);
        throw new Error('Error al guardar en la base de datos');
      }

      // Mostrar éxito
      setToast({ type: 'success', message: 'Lead creado en Respond.io exitosamente' });
      
      // Cerrar modal después de mostrar el mensaje y refrescar datos
      setTimeout(() => {
        onSuccess?.(resultado.respond_url, telefonoCompleto);
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Error creando en Respond:', error);
      setToast({ type: 'error', message: error.message || 'Error al crear en Respond.io' });
    } finally {
      setEnviando(false);
    }
  };

  if (!isOpen) return null;

  const paisActual = PAISES_TELEFONO.find(p => p.codigo === codigoPais);
  const validacion = validarTelefono();

  // Usar React Portal para renderizar el modal en el body
  const modalContent = (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        zIndex: 99999,
        backgroundColor: 'rgba(0, 0, 0, 0.5)'
      }}
      onClick={(e) => {
        // Cerrar modal si se hace clic en el backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-[#02214A]">
            Ingresa el número del cliente
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-5 space-y-4">
          {/* Info del lead */}
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-sm text-slate-500">Lead</p>
            <p className="font-semibold text-[#02214A]">{lead?.nombre || 'Sin nombre'}</p>
            {lead?.email && (
              <p className="text-sm text-slate-500 mt-1">{lead.email}</p>
            )}
          </div>

          {/* Input de teléfono */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Número de teléfono
            </label>
            <div className="flex gap-2">
              {/* Selector de país */}
              <div className="relative pais-dropdown-container" style={{ minWidth: '140px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setPaisDropdownOpen(!paisDropdownOpen);
                    setPaisBusqueda('');
                  }}
                  className={`w-full px-3 py-3 border rounded-xl text-sm text-left flex items-center gap-2 transition-all ${
                    paisDropdownOpen
                      ? 'border-[#1717AF] ring-2 ring-[#1717AF]/20'
                      : 'border-slate-200 hover:border-slate-300'
                  } bg-white`}
                >
                  {paisActual ? (
                    <>
                      <span className="text-lg">{paisActual.bandera}</span>
                      <span className="text-slate-700">+{paisActual.codigo}</span>
                    </>
                  ) : (
                    <span className="text-slate-400">País</span>
                  )}
                  <ChevronDown size={14} className={`ml-auto text-slate-400 transition-transform ${paisDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown de países */}
                {paisDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                    {/* Búsqueda */}
                    <div className="p-2 border-b border-slate-100">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          ref={paisSearchRef}
                          type="text"
                          value={paisBusqueda}
                          onChange={(e) => setPaisBusqueda(e.target.value)}
                          placeholder="Buscar país..."
                          className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#1717AF]"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    
                    {/* Lista de países */}
                    <div className="max-h-52 overflow-y-auto">
                      {PAISES_TELEFONO
                        .filter(pais => 
                          pais.pais.toLowerCase().includes(paisBusqueda.toLowerCase()) ||
                          pais.codigo.includes(paisBusqueda)
                        )
                        .map((pais) => (
                          <button
                            key={pais.codigo}
                            type="button"
                            onClick={() => {
                              setCodigoPais(pais.codigo);
                              setPaisDropdownOpen(false);
                              setPaisBusqueda('');
                            }}
                            className={`w-full px-3 py-2.5 text-sm text-left flex items-center gap-3 hover:bg-slate-50 transition-colors ${
                              codigoPais === pais.codigo ? 'bg-[#1717AF]/5' : ''
                            }`}
                          >
                            <span className="text-lg">{pais.bandera}</span>
                            <span className="flex-1 text-slate-700">{pais.pais}</span>
                            <span className="text-slate-500">+{pais.codigo}</span>
                            {codigoPais === pais.codigo && (
                              <Check size={14} className="text-[#1717AF]" />
                            )}
                          </button>
                        ))
                      }
                      {PAISES_TELEFONO.filter(pais => 
                        pais.pais.toLowerCase().includes(paisBusqueda.toLowerCase()) ||
                        pais.codigo.includes(paisBusqueda)
                      ).length === 0 && (
                        <div className="px-4 py-3 text-sm text-slate-400 text-center">
                          No se encontró el país
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Input de número */}
              <input
                type="tel"
                inputMode="numeric"
                value={numero}
                onChange={(e) => setNumero(e.target.value.replace(/\D/g, ''))}
                placeholder={paisActual?.placeholder || 'Número de teléfono'}
                className={`flex-1 px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1717AF]/20 focus:border-[#1717AF] ${
                  numero && !validacion.valido
                    ? 'border-rose-300 bg-rose-50/50' 
                    : 'border-slate-200'
                }`}
              />
            </div>
            
            {/* Mensaje de validación */}
            {numero && !validacion.valido && (
              <p className="text-xs text-rose-500 flex items-center gap-1">
                <AlertCircle size={12} />
                {validacion.mensaje}
              </p>
            )}
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`mx-5 mb-4 p-3 rounded-xl text-sm flex items-center gap-2 ${
            toast.type === 'success' 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}>
            {toast.type === 'success' ? (
              <Check size={16} />
            ) : (
              <AlertCircle size={16} />
            )}
            {toast.message}
          </div>
        )}

        {/* Footer */}
        <div className="p-5 border-t border-slate-100">
          <button
            onClick={handleSubmit}
            disabled={enviando || !numero}
            className={`w-full py-3 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 ${
              enviando || !numero
                ? 'bg-slate-300 cursor-not-allowed'
                : 'bg-[#1717AF] hover:bg-[#0f0f8a] shadow-lg shadow-[#1717AF]/25'
            }`}
          >
            {enviando ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Enviando...
              </>
            ) : (
              'Crear en Respond'
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // Renderizar en el body del documento usando Portal
  return ReactDOM.createPortal(modalContent, document.body);
}
