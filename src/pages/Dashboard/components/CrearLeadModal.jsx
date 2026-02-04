import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  X, 
  UserPlus, 
  Users, 
  Upload, 
  FileSpreadsheet, 
  Info, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown
} from 'lucide-react';
import { supabase } from '../../../supabaseClient';

/**
 * Parsea las opciones del campo select
 * Formato: "Opción A (1), Opción B (2), Opción C (3)"
 * Retorna: [{ value: "Opción A", orden: 1 }, ...]
 */
const parseOpciones = (opcionesStr) => {
  if (!opcionesStr) return [];
  
  return opcionesStr.split(',').map(opt => {
    const match = opt.trim().match(/^(.+?)\s*\((\d+)\)$/);
    if (match) {
      return { value: match[1].trim(), orden: parseInt(match[2]) };
    }
    return { value: opt.trim(), orden: 999 };
  }).sort((a, b) => a.orden - b.orden);
};

/**
 * Parsea la condición de dependencia
 * Formato: "field_id, valor"
 * Retorna: { fieldId: "field_id", valor: "valor" }
 */
const parseDependeDe = (dependeDeStr) => {
  if (!dependeDeStr) return null;
  const [fieldId, valor] = dependeDeStr.split(',').map(s => s.trim());
  return { fieldId, valor };
};

