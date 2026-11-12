import { CalendarCheck, Clock, PhoneCall, PhoneOff, Target, UserCheck, Users } from 'lucide-react';
import { formatoDuracion, pct } from './contactoReglas';

function Card({ icon: Icon, label, value, sub, onClick }) {
  const className = `bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-left ${
    onClick ? 'hover:border-[#1717AF]/30 cursor-pointer' : ''
  }`;
  const inner = (
    <>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 truncate">
          {label}
        </span>
        <Icon size={14} className="text-[#1717AF]/70 flex-shrink-0" />
      </div>
      <p className="text-2xl font-bold text-[#1717AF]">{value}</p>
      <p className="text-[11px] text-slate-400 mt-1 leading-tight">{sub}</p>
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {inner}
      </button>
    );
  }
  return <div className={className}>{inner}</div>;
}

export default function ContactoKpis({ kpis, loading, sla = null, onSla }) {
  const mostrarSla = Boolean(sla);
  if (loading) {
    const nCards = mostrarSla ? 7 : 6;
    return (
      <div className={`grid grid-cols-2 gap-3 ${mostrarSla ? 'md:grid-cols-4 xl:grid-cols-7' : 'md:grid-cols-3 lg:grid-cols-6'}`}>
        {Array.from({ length: nCards }).map((_, i) => (
          <div key={i} className="h-[108px] rounded-2xl bg-slate-100 animate-pulse" />
        ))}
      </div>
    );
  }

  const n = (v) => (v || 0).toLocaleString('es-CO');

  return (
    <div className={`grid grid-cols-2 gap-3 ${mostrarSla ? 'md:grid-cols-4 xl:grid-cols-7' : 'md:grid-cols-3 lg:grid-cols-6'}`}>
      {mostrarSla && (
        <Card
          icon={Clock}
          label="Tiempo a contacto"
          value={formatoDuracion(sla.avgMs)}
          sub={`${n(sla.personasSla)} de ${n(kpis.personas)} creados 9:00–21:00`}
          onClick={onSla}
        />
      )}
      <Card
        icon={Users}
        label="Personas contactadas"
        value={n(kpis.personas)}
        sub={`${n(kpis.personasLlamada)} por llamada · ${n(kpis.personasMensaje)} por WhatsApp`}
      />
      <Card
        icon={UserCheck}
        label="Contestación"
        value={pct(kpis.pctContestacion)}
        sub={`${n(kpis.contestaron)} de ${n(kpis.personasParaTasa ?? kpis.personas)} levantaron o respondieron`}
      />
      <Card
        icon={Target}
        label="Efectividad"
        value={pct(kpis.pctEfectividad)}
        sub={`${n(kpis.efectivas)} de ${n(kpis.personasParaTasa ?? kpis.personas)} agendaron`}
      />
      <Card
        icon={PhoneOff}
        label="Número errado"
        value={n(kpis.numeroErrado)}
        sub={`${n(kpis.numeroErradoLlamada)} por llamada · ${n(kpis.numeroErradoMensaje)} por WhatsApp`}
      />
      <Card
        icon={CalendarCheck}
        label="Agendamientos"
        value={n(kpis.agendamientos)}
        sub={`${n(kpis.agendaronLlamada)} por llamada · ${n(kpis.agendaronMensaje)} por WhatsApp`}
      />
      <Card
        icon={PhoneCall}
        label="Seguimientos / persona"
        value={(kpis.seguimientosPorPersona || 0).toFixed(1)}
        sub={`${n(kpis.seguimientos)} seguimientos · ${n(kpis.personas)} personas`}
      />
    </div>
  );
}
