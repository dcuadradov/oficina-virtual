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
  ChevronDown,
  Search,
  Check
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
  { codigo: '506', pais: 'Costa Rica', bandera: '🇨🇷', longitud: [8], placeholder: '81234567' },
  { codigo: '502', pais: 'Guatemala', bandera: '🇬🇹', longitud: [8], placeholder: '51234567' },
  { codigo: '503', pais: 'El Salvador', bandera: '🇸🇻', longitud: [8], placeholder: '71234567' },
  { codigo: '504', pais: 'Honduras', bandera: '🇭🇳', longitud: [8], placeholder: '91234567' },
  { codigo: '505', pais: 'Nicaragua', bandera: '🇳🇮', longitud: [8], placeholder: '81234567' },
  { codigo: '591', pais: 'Bolivia', bandera: '🇧🇴', longitud: [8], placeholder: '71234567' },
  { codigo: '595', pais: 'Paraguay', bandera: '🇵🇾', longitud: [9], placeholder: '981234567' },
  { codigo: '598', pais: 'Uruguay', bandera: '🇺🇾', longitud: [8, 9], placeholder: '91234567' },
  { codigo: '53', pais: 'Cuba', bandera: '🇨🇺', longitud: [8], placeholder: '51234567' },
  { codigo: '1809', pais: 'Rep. Dominicana', bandera: '🇩🇴', longitud: [7], placeholder: '2345678' },
  { codigo: '55', pais: 'Brasil', bandera: '🇧🇷', longitud: [10, 11], placeholder: '11912345678' },
].sort((a, b) => a.pais.localeCompare(b.pais));

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
  
  // Estados para dropdowns con búsqueda
  const [openDropdown, setOpenDropdown] = useState(null); // nombre del campo abierto
  const [searchQueries, setSearchQueries] = useState({}); // búsqueda por campo
  
  // Estados para campos de teléfono
  const [telefonoData, setTelefonoData] = useState({}); // { nombreCampo: { codigoPais: '57', numero: '' } }
  const [paisDropdownOpen, setPaisDropdownOpen] = useState(null); // nombre del campo con dropdown abierto
  const [paisBusqueda, setPaisBusqueda] = useState('');
  const paisSearchRef = useRef(null);
  
  // Estados para carga de archivo
  const [archivo, setArchivo] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);
  
  // Ref para input de búsqueda en dropdown activo
  const dropdownSearchRef = useRef(null);
  
  const userEmail = localStorage.getItem('user_email');

  // Cargar formularios al abrir
  useEffect(() => {
    if (isOpen) {
      fetchFormularios();
    }
  }, [isOpen]);
  
  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (openDropdown && !e.target.closest('.dropdown-container')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);
  
  // Focus en input de búsqueda cuando se abre un dropdown
  useEffect(() => {
    if (openDropdown && dropdownSearchRef.current) {
      setTimeout(() => {
        dropdownSearchRef.current?.focus();
      }, 50);
    }
  }, [openDropdown]);
  
  // Cerrar dropdown de país al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (paisDropdownOpen && !e.target.closest('.pais-dropdown-container')) {
        setPaisDropdownOpen(null);
        setPaisBusqueda('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [paisDropdownOpen]);
  
  // Focus en input de búsqueda de país cuando se abre
  useEffect(() => {
    if (paisDropdownOpen && paisSearchRef.current) {
      setTimeout(() => {
        paisSearchRef.current?.focus();
      }, 50);
    }
  }, [paisDropdownOpen]);

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

  // Fetch fields del formulario activo (usando tabla intermedia)
  const fetchFields = async (formularioId) => {
    setLoadingFields(true);
    try {
      // Query a la tabla intermedia con join a los fields
      const { data, error } = await supabase
        .from('fields_formularios_relacion')
        .select(`
          orden,
          field:fields_formulario_creacion_leads (
            id,
            nombre,
            tipo,
            opciones,
            obligatorio,
            tooltip,
            dinamico,
            depende_de,
            estado
          )
        `)
        .eq('formulario_id', formularioId)
        .order('orden', { ascending: true });

      if (error) throw error;
      
      // Transformar la data para aplanar la estructura y filtrar activos
      const fieldsData = (data || [])
        .filter(item => item.field && item.field.estado === 'activo')
        .map(item => ({
          ...item.field,
          orden: item.orden
        }));
      
      setFields(fieldsData);
      
      // Resetear formData y telefonoData
      const initialData = {};
      const initialTelefonoData = {};
      fieldsData.forEach(field => {
        initialData[field.nombre] = '';
        if (field.tipo === 'telefono') {
          initialTelefonoData[field.nombre] = { codigoPais: '57', numero: '' }; // Colombia por defecto
        }
      });
      setFormData(initialData);
      setTelefonoData(initialTelefonoData);
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

  // Manejar cambio de campo de teléfono
  const handleTelefonoChange = (fieldNombre, tipo, value) => {
    // Solo permitir números en el campo de número
    if (tipo === 'numero') {
      value = value.replace(/\D/g, '');
    }
    
    setTelefonoData(prev => {
      const newData = {
        ...prev,
        [fieldNombre]: {
          ...prev[fieldNombre],
          [tipo]: value
        }
      };
      
      // Actualizar formData con el valor combinado: +código.numero
      const { codigoPais, numero } = newData[fieldNombre];
      const valorCombinado = numero ? `+${codigoPais}.${numero}` : '';
      setFormData(prevForm => ({
        ...prevForm,
        [fieldNombre]: valorCombinado
      }));
      
      return newData;
    });
  };
  
  // Validar número de teléfono según el país
  const validarTelefono = (fieldNombre) => {
    const data = telefonoData[fieldNombre];
    if (!data || !data.numero) return { valido: true, mensaje: '' }; // Si está vacío, no validar
    
    const paisConfig = PAISES_TELEFONO.find(p => p.codigo === data.codigoPais);
    if (!paisConfig) return { valido: true, mensaje: '' };
    
    const longitudValida = paisConfig.longitud.includes(data.numero.length);
    if (!longitudValida) {
      const longitudesStr = paisConfig.longitud.join(' o ');
      return { 
        valido: false, 
        mensaje: `El número debe tener ${longitudesStr} dígitos para ${paisConfig.pais}` 
      };
    }
    
    return { valido: true, mensaje: '' };
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
      
      // Validar campos de teléfono
      if (field.tipo === 'telefono' && formData[field.nombre]) {
        const validacion = validarTelefono(field.nombre);
        if (!validacion.valido) {
          setToast({ type: 'error', message: validacion.mensaje });
          return false;
        }
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
    setTelefonoData({});
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
                    <div key={field.id}>
                      {/* Label con tooltip al lado */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <label className="text-sm font-medium text-slate-600">
                          {field.nombre}
                          {field.obligatorio && <span className="text-rose-500 ml-0.5">*</span>}
                        </label>
                        {field.tooltip && (
                          <div className="relative group">
                            <Info size={14} className="text-slate-400 cursor-help hover:text-slate-600 transition-colors" />
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-52 p-2.5 bg-slate-800 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 shadow-lg">
                              {field.tooltip}
                              <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800" />
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {field.tipo === 'select' ? (
                        <div className="relative dropdown-container">
                          {/* Botón del dropdown */}
                          <button
                            type="button"
                            onClick={() => {
                              setOpenDropdown(openDropdown === field.nombre ? null : field.nombre);
                              setSearchQueries(prev => ({ ...prev, [field.nombre]: '' }));
                            }}
                            className={`w-full px-4 py-3 border rounded-xl text-sm text-left flex items-center justify-between transition-all ${
                              openDropdown === field.nombre
                                ? 'border-[#1717AF] ring-2 ring-[#1717AF]/20'
                                : 'border-slate-200 hover:border-slate-300'
                            } bg-white`}
                          >
                            <span className={formData[field.nombre] ? 'text-slate-800' : 'text-slate-400'}>
                              {formData[field.nombre] || 'Selecciona una opción'}
                            </span>
                            <ChevronDown size={16} className={`text-slate-400 transition-transform ${openDropdown === field.nombre ? 'rotate-180' : ''}`} />
                          </button>
                          
                          {/* Dropdown con búsqueda */}
                          {openDropdown === field.nombre && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 overflow-hidden">
                              {/* Campo de búsqueda */}
                              <div className="p-2 border-b border-slate-100">
                                <div className="relative">
                                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                  <input
                                    ref={dropdownSearchRef}
                                    type="text"
                                    value={searchQueries[field.nombre] || ''}
                                    onChange={(e) => setSearchQueries(prev => ({ ...prev, [field.nombre]: e.target.value }))}
                                    placeholder="Buscar..."
                                    className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#1717AF]"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                              </div>
                              
                              {/* Lista de opciones */}
                              <div className="max-h-48 overflow-y-auto">
                                {opciones
                                  .filter(opt => 
                                    opt.value.toLowerCase().includes((searchQueries[field.nombre] || '').toLowerCase())
                                  )
                                  .map((opt, idx) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => {
                                        handleFieldChange(field.nombre, opt.value);
                                        setOpenDropdown(null);
                                      }}
                                      className={`w-full px-4 py-2.5 text-sm text-left flex items-center justify-between hover:bg-slate-50 transition-colors ${
                                        formData[field.nombre] === opt.value ? 'bg-[#1717AF]/5 text-[#1717AF]' : 'text-slate-700'
                                      }`}
                                    >
                                      <span>{opt.value}</span>
                                      {formData[field.nombre] === opt.value && (
                                        <Check size={14} className="text-[#1717AF]" />
                                      )}
                                    </button>
                                  ))
                                }
                                {opciones.filter(opt => 
                                  opt.value.toLowerCase().includes((searchQueries[field.nombre] || '').toLowerCase())
                                ).length === 0 && (
                                  <div className="px-4 py-3 text-sm text-slate-400 text-center">
                                    No se encontraron resultados
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : field.tipo === 'telefono' ? (
                        /* Campo de teléfono internacional */
                        <div className="space-y-1">
                          <div className="flex gap-2">
                            {/* Selector de país */}
                            <div className="relative pais-dropdown-container" style={{ minWidth: '140px' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setPaisDropdownOpen(paisDropdownOpen === field.nombre ? null : field.nombre);
                                  setPaisBusqueda('');
                                }}
                                className={`w-full px-3 py-3 border rounded-xl text-sm text-left flex items-center gap-2 transition-all ${
                                  paisDropdownOpen === field.nombre
                                    ? 'border-[#1717AF] ring-2 ring-[#1717AF]/20'
                                    : 'border-slate-200 hover:border-slate-300'
                                } bg-white`}
                              >
                                {(() => {
                                  const paisActual = PAISES_TELEFONO.find(p => p.codigo === telefonoData[field.nombre]?.codigoPais);
                                  return paisActual ? (
                                    <>
                                      <span className="text-lg">{paisActual.bandera}</span>
                                      <span className="text-slate-700">+{paisActual.codigo}</span>
                                    </>
                                  ) : (
                                    <span className="text-slate-400">País</span>
                                  );
                                })()}
                                <ChevronDown size={14} className={`ml-auto text-slate-400 transition-transform ${paisDropdownOpen === field.nombre ? 'rotate-180' : ''}`} />
                              </button>
                              
                              {/* Dropdown de países */}
                              {paisDropdownOpen === field.nombre && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-40 overflow-hidden" style={{ width: '280px' }}>
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
                                            handleTelefonoChange(field.nombre, 'codigoPais', pais.codigo);
                                            setPaisDropdownOpen(null);
                                            setPaisBusqueda('');
                                          }}
                                          className={`w-full px-3 py-2.5 text-sm text-left flex items-center gap-3 hover:bg-slate-50 transition-colors ${
                                            telefonoData[field.nombre]?.codigoPais === pais.codigo ? 'bg-[#1717AF]/5' : ''
                                          }`}
                                        >
                                          <span className="text-lg">{pais.bandera}</span>
                                          <span className="flex-1 text-slate-700">{pais.pais}</span>
                                          <span className="text-slate-500">+{pais.codigo}</span>
                                          {telefonoData[field.nombre]?.codigoPais === pais.codigo && (
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
                              value={telefonoData[field.nombre]?.numero || ''}
                              onChange={(e) => handleTelefonoChange(field.nombre, 'numero', e.target.value)}
                              placeholder={(() => {
                                const paisActual = PAISES_TELEFONO.find(p => p.codigo === telefonoData[field.nombre]?.codigoPais);
                                return paisActual?.placeholder || 'Número de teléfono';
                              })()}
                              className={`flex-1 px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1717AF]/20 focus:border-[#1717AF] ${
                                !validarTelefono(field.nombre).valido 
                                  ? 'border-rose-300 bg-rose-50/50' 
                                  : 'border-slate-200'
                              }`}
                            />
                          </div>
                          
                          {/* Mensaje de validación */}
                          {!validarTelefono(field.nombre).valido && (
                            <p className="text-xs text-rose-500 flex items-center gap-1">
                              <AlertCircle size={12} />
                              {validarTelefono(field.nombre).mensaje}
                            </p>
                          )}
                        </div>
                      ) : (
                        <input
                          type={field.tipo === 'numero' ? 'number' : field.tipo === 'email' ? 'email' : 'text'}
                          value={formData[field.nombre] || ''}
                          onChange={(e) => handleFieldChange(field.nombre, e.target.value)}
                          placeholder={`Ingresa ${field.nombre.toLowerCase()}`}
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

