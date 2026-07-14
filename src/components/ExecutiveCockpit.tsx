/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SharedState } from '../types';
import { 
  TrendingUp, Calendar, AlertTriangle, Users, FileText, CheckCircle, 
  Clock, ShieldAlert, DollarSign, Activity, Settings, ArrowUpRight
} from 'lucide-react';

interface ExecutiveCockpitProps {
  state: SharedState;
  setViewTab: (tab: string) => void;
}

export const ExecutiveCockpit: React.FC<ExecutiveCockpitProps> = ({ state, setViewTab }) => {
  // Compute metrics
  const totalAppointments = state.appointments.length;
  const completedAppts = state.appointments.filter(a => a.status === 'completed');
  const pastApptsCount = completedAppts.length + state.appointments.filter(a => a.status === 'no-show').length;
  const noShowAppts = state.appointments.filter(a => a.status === 'no-show');
  
  const noShowRate = pastApptsCount > 0 ? (noShowAppts.length / pastApptsCount) * 100 : 8.5;
  const cancellations = state.appointments.filter(a => a.status === 'cancelled').length;
  
  // Slot recovery rate
  const releasedSlots = state.slots.filter(s => s.released_by_cancellation);
  const recoveredSlots = state.slots.filter(s => s.recovered);
  const slotRecoveryRate = releasedSlots.length > 0 ? (recoveredSlots.length / releasedSlots.length) * 100 : 75;

  // Delays
  const delayedVisits = state.appointments.filter(a => a.delay_minutes > 0);
  const totalDelayMinutes = delayedVisits.reduce((acc, a) => acc + a.delay_minutes, 0);
  const avgDelay = delayedVisits.length > 0 ? totalDelayMinutes / delayedVisits.length : 18.5;

  // Tickets
  const openTickets = state.tickets.filter(t => t.status === 'open' || t.status === 'in_progress');
  const overSlaTickets = state.tickets.filter(t => {
    if (t.status === 'resolved' || t.status === 'closed') return false;
    const todayStr = "2026-07-10";
    return t.sla_due_date < todayStr;
  });

  // NPS and Satisfaction
  const activeFeedback = state.feedback;
  const avgSatisfaction = activeFeedback.length > 0 
    ? activeFeedback.reduce((acc, f) => acc + f.score, 0) / activeFeedback.length 
    : 4.2;

  // Devices and Cyber
  const totalDevices = state.devices.length;
  const offlineDevices = state.devices.filter(d => d.status === 'offline').length;
  const activeCyberEvents = state.cyberEvents.filter(e => e.remediation_status !== 'resolved');
  const highCyberEvents = activeCyberEvents.filter(e => e.severity === 'High' || e.severity === 'Critical').length;

  // Economic Impact (Margins at risk)
  const noShowCost = noShowAppts.length * 120; // €120 average margin
  const cancellationCost = cancellations * 120 * 0.25; // 25% are lost without recovery
  const delayDissatisfactionCost = delayedVisits.filter(a => a.delay_minutes > 30).length * 80;
  const downtimeCost = state.devices.filter(d => d.status === 'offline' || d.status === 'anomaly').length * 450;
  
  const totalMarginAtRisk = noShowCost + cancellationCost + delayDissatisfactionCost + downtimeCost;

  // Render quick metric card helper
  const renderKpiCard = (
    title: string, 
    value: string | number, 
    trend: string, 
    isPositive: boolean, 
    colorClass: string,
    icon: React.ReactNode,
    tabLink: string,
    interpretation: string
  ) => {
    return (
      <div 
        onClick={() => setViewTab(tabLink)}
        className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-xl shadow-lg transition-all duration-200 cursor-pointer group flex flex-col justify-between"
      >
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{title}</p>
            <p className="text-xl font-bold text-slate-100 mt-1">{value}</p>
          </div>
          <div className={`p-2 rounded-lg bg-slate-950 border border-slate-800 ${colorClass}`}>
            {icon}
          </div>
        </div>
        <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
          <span className={`font-semibold flex items-center gap-0.5 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend}
          </span>
          <span className="text-slate-500 truncate max-w-[150px]" title={interpretation}>{interpretation}</span>
          <ArrowUpRight className="h-3 w-3 text-slate-600 group-hover:text-slate-400" />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {renderKpiCard(
          "No-Show Rate", 
          `${noShowRate.toFixed(1)}%`, 
          "-1.4% vs Mese prec.", 
          true, 
          "text-cyan-400", 
          <Users className="h-4 w-4" />,
          "agenda",
          "Target sotto il 5.0%"
        )}

        {renderKpiCard(
          "Slot Recovery Rate", 
          `${slotRecoveryRate.toFixed(0)}%`, 
          "+8% recupero attivo", 
          true, 
          "text-emerald-400", 
          <CheckCircle className="h-4 w-4" />,
          "agenda",
          "Visite anticipate in lista"
        )}

        {renderKpiCard(
          "Ritardo Medio Clinico", 
          `${avgDelay.toFixed(1)} min`, 
          "+2.1 min oggi", 
          false, 
          "text-amber-500", 
          <Clock className="h-4 w-4" />,
          "operations",
          "Attese pazienti in sala"
        )}

        {renderKpiCard(
          "Margine Proxy a Rischio", 
          `€${totalMarginAtRisk.toLocaleString()}`, 
          "Proxy inefficienza", 
          false, 
          "text-rose-500", 
          <DollarSign className="h-4 w-4" />,
          "economic",
          "Non è perdita contabile certa"
        )}

        {renderKpiCard(
          "Reclami & Feedback", 
          `${openTickets.length} aperti`, 
          `${overSlaTickets.length} oltre SLA`, 
          overSlaTickets.length === 0, 
          "text-indigo-400", 
          <AlertTriangle className="h-4 w-4" />,
          "tickets",
          "Customer Care in coda"
        )}

        {renderKpiCard(
          "Soddisfazione Pazienti", 
          `${avgSatisfaction.toFixed(1)} / 5.0`, 
          "NPS Medio: +42", 
          true, 
          "text-pink-400", 
          <TrendingUp className="h-4 w-4" />,
          "tickets",
          "Sentiment post-visita"
        )}

        {renderKpiCard(
          "Downtime Device", 
          `${offlineDevices} offline`, 
          `${totalDevices} censiti in IoMT`, 
          offlineDevices === 0, 
          "text-teal-400", 
          <Activity className="h-4 w-4" />,
          "devices",
          "Disponibilità diagnostica"
        )}

        {renderKpiCard(
          "Allarmi Cybersecurity", 
          `${highCyberEvents} critici`, 
          "MFA & Patch vulnerabili", 
          highCyberEvents === 0, 
          "text-red-500", 
          <ShieldAlert className="h-4 w-4" />,
          "cybersecurity",
          "Threats rilevati dal SOC"
        )}

      </div>

      {/* CUSTOM DATA VISUALISATIONS (SVG CHARTS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* CHART 1: WEEKLY NO-SHOW & CANCELLATIONS */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">No-Show & Cancellazioni per Settimana</h4>
              <p className="text-[11px] text-slate-500">Andamento inefficienze operative ultimi 5 cicli</p>
            </div>
            <span className="text-[10px] bg-slate-800 text-cyan-400 border border-slate-700 px-2 py-0.5 rounded font-mono">Real-Time</span>
          </div>

          <div className="h-48 w-full flex items-end justify-between px-2 pt-4 relative">
            {/* Grid background lines */}
            <div className="absolute inset-x-0 bottom-0 border-b border-slate-800"></div>
            <div className="absolute inset-x-0 bottom-1/4 border-b border-slate-800/50"></div>
            <div className="absolute inset-x-0 bottom-2/4 border-b border-slate-800/50"></div>
            <div className="absolute inset-x-0 bottom-3/4 border-b border-slate-800/50"></div>

            {/* Bars */}
            {[
              { label: 'Sett 24', ns: 12, canc: 18 },
              { label: 'Sett 25', ns: 15, canc: 22 },
              { label: 'Sett 26', ns: 8, canc: 14 },
              { label: 'Sett 27', ns: 14, canc: 25 },
              { label: 'Oggi (S28)', ns: noShowAppts.length, canc: cancellations }
            ].map((week, idx) => {
              const maxVal = 40;
              const nsHeight = (week.ns / maxVal) * 100;
              const cancHeight = (week.canc / maxVal) * 100;

              return (
                <div key={idx} className="flex flex-col items-center flex-1 group z-10">
                  <div className="w-full flex justify-center space-x-1.5 items-end h-36">
                    {/* No Show Bar */}
                    <div 
                      style={{ height: `${Math.max(nsHeight, 4)}%` }} 
                      className="w-3.5 bg-cyan-500 rounded-t-sm hover:bg-cyan-400 transition-all cursor-pointer relative"
                      title={`No-Show: ${week.ns}`}
                    >
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-950 border border-slate-700 text-cyan-300 text-[9px] font-mono px-1 rounded opacity-0 group-hover:opacity-100 transition-all pointer-events-none">
                        {week.ns}
                      </span>
                    </div>
                    {/* Cancellation Bar */}
                    <div 
                      style={{ height: `${Math.max(cancHeight, 4)}%` }} 
                      className="w-3.5 bg-rose-600 rounded-t-sm hover:bg-rose-500 transition-all cursor-pointer relative"
                      title={`Cancellati: ${week.canc}`}
                    >
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-950 border border-slate-700 text-rose-300 text-[9px] font-mono px-1 rounded opacity-0 group-hover:opacity-100 transition-all pointer-events-none">
                        {week.canc}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium mt-2">{week.label}</span>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center justify-center space-x-5 text-xs text-slate-400 border-t border-slate-800/50 pt-3">
            <div className="flex items-center space-x-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-cyan-500 block"></span>
              <span>No-Show</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-rose-600 block"></span>
              <span>Cancellazioni</span>
            </div>
          </div>
        </div>

        {/* CHART 2: COMPLAINTS BY CATEGORY */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reclami Ospedalieri per Categoria</h4>
              <p className="text-[11px] text-slate-500">Mappatura cause di insoddisfazione (Totale: {state.tickets.length})</p>
            </div>
            <span className="text-[10px] bg-slate-800 text-indigo-400 border border-slate-700 px-2 py-0.5 rounded font-mono">SLA Check</span>
          </div>

          <div className="h-48 w-full flex flex-col justify-between pt-1">
            {['Referto', 'Pagamento', 'Attesa', 'Medico/personale', 'App/Portale'].map((cat, idx) => {
              const count = state.tickets.filter(t => t.category === cat).length;
              const maxTickets = Math.max(...['Referto', 'Pagamento', 'Attesa', 'Medico/personale', 'App/Portale'].map(c => state.tickets.filter(t => t.category === c).length), 1);
              const percentage = (count / maxTickets) * 100;

              return (
                <div key={idx} className="flex items-center space-x-3 text-xs">
                  <span className="w-24 text-slate-400 font-medium truncate text-right">{cat}</span>
                  <div className="flex-1 bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800/50 relative">
                    <div 
                      style={{ width: `${Math.max(percentage, 5)}%` }}
                      className="bg-gradient-to-r from-indigo-600 to-indigo-400 h-full rounded-full transition-all duration-500"
                    ></div>
                  </div>
                  <span className="w-8 font-mono text-slate-300 font-bold text-left">{count}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 text-[11px] text-slate-500 text-center border-t border-slate-800/50 pt-3">
            I tempi di attesa ed i ritardi dei referti generano il 70% dei ticket aperti.
          </div>
        </div>

      </div>

      {/* SUB-SECTION 3: EQUIPMENT OPERATIONAL SUMMARY */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Diagnostica & IoMT Telemetry Downtime</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['RM', 'TAC', 'Ecografo'].map((type, idx) => {
            const typeDevices = state.devices.filter(d => d.device_type === type);
            const avgUptime = typeDevices.reduce((acc, d) => acc + d.uptime_percentage, 0) / (typeDevices.length || 1);
            const offlineCount = typeDevices.filter(d => d.status === 'offline').length;

            return (
              <div key={idx} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/60">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-300">{type} (Magnetic/Imaging)</span>
                  <span className={`h-2.5 w-2.5 rounded-full ${offlineCount > 0 ? 'bg-red-500 animate-ping' : 'bg-emerald-500'}`}></span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <p className="text-lg font-bold text-slate-100">{avgUptime.toFixed(1)}%</p>
                  <span className="text-[10px] text-slate-500">Uptime Medio</span>
                </div>
                <div className="mt-2 bg-slate-900 h-1.5 rounded-full overflow-hidden">
                  <div 
                    style={{ width: `${avgUptime}%` }}
                    className={`h-full ${avgUptime > 97 ? 'bg-emerald-500' : avgUptime > 95 ? 'bg-amber-500' : 'bg-red-500'}`}
                  ></div>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 font-mono">
                  {offlineCount > 0 ? `⚠️ ${offlineCount} MACCHINA OFFLINE` : 'Tutti i nodi IoMT operativi'}
                </p>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