const CrearLeadModal = ({ isOpen, onClose }) => {
  // Estados principales
  const [formularios, setFormularios] = useState([]);
  const [formularioActivo, setFormularioActivo] = useState(null);
  const [fields, setFields] = useState([]);
  const [loadingFormularios, setLoadingFormularios] = useState(true);
  const [loadingFields, setLoadingFields] = useState(false);
  
  // Estados del modo de creación
  const [modoCreacion, setModoCreacion] = useState('individual'); // 'individual' | 'multiple'
  
  // Estados del formulario individual
  const [formData, setFormData] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [toast, setToast] = useState(null);
  
  // Estados para carga de archivo
  const [archivo, setArchivo] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);
  
  const userEmail = localStorage.getItem('user_email');

  // Cargar formularios al abrir
  useEffect(() => {
    if (isOpen) {
      fetchFormularios();
    }
  }, [isOpen]);

  // Cargar fields cuando cambia el formulario activo
  useEffect(() => {
    if (formularioActivo) {
      fetchFields(formularioActivo.id);
    }
  }, [formularioActivo]);

  // Fetch formularios
  const fetchFormularios = async () => {
    setLoadingFormularios(true);
    try {
      const { data, error } = await supabase
        .from('formularios_creacion_leads')
        .select('*')
        .eq('estado', 'activo')
        .eq('modulo', 'comercial')
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      setFormularios(data || []);
      if (data && data.length > 0) {
        setFormularioActivo(data[0]);
      }
    } catch (error) {
      console.error('Error cargando formularios:', error);
    } finally {
      setLoadingFormularios(false);
    }
  };

  // Fetch fields del formulario activo
  const fetchFields = async (formularioId) => {
    setLoadingFields(true);
    try {
      const { data, error } = await supabase
        .from('fields_formulario_creacion_leads')
        .select('*')
        .eq('formulario', formularioId)
        .eq('estado', 'activo')
        .order('orden', { ascending: true });

      if (error) throw error;
      
      setFields(data || []);
      // Resetear formData
      const initialData = {};
      (data || []).forEach(field => {
        initialData[field.nombre] = '';
      });
      setFormData(initialData);
    } catch (error) {
      console.error('Error cargando fields:', error);
    } finally {
      setLoadingFields(false);
    }
  };

  // Manejar cambio de campo
  const handleFieldChange = (fieldNombre, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldNombre]: value
    }));
  };

  // Verificar si un campo debe mostrarse (campos dinámicos)
  const shouldShowField = (field) => {
    if (!field.dinamico) return true;
    
    const dependencia = parseDependeDe(field.depende_de);
    if (!dependencia) return true;
    
    return formData[dependencia.fieldId] === dependencia.valor;
  };

  // Manejar drag & drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file) => {
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setToast({ type: 'error', message: 'Por favor selecciona un archivo Excel o CSV' });
      return;
    }
    
    setArchivo(file);
  };

  // Convertir archivo a base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  // Validar formulario
  const validateForm = () => {
    for (const field of fields) {
      if (!shouldShowField(field)) continue;
      
      if (field.obligatorio && !formData[field.nombre]?.trim()) {
        setToast({ type: 'error', message: `El campo "${field.nombre}" es obligatorio` });
        return false;
      }
    }
    return true;
  };

  // Enviar formulario
  const handleSubmit = async () => {
    if (modoCreacion === 'individual') {
      if (!validateForm()) return;
    } else {
      if (!archivo) {
        setToast({ type: 'error', message: 'Por favor adjunta un archivo' });
        return;
      }
    }

    setEnviando(true);
    try {
      let payload = {
        usuario_email: userEmail,
        tipo_formulario: formularioActivo?.nombre,
        tipo: modoCreacion === 'individual' ? 'Individual' : 'Multiple'
      };

      if (modoCreacion === 'individual') {
        payload.data = formData;
      } else {
        const base64 = await fileToBase64(archivo);
        payload.archivo = base64;
        payload.nombre_archivo = archivo.name;
      }

      const response = await fetch('https://api.mdenglish.us/webhook/creacion_leads_portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Error en la respuesta del servidor');

      setToast({ 
        type: 'success', 
        message: '¡Tus usuarios se crearon exitosamente! En unos minutos deberías poder verlos.' 
      });

      // Limpiar y cerrar después de 3 segundos
      setTimeout(() => {
        resetForm();
        onClose();
      }, 3000);

    } catch (error) {
      console.error('Error enviando formulario:', error);
      setToast({ type: 'error', message: 'Ocurrió un error al crear los leads. Intenta de nuevo.' });
    } finally {
      setEnviando(false);
    }
  };

  // Resetear formulario
  const resetForm = () => {
    setFormData({});
    setArchivo(null);
    setModoCreacion('individual');
    setToast(null);
  };

  // Cerrar modal
  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">Agrega tus lead(s)</h2>
              <button
                onClick={handleClose}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Selector de modo: Individual vs Múltiple */}
            <div className="flex items-center justify-center gap-6 mt-4">
              <button
                onClick={() => setModoCreacion('individual')}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                  modoCreacion === 'individual'
                    ? 'text-[#1717AF]'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <UserPlus size={28} strokeWidth={modoCreacion === 'individual' ? 2 : 1.5} />
              </button>
              <button
                onClick={() => setModoCreacion('multiple')}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                  modoCreacion === 'multiple'
                    ? 'text-[#1717AF]'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Users size={28} strokeWidth={modoCreacion === 'multiple' ? 2 : 1.5} />
              </button>
            </div>
            
            {/* Tabs de formularios */}
            {!loadingFormularios && formularios.length > 0 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                {formularios.map((form) => (
                  <button
                    key={form.id}
                    onClick={() => setFormularioActivo(form)}
                    className={`px-4 py-2 text-sm font-medium transition-all relative ${
                      formularioActivo?.id === form.id
                        ? 'text-[#1717AF]'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {form.nombre}
                    {formularioActivo?.id === form.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1717AF] rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Content con scroll */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {loadingFormularios || loadingFields ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={32} className="animate-spin text-[#1717AF]" />
              </div>
            ) : modoCreacion === 'individual' ? (
              /* Formulario individual */
              <div className="space-y-4">
                <p className="text-sm font-medium text-slate-700 mb-4">Información</p>
                
                {fields.map((field) => {
                  if (!shouldShowField(field)) return null;
                  
                  const opciones = parseOpciones(field.opciones);
                  
                  return (
                    <div key={field.id} className="relative">
                      {/* Label con tooltip */}
                      {field.tooltip && (
                        <div className="absolute right-0 top-0 group">
                          <Info size={14} className="text-slate-400 cursor-help" />
                          <div className="absolute right-0 top-full mt-1 w-48 p-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                            {field.tooltip}
                          </div>
                        </div>
                      )}
                      
                      {field.tipo === 'select' ? (
                        <div className="relative">
                          <select
                            value={formData[field.nombre] || ''}
                            onChange={(e) => handleFieldChange(field.nombre, e.target.value)}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1717AF]/20 focus:border-[#1717AF] appearance-none bg-white"
                          >
                            <option value="">{field.nombre}{field.obligatorio ? ' *' : ''}</option>
                            {opciones.map((opt, idx) => (
                              <option key={idx} value={opt.value}>{opt.value}</option>
                            ))}
                          </select>
                          <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      ) : (
                        <input
                          type={field.tipo === 'numero' ? 'number' : field.tipo === 'email' ? 'email' : 'text'}
                          value={formData[field.nombre] || ''}
                          onChange={(e) => handleFieldChange(field.nombre, e.target.value)}
                          placeholder={`${field.nombre}${field.obligatorio ? ' *' : ''}`}
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1717AF]/20 focus:border-[#1717AF]"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Carga múltiple */
              <div className="space-y-4">
                <p className="text-sm font-medium text-slate-700">Adjunta tu archivo en formato excel</p>
                
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                    dragging
                      ? 'border-[#1717AF] bg-[#1717AF]/5'
                      : archivo
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {archivo ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center">
                        <FileSpreadsheet size={32} className="text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{archivo.name}</p>
                        <p className="text-sm text-slate-500">
                          {(archivo.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <button
                        onClick={() => setArchivo(null)}
                        className="text-sm text-rose-500 hover:text-rose-600"
                      >
                        Quitar archivo
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                        <Upload size={28} className="text-slate-400" />
                      </div>
                      <p className="text-sm text-slate-500 mb-4">
                        Arrastra acá tu archivo o adjúntalo desde tu computador
                      </p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-[#1717AF] text-white text-sm font-medium rounded-lg hover:bg-[#1717AF]/90 transition-colors"
                      >
                        Adjuntar
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                        className="hidden"
                      />
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 flex-shrink-0">
            <button
              onClick={handleSubmit}
              disabled={enviando}
              className="w-full py-3 bg-[#1717AF] text-white font-medium rounded-xl hover:bg-[#1717AF]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {enviando ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Enviando...
                </>
              ) : (
                modoCreacion === 'individual' ? 'Crear' : 'Enviar'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl ${
          toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
        } text-white max-w-md animate-slide-up`}>
          {toast.type === 'success' ? (
            <CheckCircle2 size={22} />
          ) : (
            <AlertCircle size={22} />
          )}
          <p className="text-sm font-medium">{toast.message}</p>
          <button
            onClick={() => setToast(null)}
            className="ml-2 p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
};

export default CrearLeadModal;

