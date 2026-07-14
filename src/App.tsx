/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  SharedState, Appointment, Slot, Ticket, Feedback, MedicalDevice, CyberEvent 
} from './types';
import { 
  readSharedState, saveSharedState, resetSharedState, 
  proposeSlotAdvance, createDeviceAlert, createCyberTask, 
  updateTicketStatus, cancelAppointment 
} from './stateManager';
import { HeaderDemo } from './components/HeaderDemo';
import { PatientView } from './components/PatientView';
import { ExecutiveCockpit } from './components/ExecutiveCockpit';
import { 
  TrendingUp, Calendar, AlertTriangle, Users, FileText, CheckCircle, 
  Clock, ShieldAlert, DollarSign, Activity, Settings, ArrowUpRight,
  Terminal, Shield, Sliders, Play, Plus, RefreshCw, Layers, Check, X,
  User, Send, Download, ChevronRight, HelpCircle, MessageSquare
} from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'patient' | 'corporate'>('corporate');
  const [sharedState, setSharedState] = useState<SharedState>(readSharedState());
  const [selectedPatientId, setSelectedPatientId] = useState<string>('pat_maria');
  
  // Corporate sub-tabs
  const [corporateTab, setCorporateTab] = useState<string>('cockpit'); // cockpit, agenda, tickets, devices, cyber
  const [selectedRole, setSelectedRole] = useState<string>('Direzione Sanitaria');

  // Interactive local states
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'info' } | null>(null);
  
  // Ticket details modal / state
  const [assigneeInput, setAssigneeInput] = useState<{ [ticketId: string]: string }>({});
  const [noteInput, setNoteInput] = useState<{ [ticketId: string]: string }>({});

  // Trigger global toast
  const triggerToast = (message: string, type: 'success' | 'warning' | 'info') => {
    setToast({ message, type });
  };

  // Dismiss toast automatically
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Sync state changes across views automatically
  useEffect(() => {
    const handleStateUpdate = () => {
      setSharedState(readSharedState());
    };
    window.addEventListener('saluscare_state_updated', handleStateUpdate);
    return () => {
      window.removeEventListener('saluscare_state_updated', handleStateUpdate);
    };
  }, []);

  // Sync state wrapper
  const handleStateChange = (newState: SharedState) => {
    setSharedState(newState);
  };

  // Demo reset
  const handleReset = () => {
    const freshState = resetSharedState();
    setSharedState(freshState);
    triggerToast("Database demo ripristinato con successo!", "success");
  };

  // SIMULATION EVENTS
  const handleTriggerDeviceOffline = () => {
    const updated = createDeviceAlert('dev_rm_1', 'offline', 'Biomedical Engineer');
    setSharedState(updated);
    triggerToast("ALERT: Risonanza Magnetica (EQ-RM-001) andata offline!", "warning");
  };

  const handleTriggerCyberAttack = () => {
    const newState = { ...sharedState };
    const newEvent: CyberEvent = {
      cyber_event_id: `cyber_attack_${Date.now()}`,
      asset_id: 'dev_gtw_1',
      device_id: 'dev_gtw_1',
      severity: 'Critical',
      mitre_tactic: 'Exfiltration',
      timestamp: new Date().toISOString(),
      mfa_status: 'disabled',
      privileged_account: true,
      incident_linked: true,
      patch_available: false,
      remediation_status: 'open',
      owner: 'SOC Lead SalusCare'
    };
    newState.cyberEvents = [newEvent, ...newState.cyberEvents];
    newState.auditLog = [{
      log_id: `aud_cyber_${Date.now()}`,
      timestamp: new Date().toISOString(),
      user_role: 'System',
      action: 'CYBER_ATTACK_DETECTED',
      object_type: 'SECURITY',
      object_id: 'dev_gtw_1',
      previous_state: 'normal',
      new_state: 'under_attack',
      reason: 'Unusual outbound data egress detected'
    }, ...newState.auditLog];
    newState.eventLog = [{
      event_id: `evt_cyber_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'CYBER_ALERT_TRIGGERED',
      message: 'CRITICAL: Rilevato traffico anomalo dal database cartelle cliniche.',
      payload: { severity: 'Critical' }
    }, ...newState.eventLog];

    saveSharedState(newState);
    setSharedState(newState);
    triggerToast("SECURITY ALERT: Rilevato traffico anomalo dal database!", "warning");
  };

  const handleSimulateCancellation = () => {
    // Find an active scheduled appointment to cancel
    const apptToCancel = sharedState.appointments.find(a => a.status === 'scheduled' || a.status === 'confirmed');
    if (apptToCancel) {
      const updated = cancelAppointment(apptToCancel.appointment_id, 'Imprevisto personale (Simulato)', 'Paziente');
      setSharedState(updated);
      triggerToast(`Cancellato appuntamento di ${apptToCancel.specialty} per ${apptToCancel.patient_id}. Slot rilasciato!`, 'warning');
    } else {
      triggerToast("Nessun appuntamento attivo disponibile da annullare.", "info");
    }
  };

  const handleRemediateCyber = (eventId: string) => {
    const updated = createCyberTask(eventId, 'SOC Lead');
    setSharedState(updated);
    triggerToast("Protocollo di contenimento avviato sul dispositivo.", "success");
  };

  const handleResolveTicket = (ticketId: string) => {
    const note = noteInput[ticketId] || "Problema preso in carico e risolto via telefono/operatore.";
    const updated = updateTicketStatus(ticketId, { 
      status: 'resolved', 
      notes: [note] 
    }, selectedRole);
    setSharedState(updated);
    setNoteInput(prev => ({ ...prev, [ticketId]: '' }));
    triggerToast(`Ticket ${ticketId} risolto con successo!`, "success");
  };

  const handleAssignTicket = (ticketId: string) => {
    const owner = assigneeInput[ticketId] || "Operatore Demo";
    const updated = updateTicketStatus(ticketId, { 
      status: 'in_progress', 
      owner 
    }, selectedRole);
    setSharedState(updated);
    setAssigneeInput(prev => ({ ...prev, [ticketId]: '' }));
    triggerToast(`Ticket assegnato a: ${owner}`, "info");
  };

  // Find active patient name
  const activePatientName = sharedState.patients.find(p => p.patient_id === selectedPatientId)?.name || 'Maria Rossi';

  // Active released slots
  const releasedSlots = sharedState.slots.filter(s => s.released_by_cancellation);

  // List of patient appointments scheduled
  const getCandidateAppointmentsForSlot = (slot: Slot) => {
    return sharedState.appointments.filter(
      a => a.specialty === slot.specialty && a.status === 'scheduled'
    );
  };

  return (
    <div id="root" className="bg-slate-900 text-slate-100 font-sans min-h-screen flex flex-col selection:bg-cyan-500 selection:text-slate-950">
      
      {/* GLOBAL HEADER */}
      <HeaderDemo 
        currentView={currentView}
        setView={setCurrentView}
        onReset={handleReset}
        syncStatus={true}
        selectedPatientName={activePatientName}
        selectedRole={selectedRole}
      />

      {/* VIEWPORT CANVAS */}
      <main className="flex-grow flex flex-col min-h-[calc(100vh-5rem)]">
        
        {currentView === 'patient' ? (
          /* VISTA PAZIENTE PORTABLE */
          <div className="flex-grow py-6 px-4 bg-slate-950 flex items-center justify-center">
            <div className="w-full max-w-md bg-white text-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
              <PatientView 
                state={sharedState}
                onStateChange={handleStateChange}
                selectedPatientId={selectedPatientId}
                setSelectedPatientId={setSelectedPatientId}
                triggerToast={triggerToast}
              />
            </div>
          </div>
        ) : (
          /* CONTROL TOWER / COCKPIT (CORPORATE VIEW) */
          <div className="flex-grow grid grid-cols-1 lg:grid-cols-[220px_1fr] bg-slate-950">
            
            {/* SIDEBAR NAVIGATION */}
            <aside className="bg-slate-900 border-r border-slate-800 p-4 flex flex-col justify-between space-y-6 shrink-0">
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 mb-2">Pannelli Controllo</p>
                  <nav className="space-y-1">
                    <button
                      id="btn-nav-cockpit"
                      onClick={() => setCorporateTab('cockpit')}
                      className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        corporateTab === 'cockpit'
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Sliders className="h-4 w-4" />
                      <span>Executive Cockpit</span>
                    </button>

                    <button
                      id="btn-nav-agenda"
                      onClick={() => setCorporateTab('agenda')}
                      className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        corporateTab === 'agenda'
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Calendar className="h-4 w-4" />
                      <span>Agenda Control</span>
                      {releasedSlots.length > 0 && (
                        <span className="ml-auto bg-amber-500 text-slate-950 font-bold font-mono text-[9px] px-1.5 py-0.5 rounded-full animate-pulse">
                          {releasedSlots.length}
                        </span>
                      )}
                    </button>

                    <button
                      id="btn-nav-tickets"
                      onClick={() => setCorporateTab('tickets')}
                      className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        corporateTab === 'tickets'
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>Patient Recovery</span>
                      {sharedState.tickets.filter(t => t.status === 'open').length > 0 && (
                        <span className="ml-auto bg-cyan-400 text-slate-950 font-bold font-mono text-[9px] px-1.5 py-0.5 rounded-full">
                          {sharedState.tickets.filter(t => t.status === 'open').length}
                        </span>
                      )}
                    </button>

                    <button
                      id="btn-nav-devices"
                      onClick={() => setCorporateTab('devices')}
                      className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        corporateTab === 'devices'
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Activity className="h-4 w-4" />
                      <span>IoMT Monitoring</span>
                      {sharedState.devices.filter(d => d.status === 'offline').length > 0 && (
                        <span className="ml-auto bg-rose-500 text-white font-bold font-mono text-[9px] px-1.5 py-0.5 rounded-full animate-ping">
                          {sharedState.devices.filter(d => d.status === 'offline').length}
                        </span>
                      )}
                    </button>

                    <button
                      id="btn-nav-cyber"
                      onClick={() => setCorporateTab('cyber')}
                      className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        corporateTab === 'cyber'
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Shield className="h-4 w-4" />
                      <span>Cyber Resilience</span>
                      {sharedState.cyberEvents.filter(e => e.remediation_status === 'open').length > 0 && (
                        <span className="ml-auto bg-red-600 text-white font-bold font-mono text-[9px] px-1.5 py-0.5 rounded-full">
                          {sharedState.cyberEvents.filter(e => e.remediation_status === 'open').length}
                        </span>
                      )}
                    </button>
                  </nav>
                </div>

                {/* Operator settings */}
                <div className="pt-2 border-t border-slate-800">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 mb-2">Simula Ruolo Operatore</p>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full bg-slate-950 text-slate-300 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="Direzione Sanitaria">Direzione Sanitaria</option>
                    <option value="Biomedical Engineer">Ingegnere Biomedico</option>
                    <option value="SOC Cybersecurity Lead">SOC Security Analyst</option>
                    <option value="Customer Care Representative">Customer Care Operator</option>
                    <option value="Operations Director">Direttore Operations</option>
                  </select>
                </div>
              </div>

              {/* SIMULATION LAB IN SIDEBAR */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Terminal className="h-3 w-3 text-cyan-400 animate-pulse" /> Laboratorio di Simulazione
                  </span>
                </div>
                <p className="text-[9px] text-slate-500 leading-normal">
                  Inietta inefficienze o attacchi per innescare i workflow automatici del digital twin.
                </p>
                <div className="space-y-1.5 pt-1">
                  <button
                    onClick={handleSimulateCancellation}
                    className="w-full bg-slate-900 hover:bg-amber-950 hover:text-amber-200 border border-slate-800 hover:border-amber-900 text-slate-400 text-[10px] font-bold py-1.5 px-2 rounded-lg flex items-center justify-between transition-colors"
                  >
                    <span>⚡ Simula Disdetta</span>
                    <span className="text-[8px] bg-amber-500/20 text-amber-400 px-1 py-0.2 rounded">Rilascia Slot</span>
                  </button>
                  <button
                    onClick={handleTriggerDeviceOffline}
                    className="w-full bg-slate-900 hover:bg-red-950 hover:text-red-200 border border-slate-800 hover:border-red-900 text-slate-400 text-[10px] font-bold py-1.5 px-2 rounded-lg flex items-center justify-between transition-colors"
                  >
                    <span>🚨 RM Offline</span>
                    <span className="text-[8px] bg-red-600/20 text-red-400 px-1 py-0.2 rounded">Guasto IoMT</span>
                  </button>
                  <button
                    onClick={handleTriggerCyberAttack}
                    className="w-full bg-slate-900 hover:bg-rose-950 hover:text-rose-200 border border-slate-800 hover:border-rose-900 text-slate-400 text-[10px] font-bold py-1.5 px-2 rounded-lg flex items-center justify-between transition-colors"
                  >
                    <span>🔥 Attacco Cyber</span>
                    <span className="text-[8px] bg-rose-600/20 text-rose-400 px-1 py-0.2 rounded">Infiltrazione</span>
                  </button>
                </div>
              </div>
            </aside>

            {/* DASHBOARD BODY / CHOSEN TAB */}
            <div className="flex-grow p-6 overflow-y-auto space-y-6 max-h-[calc(100vh-5rem)]">
              
              {/* TAB 1: EXECUTIVE COCKPIT */}
              {corporateTab === 'cockpit' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex justify-between items-center border-b border-slate-800/80 pb-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                        <Sliders className="h-5 w-5 text-indigo-400" /> Executive Health Platform Cockpit
                      </h2>
                      <p className="text-xs text-slate-400">Analisi predittiva inefficienze, recovery slot e allarmi infrastruttura in tempo reale.</p>
                    </div>
                    <span className="text-[10px] bg-indigo-950/60 text-indigo-300 border border-indigo-800/60 px-2.5 py-1 rounded-full font-mono">
                      Stato: Operativo
                    </span>
                  </div>
                  <ExecutiveCockpit state={sharedState} setViewTab={setCorporateTab} />
                </div>
              )}

              {/* TAB 2: AGENDA CONTROL & SLOT RECOVERY */}
              {corporateTab === 'agenda' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex justify-between items-center border-b border-slate-800/80 pb-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-amber-400" /> Agenda Control & Slot Recovery System
                      </h2>
                      <p className="text-xs text-slate-400">Recupera i buchi di agenda causati da disdette proponendo anticipi automatici ai pazienti compatibili.</p>
                    </div>
                  </div>

                  {/* ACTIVE RECOVERY ALERTS */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-amber-500" /> Coda Slot da Recuperare ({releasedSlots.length})
                      </h3>
                      <span className="text-[10px] text-slate-500 font-mono">Livello Priorità Algoritmo</span>
                    </div>

                    {releasedSlots.length === 0 ? (
                      <div className="py-8 text-center text-slate-500 italic text-xs bg-slate-950 rounded-lg border border-slate-800/55">
                        Nessuno slot libero in attesa di recupero. Clicca su "Simula Disdetta" nel lab in basso a sinistra per liberare uno slot!
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {releasedSlots.map(slot => {
                          const candidates = getCandidateAppointmentsForSlot(slot);
                          
                          return (
                            <div key={slot.slot_id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                  <span className="bg-indigo-900/60 text-indigo-300 font-bold text-[9px] uppercase px-1.5 py-0.5 rounded">
                                    {slot.specialty}
                                  </span>
                                  <span className="text-xs font-semibold text-slate-200">
                                    {slot.facility_name} • Sala {slot.room_id}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400 font-mono">
                                  Slot Liberato: <strong>{slot.date}</strong> ore <strong>{slot.start_time}</strong>
                                </p>
                              </div>

                              <div className="flex-1 max-w-md bg-slate-900 p-2.5 rounded-lg border border-slate-800/80">
                                <p className="text-[10px] uppercase font-bold text-slate-500 mb-1.5">Seleziona Paziente Candidato (Alta Priorità):</p>
                                
                                {candidates.length === 0 ? (
                                  <p className="text-[10px] text-slate-500 italic">Nessun paziente in attesa compatibile.</p>
                                ) : (
                                  <div className="space-y-1.5">
                                    {candidates.slice(0, 2).map(appt => {
                                      const patient = sharedState.patients.find(p => p.patient_id === appt.patient_id);
                                      const hasProposalPending = sharedState.slotProposals.some(
                                        p => p.appointment_id === appt.appointment_id && p.status === 'proposed'
                                      );

                                      return (
                                        <div key={appt.appointment_id} className="flex justify-between items-center text-xs bg-slate-950 p-2 rounded border border-slate-850">
                                          <div>
                                            <p className="font-bold text-slate-300">{patient?.name}</p>
                                            <p className="text-[9px] text-slate-500">
                                              Visita originale: {appt.scheduled_date} ({appt.scheduled_time}) • Priorità: {appt.clinical_priority}
                                            </p>
                                          </div>

                                          {hasProposalPending ? (
                                            <span className="bg-amber-900/60 text-amber-300 text-[9px] font-bold px-2 py-0.5 rounded border border-amber-800">
                                              Inviata (Attesa Risposta)
                                            </span>
                                          ) : (
                                            <button
                                              id={`btn-propose-${appt.appointment_id}-${slot.slot_id}`}
                                              onClick={() => {
                                                const updated = proposeSlotAdvance(appt.appointment_id, appt.patient_id, slot.slot_id, selectedRole);
                                                setSharedState(updated);
                                                triggerToast(`Proposta inviata via WhatsApp/Push a ${patient?.name}!`, "success");
                                              }}
                                              className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm transition-colors"
                                            >
                                              PROPOCO ANTICIPO
                                            </button>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* ALL APPOINTMENTS GRID */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    {/* Appointments Table */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                      <div className="p-3.5 border-b border-slate-800 bg-slate-900 flex justify-between items-center">
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Tutti gli Appuntamenti Recenti ({sharedState.appointments.length})</h4>
                        <span className="text-[9px] font-mono text-slate-500">Live feed</span>
                      </div>
                      <div className="max-h-96 overflow-y-auto scroll-hide">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800 text-[10px] uppercase">
                            <tr>
                              <th className="p-2.5">Paziente</th>
                              <th className="p-2.5">Specialità / Prestazione</th>
                              <th className="p-2.5">Data / Ora</th>
                              <th className="p-2.5">Stato</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                            {sharedState.appointments.slice(0, 15).map(appt => {
                              const pat = sharedState.patients.find(p => p.patient_id === appt.patient_id);
                              
                              let statusBadge = "bg-slate-800 text-slate-400";
                              if (appt.status === 'completed') statusBadge = "bg-emerald-950 text-emerald-400 border border-emerald-900";
                              if (appt.status === 'no-show') statusBadge = "bg-rose-950 text-rose-400 border border-rose-900";
                              if (appt.status === 'cancelled') statusBadge = "bg-red-950/60 text-red-400 border border-red-900/40";
                              if (appt.status === 'scheduled') statusBadge = "bg-blue-950 text-blue-400 border border-blue-900";
                              
                              return (
                                <tr key={appt.appointment_id} className="hover:bg-slate-850/40 transition-colors">
                                  <td className="p-2.5 font-sans font-semibold text-slate-100">{pat?.name || appt.patient_id}</td>
                                  <td className="p-2.5 text-slate-300 font-sans text-[11px]">{appt.service_type}</td>
                                  <td className="p-2.5 text-slate-400 text-[11px]">{appt.scheduled_date} {appt.scheduled_time}</td>
                                  <td className="p-2.5">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${statusBadge}`}>
                                      {appt.status}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Available Slots Table */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                      <div className="p-3.5 border-b border-slate-800 bg-slate-900 flex justify-between items-center">
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Stato degli Slot Agenda ({sharedState.slots.length})</h4>
                        <span className="text-[9px] font-mono text-slate-500">Diagnostica & Visite</span>
                      </div>
                      <div className="max-h-96 overflow-y-auto scroll-hide font-mono text-slate-300 text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800 text-[10px] uppercase">
                            <tr>
                              <th className="p-2.5">Sede</th>
                              <th className="p-2.5">Specialità</th>
                              <th className="p-2.5">Data / Ora</th>
                              <th className="p-2.5">Stato Slot</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {sharedState.slots.map(slot => {
                              let slotBadge = "bg-slate-800 text-slate-400";
                              if (slot.status === 'booked') slotBadge = "bg-indigo-950 text-indigo-400 border border-indigo-900";
                              if (slot.status === 'available') slotBadge = "bg-emerald-950 text-emerald-400 border border-emerald-900";
                              if (slot.status === 'released') slotBadge = "bg-amber-950 text-amber-400 border border-amber-900";
                              if (slot.recovered) slotBadge = "bg-cyan-950 text-cyan-400 border border-cyan-900";

                              return (
                                <tr key={slot.slot_id} className="hover:bg-slate-850/40 transition-colors">
                                  <td className="p-2.5 font-sans font-semibold text-slate-100 truncate max-w-[130px]" title={slot.facility_name}>{slot.facility_name.replace('SalusCare ', '')}</td>
                                  <td className="p-2.5 font-sans text-slate-300 text-[11px]">{slot.specialty}</td>
                                  <td className="p-2.5 text-slate-400 text-[11px]">{slot.date} {slot.start_time}</td>
                                  <td className="p-2.5">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${slotBadge}`}>
                                      {slot.recovered ? 'RECUPERATO' : slot.status}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 3: PATIENT RECOVERY (TICKETS & COMPLAINTS) */}
              {corporateTab === 'tickets' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex justify-between items-center border-b border-slate-800/80 pb-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-indigo-400" /> Patient Recovery (Customer Care Tickets)
                      </h2>
                      <p className="text-xs text-slate-400">Risoluzione tempestiva dei reclami amministrativi o clinici per massimizzare il NPS.</p>
                    </div>
                  </div>

                  {/* ACTIVE TICKETS VIEW */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Coda Ticket di Assistenza</h3>
                    
                    <div className="space-y-4">
                      {sharedState.tickets.map(ticket => {
                        const patient = sharedState.patients.find(p => p.patient_id === ticket.patient_id);
                        
                        let sevColor = "bg-slate-850 text-slate-300";
                        if (ticket.severity === 'Critical') sevColor = "bg-red-950 text-red-400 border border-red-800";
                        if (ticket.severity === 'High') sevColor = "bg-rose-950 text-rose-400 border border-rose-900";
                        if (ticket.severity === 'Medium') sevColor = "bg-amber-950 text-amber-400 border border-amber-900";

                        let statusColor = "bg-slate-900 text-slate-400";
                        if (ticket.status === 'open') statusColor = "bg-rose-950/40 text-rose-400 border border-rose-900/40";
                        if (ticket.status === 'in_progress') statusColor = "bg-blue-950 text-blue-400 border border-blue-900";
                        if (ticket.status === 'resolved') statusColor = "bg-emerald-950 text-emerald-400 border border-emerald-900";

                        return (
                          <div key={ticket.ticket_id} className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 flex flex-col md:flex-row justify-between gap-4">
                            <div className="space-y-2 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-xs font-bold text-slate-300">{ticket.ticket_id}</span>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${sevColor}`}>
                                  {ticket.severity}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${statusColor}`}>
                                  {ticket.status}
                                </span>
                                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                                  {ticket.category}
                                </span>
                              </div>

                              <div>
                                <p className="text-xs text-slate-200 font-semibold">{ticket.root_cause}</p>
                                <p className="text-[11px] text-slate-400 mt-1">
                                  Paziente: <strong>{patient?.name || ticket.patient_id}</strong> ({patient?.phone}) • Churn Risk: <strong className="text-rose-400">{patient?.churn_risk}</strong>
                                </p>
                              </div>

                              {ticket.notes && ticket.notes.length > 0 && (
                                <div className="bg-slate-900 p-2 rounded border border-slate-850 text-[11px] text-slate-500 font-mono">
                                  <strong>Note Operative:</strong>
                                  <ul className="list-disc pl-4 space-y-0.5 mt-1">
                                    {ticket.notes.map((n, i) => <li key={i}>{n}</li>)}
                                  </ul>
                                </div>
                              )}
                            </div>

                            {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                              <div className="w-full md:w-64 flex flex-col justify-between p-3 bg-slate-900 rounded-lg border border-slate-800/60 gap-3">
                                {/* Assignment */}
                                {ticket.status === 'open' ? (
                                  <div className="flex gap-2">
                                    <input 
                                      type="text" 
                                      placeholder="Assegna a..." 
                                      value={assigneeInput[ticket.ticket_id] || ''}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setAssigneeInput(prev => ({ ...prev, [ticket.ticket_id]: val }));
                                      }}
                                      className="flex-1 bg-slate-950 text-xs border border-slate-800 rounded px-2 py-1 text-slate-300 focus:outline-none"
                                    />
                                    <button 
                                      id={`btn-assign-${ticket.ticket_id}`}
                                      onClick={() => handleAssignTicket(ticket.ticket_id)}
                                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold px-2.5 py-1 rounded"
                                    >
                                      ASSEGNA
                                    </button>
                                  </div>
                                ) : (
                                  <p className="text-[10px] text-slate-400">
                                    Gestito da: <strong className="text-indigo-400">{ticket.owner}</strong>
                                  </p>
                                )}

                                {/* Resolving notes */}
                                <div className="space-y-1.5">
                                  <textarea
                                    placeholder="Scrivi nota risoluzione..."
                                    value={noteInput[ticket.ticket_id] || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setNoteInput(prev => ({ ...prev, [ticket.ticket_id]: val }));
                                    }}
                                    className="w-full h-12 bg-slate-950 text-xs border border-slate-800 rounded p-1.5 text-slate-300 focus:outline-none resize-none"
                                  />
                                  <button
                                    id={`btn-resolve-${ticket.ticket_id}`}
                                    onClick={() => handleResolveTicket(ticket.ticket_id)}
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold py-1 rounded shadow"
                                  >
                                    RISOLVI RECLAMO
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* CUSTOMER SATISFACTION SURVEY FEEDBACKS */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Feedback & Post-Visit Surveys Recenti</h3>
                    
                    {sharedState.feedback.length === 0 ? (
                      <p className="text-slate-500 text-xs italic py-4 text-center">Nessun feedback inviato finora dai pazienti.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {sharedState.feedback.map(fb => {
                          const patient = sharedState.patients.find(p => p.patient_id === fb.patient_id);
                          
                          return (
                            <div key={fb.feedback_id} className="bg-slate-950 border border-slate-850 p-3.5 rounded-xl flex flex-col justify-between">
                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs font-bold text-slate-200">{patient?.name || fb.patient_id}</span>
                                  <div className="flex items-center space-x-1">
                                    {[1, 2, 3, 4, 5].map(star => (
                                      <span key={star} className={`text-sm ${star <= fb.score ? 'text-amber-400' : 'text-slate-700'}`}>★</span>
                                    ))}
                                  </div>
                                </div>
                                <p className="text-xs italic text-slate-400">"{fb.comment || 'Nessun commento testuale'}"</p>
                              </div>
                              <div className="mt-2 pt-2 border-t border-slate-900 flex justify-between items-center text-[10px] text-slate-500 font-mono">
                                <span>Rif: {fb.appointment_id}</span>
                                {fb.callback_requested ? (
                                  <span className="text-rose-400 font-bold">Richiesto Contatto Telefonico</span>
                                ) : (
                                  <span className="text-slate-600">Nessun contatto richiesto</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* TAB 4: IoMT MONITORING */}
              {corporateTab === 'devices' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex justify-between items-center border-b border-slate-800/80 pb-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                        <Activity className="h-5 w-5 text-teal-400" /> IoMT Diagnostics & Medical Devices Monitoring
                      </h2>
                      <p className="text-xs text-slate-400">Diagnostica preventiva, telemetria Helium, firmware versioning e monitoraggio real-time.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                    {/* IoMT telemetry devices list */}
                    <div className="xl:col-span-2 space-y-4">
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Flotta Dispositivi Ospedalieri censiti in IoMT ({sharedState.devices.length})</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {sharedState.devices.map(dev => {
                            let statusBadge = "bg-slate-800 text-slate-400";
                            if (dev.status === 'online') statusBadge = "bg-emerald-950 text-emerald-400 border border-emerald-900";
                            if (dev.status === 'offline') statusBadge = "bg-red-950 text-red-400 border border-red-900 animate-pulse";
                            if (dev.status === 'anomaly') statusBadge = "bg-amber-950 text-amber-400 border border-amber-900";

                            return (
                              <div key={dev.device_id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
                                <div>
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <span className="bg-slate-800 text-slate-300 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded">
                                        {dev.equipment_id}
                                      </span>
                                      <h4 className="text-sm font-bold text-slate-100 mt-1">{dev.device_type} ({dev.department})</h4>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${statusBadge}`}>
                                      {dev.status}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                    Sede: {dev.facility_name} • Stanza: {dev.room_id}
                                  </p>
                                </div>

                                <div className="space-y-1 pt-1.5 border-t border-slate-900 text-xs font-mono text-slate-400">
                                  <div className="flex justify-between">
                                    <span>Uptime:</span>
                                    <span className="text-slate-200">{dev.uptime_percentage}%</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Firmware:</span>
                                    <span className={dev.patch_status === 'outdated' ? 'text-red-400' : 'text-slate-300'}>{dev.firmware_version} ({dev.patch_status})</span>
                                  </div>
                                </div>

                                {dev.status === 'offline' && (
                                  <button
                                    id={`btn-restore-device-${dev.device_id}`}
                                    onClick={() => {
                                      const updated = createDeviceAlert(dev.device_id, 'online', 'Biomedical Engineer');
                                      setSharedState(updated);
                                      triggerToast("Dispositivo ripristinato online ed operativo!", "success");
                                    }}
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold py-1.5 rounded transition-colors"
                                  >
                                    RIPRISTINA MACCHINA ONLINE
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* IoMT Events List */}
                    <div className="xl:col-span-1">
                      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-full max-h-[500px]">
                        <div className="p-3.5 border-b border-slate-800 bg-slate-900/50">
                          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Telemetria Recente IoMT</h3>
                        </div>
                        <div className="p-3 overflow-y-auto space-y-2.5 font-mono text-[10px] scroll-hide">
                          {sharedState.iomtEvents.map(evt => {
                            let dotColor = "bg-emerald-500";
                            if (evt.status === 'warning') dotColor = "bg-amber-500 animate-pulse";
                            if (evt.status === 'critical') dotColor = "bg-rose-500 animate-ping";

                            const devType = sharedState.devices.find(d => d.device_id === evt.device_id)?.device_type || 'Device';

                            return (
                              <div key={evt.event_id} className="bg-slate-950 p-2 rounded border border-slate-850 flex items-start space-x-2">
                                <span className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${dotColor}`}></span>
                                <div className="flex-grow">
                                  <p className="text-slate-300 font-semibold uppercase">{devType} - {evt.metric_name}</p>
                                  <p className="text-slate-400">Valore: <strong className="text-cyan-400">{evt.metric_value}</strong></p>
                                  <span className="text-slate-600 text-[9px]">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 5: CYBER RESILIENCE */}
              {corporateTab === 'cyber' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex justify-between items-center border-b border-slate-800/80 pb-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                        <Shield className="h-5 w-5 text-indigo-400" /> Cyber Resilience Dashboard (SOC Security Center)
                      </h2>
                      <p className="text-xs text-slate-400">Threat intelligence, rilevamento anomalie di accesso MFA, tattiche MITRE e remediation vulnerabilità.</p>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Anomalie e Incidenti Rilevati</h3>
                      <span className="text-[10px] text-slate-500 font-mono">Mitre Attack TTP mapping</span>
                    </div>

                    <div className="space-y-4">
                      {sharedState.cyberEvents.map(evt => {
                        const dev = sharedState.devices.find(d => d.device_id === evt.asset_id);
                        
                        let sevBadge = "bg-slate-800 text-slate-400";
                        if (evt.severity === 'Critical') sevBadge = "bg-red-950 text-red-400 border border-red-800";
                        if (evt.severity === 'High') sevBadge = "bg-rose-950 text-rose-400 border border-rose-900";
                        if (evt.severity === 'Medium') sevBadge = "bg-amber-950 text-amber-400 border border-amber-900";

                        let remBadge = "bg-slate-900 text-slate-400";
                        if (evt.remediation_status === 'open') remBadge = "bg-rose-950/40 text-rose-400 border border-rose-900/40 animate-pulse";
                        if (evt.remediation_status === 'in_progress') remBadge = "bg-blue-950 text-blue-400 border border-blue-900";
                        if (evt.remediation_status === 'resolved') remBadge = "bg-emerald-950 text-emerald-400 border border-emerald-900";

                        return (
                          <div key={evt.cyber_event_id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row justify-between gap-4 font-mono text-xs">
                            <div className="space-y-2 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-slate-300 font-bold text-[11px]">{evt.cyber_event_id}</span>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${sevBadge}`}>
                                  {evt.severity}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${remBadge}`}>
                                  Remediation: {evt.remediation_status}
                                </span>
                              </div>

                              <div className="space-y-1 font-sans text-slate-300">
                                <p className="text-xs">
                                  Tattica MITRE: <strong className="text-indigo-400 font-mono">{evt.mitre_tactic}</strong>
                                </p>
                                <p className="text-[11px] text-slate-400">
                                  Asset vulnerabile: <strong>{dev ? `${dev.device_type} (${dev.equipment_id})` : evt.asset_id}</strong> ({dev?.facility_name})
                                </p>
                              </div>

                              <div className="pt-2 grid grid-cols-2 sm:grid-cols-3 gap-3 text-[10px] text-slate-500 border-t border-slate-900">
                                <div>
                                  <span>MFA Status:</span>
                                  <strong className={evt.mfa_status === 'disabled' ? 'text-red-400 ml-1' : 'text-slate-300 ml-1'}>
                                    {evt.mfa_status.toUpperCase()}
                                  </strong>
                                </div>
                                <div>
                                  <span>Privileged Account:</span>
                                  <strong className="text-slate-300 ml-1">{evt.privileged_account ? 'SÌ' : 'NO'}</strong>
                                </div>
                                <div>
                                  <span>SOC Assigned:</span>
                                  <strong className="text-slate-300 ml-1">{evt.owner}</strong>
                                </div>
                              </div>
                            </div>

                            {evt.remediation_status === 'open' && (
                              <div className="flex items-center">
                                <button
                                  id={`btn-remediate-${evt.cyber_event_id}`}
                                  onClick={() => handleRemediateCyber(evt.cyber_event_id)}
                                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded shadow transition-all uppercase text-[10px]"
                                >
                                  Avvia Remediation SOC
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}

            </div>

            {/* REAL-TIME AUDIT LOG & EVENTS PANEL (RIGHT SIDEBAR) */}
            <aside className="hidden xl:flex flex-col bg-slate-900 border-l border-slate-800 p-4 space-y-4 shrink-0 w-[240px] max-h-[calc(100vh-5rem)] overflow-y-auto scroll-hide">
              <div className="border-b border-slate-800 pb-2">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1">
                  <Terminal className="h-3.5 w-3.5 text-cyan-400" /> Registro Audit Ospedaliero
                </h3>
                <p className="text-[9px] text-slate-500">Log conformità HIPAA / GDPR.</p>
              </div>

              <div className="space-y-3 font-mono text-[9px] text-slate-400">
                {sharedState.auditLog.slice(0, 10).map(audit => (
                  <div key={audit.log_id} className="border-l border-slate-700 pl-2.5 py-1 space-y-0.5 bg-slate-950/30 p-1.5 rounded">
                    <div className="flex justify-between font-bold text-[10px]">
                      <span className="text-cyan-400">{audit.action}</span>
                      <span className="text-slate-600">{new Date(audit.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </div>
                    <p className="text-slate-300">{audit.reason}</p>
                    <p className="text-[8px] text-slate-500">
                      Operatore: <strong>{audit.user_role}</strong>
                    </p>
                  </div>
                ))}
              </div>
            </aside>

          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="h-10 bg-slate-950 border-t border-slate-800 flex items-center justify-between px-6 shrink-0 text-[10px] text-slate-500 font-mono select-none">
        <div>
          <span>SALUSCARE PLATFORM v1.4.2 Enterprise • Real-Time Digital Twin</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
          <span>Sincronia LocalStorage Attiva</span>
        </div>
      </footer>

      {/* SYSTEM DYNAMIC TOAST */}
      {toast && (
        <div id="toast" className="fixed bottom-6 right-6 z-50 transform transition-all duration-300 animate-slide-in">
          <div className="bg-slate-900 border border-slate-700 text-white px-4.5 py-3 rounded-xl shadow-2xl flex items-center gap-3">
            <div className={`p-1.5 rounded-lg ${
              toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
              toast.type === 'warning' ? 'bg-amber-500/20 text-amber-400 animate-pulse' : 'bg-cyan-500/20 text-cyan-400'
            }`}>
              {toast.type === 'success' ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-100">{toast.message}</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
