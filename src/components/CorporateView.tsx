/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { SharedState, Appointment, Ticket, MedicalDevice, Patient, Slot, CyberEvent, AuditLog, EventLog } from '../types';
import { ExecutiveCockpit } from './ExecutiveCockpit';
import { 
  cancelAppointment, proposeSlotAdvance, updateTicketStatus, createDeviceAlert, createCyberTask, resetSharedState, saveSharedState, readSharedState, updateAppointment 
} from '../stateManager';
import { 
  LayoutDashboard, Users, Calendar, AlertTriangle, Clock, CreditCard, 
  Settings, ShieldAlert, Cpu, DollarSign, Database, Terminal, 
  HelpCircle, UserCheck, Play, ArrowRight, Eye, Check, X, Search, 
  Edit3, Shield, BadgeAlert, Plus, PhoneCall, RefreshCw, BarChart
} from 'lucide-react';

interface CorporateViewProps {
  state: SharedState;
  onStateChange: (newState: SharedState) => void;
  triggerToast: (msg: string, type: 'success' | 'warning' | 'info') => void;
  selectedRole: string;
  setSelectedRole: (role: string) => void;
  selectedPatientId: string;
  setSelectedPatientId: (id: string) => void;
}

export const CorporateView: React.FC<CorporateViewProps> = ({
  state,
  onStateChange,
  triggerToast,
  selectedRole,
  setSelectedRole,
  selectedPatientId,
  setSelectedPatientId
}) => {
  const [activeTab, setActiveTab] = useState<string>('executive');

  // Search filter inside Journey Control Tower
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedJourneyAppt, setSelectedJourneyAppt] = useState<Appointment | null>(null);

  // Agenda Filter
  const [agendaFilterSpec, setAgendaFilterSpec] = useState<string>('');
  const [agendaFilterStatus, setAgendaFilterStatus] = useState<string>('');
  const [selectedAgendaAppt, setSelectedAgendaAppt] = useState<Appointment | null>(null);
  
  // Script Call Modal
  const [callModalAppt, setCallModalAppt] = useState<Appointment | null>(null);
  const [callOutcome, setCallOutcome] = useState<string>('conferma');
  const [callNotes, setCallNotes] = useState<string>('');

  // Slot Recovery Engine Drawer
  const [recoveryDrawerAppt, setRecoveryDrawerAppt] = useState<Appointment | null>(null);
  const [recoverySucceed, setRecoverySucceed] = useState<boolean>(false);

  // Reclami / Support Ticket Action Drawer
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketOwner, setTicketOwner] = useState<string>('');
  const [ticketSeverity, setTicketSeverity] = useState<Ticket['severity']>('Medium');
  const [ticketStatus, setTicketStatus] = useState<Ticket['status']>('open');
  const [ticketNotesText, setTicketNotesText] = useState<string>('');

  // Operations Timestamps Edit
  const [selectedOpsAppt, setSelectedOpsAppt] = useState<Appointment | null>(null);
  
  // Economic Scenario Simulation States
  const [simEfficiencyImprovement, setSimEfficiencyImprovement] = useState<number>(20); // 10%, 20%, 30%

  // Medical Device Drawer
  const [selectedDevice, setSelectedDevice] = useState<MedicalDevice | null>(null);

  // Cyber Event Drawer
  const [selectedCyberEvent, setSelectedCyberEvent] = useState<CyberEvent | null>(null);

  // Role Options
  const roleOptions = [
    "Direzione sanitaria",
    "Operations manager",
    "Segreteria",
    "Customer care",
    "Finance",
    "Biomedicale",
    "Cybersecurity",
    "DPO/Privacy"
  ];

  // Auto set initial states on drawer selection
  useEffect(() => {
    if (selectedTicket) {
      setTicketOwner(selectedTicket.owner);
      setTicketSeverity(selectedTicket.severity);
      setTicketStatus(selectedTicket.status);
    }
  }, [selectedTicket]);

  // Handle call outcome logger
  const handleCallOutcomeSubmit = () => {
    if (!callModalAppt) return;
    const uState = readSharedState();
    const appIndex = uState.appointments.findIndex(a => a.appointment_id === callModalAppt.appointment_id);
    
    if (appIndex !== -1) {
      const appt = uState.appointments[appIndex];
      const prev = JSON.stringify(appt);

      if (callOutcome === 'conferma') {
        appt.confirmation_status = 'confirmed';
        appt.status = 'confirmed';
        appt.confirmation_channel = 'Operator';
        appt.confirmation_timestamp = new Date().toISOString();
        triggerToast("Presenza confermata telefonicamente!", "success");
      } else if (callOutcome === 'cancella') {
        // Cancel logic
        setCallModalAppt(null);
        const nextState = cancelAppointment(appt.appointment_id, `Richiesta telefonica di annullamento. Note: ${callNotes}`, selectedRole);
        onStateChange(nextState);
        return;
      } else if (callOutcome === 'riprogramma') {
        appt.reschedule_requested = true;
        appt.status = 'reschedule_requested';
        triggerToast("Richiesta di riprogrammazione registrata.", "info");
      }

      uState.eventLog = [{
        event_id: `evt_call_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'PATIENT_CALLED',
        message: `Telefonata operatore con esito: ${callOutcome.toUpperCase()} per appuntamento ${appt.appointment_id}`,
        payload: { appointment_id: appt.appointment_id, outcome: callOutcome, notes: callNotes }
      }, ...uState.eventLog];

      uState.auditLog = [{
        log_id: `aud_call_${Date.now()}`,
        timestamp: new Date().toISOString(),
        user_role: selectedRole,
        action: 'PATIENT_CALL_REMINDER',
        object_type: 'APPOINTMENT',
        object_id: appt.appointment_id,
        previous_state: prev,
        new_state: JSON.stringify(appt),
        reason: `Esito chiamata registrato manualmente da segreteria. Note: ${callNotes}`
      }, ...uState.auditLog];

      // Complete any pending reminder task
      const tskIdx = uState.operatorTasks.findIndex(t => t.type === 'patient_call' && t.linked_id === appt.appointment_id);
      if (tskIdx !== -1) {
        uState.operatorTasks[tskIdx].status = 'completed';
      }

      onStateChange(uState);
      saveSharedState(uState);
      setCallModalAppt(null);
      setCallNotes('');
    }
  };

  // RANKS PATIENTS LIST FOR SLOT RECOVERY
  const getRankedCandidates = (releasedAppt: Appointment) => {
    // Candidates are other patients with future appointments of the same specialty or who are in high clinical priority list
    const candidates: { patient: Patient; appt: Appointment; score: number; scoreBreakdown: string }[] = [];

    state.patients.forEach(pat => {
      // Find candidate's future appointment of the same specialty that is scheduled LATER than this released appointment
      const futureAppts = state.appointments.filter(a => 
        a.patient_id === pat.patient_id && 
        a.specialty === releasedAppt.specialty && 
        a.status === 'scheduled' &&
        a.scheduled_date >= releasedAppt.scheduled_date &&
        a.appointment_id !== releasedAppt.appointment_id
      );

      futureAppts.forEach(futAppt => {
        // Calculate wait-days, clinical priority, likelihood score
        let clinicalScore = futAppt.clinical_priority === 'Critical' ? 50 : 
                            futAppt.clinical_priority === 'High' ? 40 : 
                            futAppt.clinical_priority === 'Medium' ? 20 : 10;
        
        let waitDaysScore = Math.min(futAppt.waiting_list_days * 1.0, 25); // max 25 points
        
        // Digital engagement high = higher acceptance likelihood (10 pts)
        let acceptanceScore = pat.digital_engagement_level === 'High' ? 10 : 
                              pat.digital_engagement_level === 'Medium' ? 7 : 4;
        
        // Operational compatibility (same venue / clinic) (15 pts)
        let compatibilityScore = futAppt.facility_id === releasedAppt.facility_id ? 15 : 5;

        const totalScore = clinicalScore + waitDaysScore + acceptanceScore + compatibilityScore;
        const breakdown = `Priorità: ${clinicalScore} | Attesa: ${waitDaysScore.toFixed(0)} | Accettazione: ${acceptanceScore} | Compatibilità: ${compatibilityScore}`;

        candidates.push({
          patient: pat,
          appt: futAppt,
          score: totalScore,
          scoreBreakdown: breakdown
        });
      });
    });

    // Sort by score descending
    return candidates.sort((a, b) => b.score - a.score);
  };

  // DISPATCH SLOT PROPOSAL
  const handleProposeRecovery = (candidatePatientId: string, originalApptId: string) => {
    if (!recoveryDrawerAppt) return;
    
    // Find target slot that got released
    const releasedSlot = state.slots.find(s => 
      s.date === recoveryDrawerAppt.scheduled_date && 
      s.start_time === recoveryDrawerAppt.scheduled_time && 
      s.doctor_id === recoveryDrawerAppt.doctor_id
    );

    if (releasedSlot) {
      const newState = proposeSlotAdvance(originalApptId, candidatePatientId, releasedSlot.slot_id, selectedRole);
      onStateChange(newState);
      triggerToast(`Proposta d'anticipo inviata al paziente ${candidatePatientId}!`, "success");
      setRecoverySucceed(true);
      setTimeout(() => {
        setRecoveryDrawerAppt(null);
        setRecoverySucceed(false);
      }, 1500);
    } else {
      // Create a mock slot if not pre-existing, but we can just propose on a generic slot
      const genericSlot = state.slots.find(s => s.specialty === recoveryDrawerAppt.specialty && s.status === 'released') || state.slots[0];
      const newState = proposeSlotAdvance(originalApptId, candidatePatientId, genericSlot.slot_id, selectedRole);
      onStateChange(newState);
      triggerToast(`Proposta d'anticipo inviata su slot ${genericSlot.room_id}!`, "success");
      setRecoverySucceed(true);
      setTimeout(() => {
        setRecoveryDrawerAppt(null);
        setRecoverySucceed(false);
      }, 1500);
    }
  };

  // UPDATE TICKET (COMPLAINT / SLA RECOVERY)
  const handleTicketStatusSubmit = () => {
    if (!selectedTicket) return;
    const newState = updateTicketStatus(selectedTicket.ticket_id, {
      owner: ticketOwner,
      severity: ticketSeverity,
      status: ticketStatus,
      notes: [ticketNotesText || "Nessun commento aggiuntivo."]
    }, selectedRole);
    
    onStateChange(newState);
    setSelectedTicket(null);
    setTicketNotesText('');
    triggerToast(`Ticket ${selectedTicket.ticket_id} aggiornato!`, "success");
  };

  // MODIFY OPERATIONS TIMESTAMPS
  const handleOpsTimestampUpdate = (field: string, val: string) => {
    if (!selectedOpsAppt) return;
    const changes: Partial<Appointment> = { [field]: val };
    
    // If we have checkin and ready times, calculate actual total delays
    let delay = 0;
    if (field === 'start_time' && selectedOpsAppt.scheduled_time) {
      // Calculate delay in minutes
      const [sh, sm] = selectedOpsAppt.scheduled_time.split(':').map(Number);
      const [ah, am] = val.split(':').map(Number);
      delay = (ah * 60 + am) - (sh * 60 + sm);
      changes.delay_minutes = Math.max(delay, 0);
      if (delay > 15) {
        changes.delay_reason_code = 'medico'; // default
      }
    }

    const newState = updateAppointment(selectedOpsAppt.appointment_id, changes, selectedRole, `Aggiornamento flussi operativi real-time: ${field}`);
    onStateChange(newState);
    // Update selected appointment in view
    setSelectedOpsAppt(prev => prev ? { ...prev, ...changes } : null);
    triggerToast("Timestamp registrato!", "success");
  };

  // SIMULATOR HANDLERS
  const triggerSimulation = (simType: string) => {
    const uState = readSharedState();
    
    if (simType === 'cancel_maria') {
      // Find a scheduled future appointment for Maria Rossi and cancel it
      const mariaAppt = uState.appointments.find(a => a.patient_id === 'pat_maria' && (a.status === 'scheduled' || a.status === 'confirmed'));
      if (mariaAppt) {
        const next = cancelAppointment(mariaAppt.appointment_id, "Simulazione: Disdetta imprevista via smartphone", "Maria Rossi");
        onStateChange(next);
        triggerToast("SIMULAZIONE: Maria Rossi ha annullato la sua visita!", "warning");
        setActiveTab('agenda');
      } else {
        triggerToast("Nessuna visita attiva trovata per Maria Rossi da annullare.", "info");
      }
    }
    
    else if (simType === 'complaint_paolo') {
      // Paolo Neri submits a severe complaint about radiologia delays
      const pastVisit = uState.appointments.find(a => a.patient_id === 'pat_paolo' && a.status === 'completed');
      const ticketId = `tick_${uState.tickets.length + 1}`;
      const paoloTicket: Ticket = {
        ticket_id: ticketId,
        patient_id: 'pat_paolo',
        appointment_id: pastVisit?.appointment_id,
        episode_id: pastVisit?.episode_id,
        category: 'Attesa',
        root_cause: "Simulazione: Attesa oltre 75 minuti in sala diagnostica RM senza informazioni.",
        severity: 'High',
        owner: 'Non assegnato',
        sla_due_date: "2026-07-13",
        status: 'open',
        escalation: true,
        created_at: "2026-07-10",
        updated_at: "2026-07-10",
        notes: ["Segnalazione critica post-visita generata via Simulazione."]
      };
      
      uState.tickets = [paoloTicket, ...uState.tickets];
      uState.eventLog = [{
        event_id: `evt_sim_tc_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'COMPLAINT_CREATED',
        message: `Paziente Paolo Neri ha aperto un reclamo grave per attese.`,
        payload: { ticket_id: ticketId }
      }, ...uState.eventLog];

      uState.operatorTasks = [{
        task_id: `tsk_sim_tc_${Date.now()}`,
        type: 'ticket_followup',
        title: `Gestione Dissoddisfazione: ${ticketId}`,
        description: `Contattare Paolo Neri per ritardo prestazione RM di 75 minuti.`,
        status: 'pending',
        assigned_to: 'Non assegnato',
        priority: 'High',
        linked_id: ticketId,
        created_at: new Date().toISOString()
      }, ...uState.operatorTasks];

      onStateChange(uState);
      saveSharedState(uState);
      triggerToast("SIMULAZIONE: Reclamo di Paolo Neri registrato in Control Tower!", "warning");
      setActiveTab('tickets');
    }

    else if (simType === 'rm_offline') {
      // Device RM Milano goes offline
      const next = createDeviceAlert('dev_rm_1', 'offline', selectedRole);
      onStateChange(next);
      triggerToast("SIMULAZIONE COMPROMESSA: Risonanza Magnetica Milano Centro è OFFLINE!", "warning");
      setActiveTab('devices');
    }

    else if (simType === 'cyber_incident') {
      // High cyber severity attack alert triggered
      const cyberId = `cyber_alert_${Date.now().toString().slice(-4)}`;
      const cyberEv: CyberEvent = {
        cyber_event_id: cyberId,
        asset_id: 'dev_tac_1',
        device_id: 'dev_tac_1',
        severity: 'Critical',
        mitre_tactic: 'Credential Access',
        timestamp: new Date().toISOString(),
        mfa_status: 'disabled',
        privileged_account: true,
        incident_linked: true,
        patch_available: true,
        remediation_status: 'open',
        owner: 'SOC Lead'
      };

      uState.cyberEvents = [cyberEv, ...uState.cyberEvents];
      uState.eventLog = [{
        event_id: `evt_cyber_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'CYBER_ATTACK_DETECTED',
        message: `🚨 ALLARME CRITICO SOC: Rilevato tentativo di escalation privilegi non autorizzato su TAC Milano Centro (MITRE Tactic: Credential Access)`,
        payload: { cyber_event_id: cyberId }
      }, ...uState.eventLog];

      // Automatically create a high priority task
      uState.operatorTasks = [{
        task_id: `tsk_soc_${Date.now()}`,
        type: 'cyber_remediation',
        title: `ALLARME SOC: Bonifica Credenziali TAC-1`,
        description: `Indagine forense e reset credenziali di rete privilegiate per TAC Milano Centro.`,
        status: 'pending',
        assigned_to: 'SOC Lead SalusCare',
        priority: 'Critical',
        linked_id: cyberId,
        created_at: new Date().toISOString()
      }, ...uState.operatorTasks];

      // Mark device status to anomaly
      const devIdx = uState.devices.findIndex(d => d.device_id === 'dev_tac_1');
      if (devIdx !== -1) {
        uState.devices[devIdx].status = 'anomaly';
      }

      onStateChange(uState);
      saveSharedState(uState);
      triggerToast("SOC ALERT: Attacco cyber rilevato su TAC-1!", "warning");
      setActiveTab('cybersecurity');
    }

    else if (simType === 'slot_reclaimed') {
      // Trigger a slot proposal for Laura Ferri based on an empty slot in Radiologia
      const lauraFerriAppt = uState.appointments.find(a => a.patient_id === 'pat_laura' && a.status === 'scheduled');
      const emptySlot = uState.slots.find(s => s.specialty === 'Radiologia' && s.status === 'available');
      if (lauraFerriAppt && emptySlot) {
        const next = proposeSlotAdvance(lauraFerriAppt.appointment_id, 'pat_laura', emptySlot.slot_id, selectedRole);
        onStateChange(next);
        triggerToast("SIMULAZIONE: Proposta di anticipo inviata con successo a Laura Ferri!", "success");
        setActiveTab('agenda');
      } else {
        triggerToast("Candidato Laura Ferri o slot di Radiologia liberi non disponibili.", "info");
      }
    }
  };

  // Render Sidebar helper
  const renderSidebarItem = (id: string, label: string, icon: React.ReactNode) => {
    return (
      <button
        onClick={() => { setActiveTab(id); setSelectedJourneyAppt(null); setSelectedAgendaAppt(null); setSelectedDevice(null); setSelectedCyberEvent(null); }}
        className={`w-full flex items-center space-x-2.5 px-4 py-3 rounded-lg text-xs font-semibold tracking-wide transition-all ${
          activeTab === id 
            ? 'bg-indigo-600 text-white shadow-md font-bold' 
            : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
        }`}
      >
        {icon}
        <span>{label}</span>
      </button>
    );
  };

  return (
    <div id="corporate-control-tower" className="bg-slate-950 text-slate-100 min-h-screen flex flex-col font-sans">
      
      {/* TOP HEADER CONTROLLER */}
      <div className="bg-slate-900 border-b border-slate-800 py-3.5 px-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        
        {/* Role Selector Card for Demo */}
        <div className="flex items-center space-x-3 bg-slate-950 border border-slate-800 p-2.5 rounded-xl">
          <div className="bg-indigo-600/20 text-indigo-400 p-1.5 rounded-lg border border-indigo-500/30">
            <UserCheck className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Ruolo Amministrativo Attivo:</p>
            <select
              id="role-selector"
              value={selectedRole}
              onChange={(e) => { setSelectedRole(e.target.value); triggerToast(`Ruolo cambiato: ${e.target.value}`, "info"); }}
              className="bg-slate-950 text-indigo-400 font-bold text-xs border-0 focus:ring-0 focus:outline-none p-0 pr-6"
            >
              {roleOptions.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Current Operator Task Quick Alerts Banner */}
        <div className="flex items-center space-x-5 text-xs text-slate-400">
          <div className="bg-slate-950/60 px-3.5 py-1.5 rounded-lg border border-slate-800">
            <strong>Task Segreteria in Coda:</strong>{' '}
            <span className="text-amber-400 font-bold font-mono">
              {state.operatorTasks.filter(t => t.status === 'pending').length} task attivi
            </span>
          </div>
          <div className="bg-slate-950/60 px-3.5 py-1.5 rounded-lg border border-slate-800">
            <strong>Rischio Cyber SOC:</strong>{' '}
            <span className={`font-bold font-mono ${state.cyberEvents.filter(e => e.severity === 'Critical' && e.remediation_status !== 'resolved').length > 0 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
              {state.cyberEvents.filter(e => e.severity === 'Critical' && e.remediation_status !== 'resolved').length} critici
            </span>
          </div>
        </div>

      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* SIDEBAR NAVIGATION */}
        <aside className="w-64 bg-slate-900 border-r border-slate-800 p-4 space-y-1 shrink-0 hidden md:block overflow-y-auto">
          <p className="text-[10px] text-slate-500 font-bold uppercase px-4 pb-2 tracking-widest">Dashboard Modules</p>
          
          {renderSidebarItem('executive', 'Executive Cockpit', <LayoutDashboard className="h-4 w-4" />)}
          {renderSidebarItem('journey', 'Patient Journey Control', <Users className="h-4 w-4" />)}
          {renderSidebarItem('agenda', 'Agenda & Recupero Slot', <Calendar className="h-4 w-4" />)}
          {renderSidebarItem('operations', 'Operations & Ritardi', <Clock className="h-4 w-4" />)}
          {renderSidebarItem('tickets', 'Reclami & Recovery', <AlertTriangle className="h-4 w-4" />)}
          {renderSidebarItem('reports_billing', 'Referti & Pagamenti', <CreditCard className="h-4 w-4" />)}
          
          <div className="h-px bg-slate-800/60 my-4"></div>
          <p className="text-[10px] text-slate-500 font-bold uppercase px-4 pb-2 tracking-widest">Hospital Infrastructure</p>
          
          {renderSidebarItem('devices', 'Dispositivi Medicali IoMT', <Cpu className="h-4 w-4" />)}
          {renderSidebarItem('cybersecurity', 'Cybersecurity SOC', <ShieldAlert className="h-4 w-4" />)}
          {renderSidebarItem('economic', 'Impatto Economico Proxy', <DollarSign className="h-4 w-4" />)}
          {renderSidebarItem('governance', 'Data Quality & MPI', <Database className="h-4 w-4" />)}
          {renderSidebarItem('simulation', 'Simulation Center', <Play className="h-4 w-4 text-emerald-400" />)}
          {renderSidebarItem('audit_log', 'Audit Logs Trasparenti', <Terminal className="h-4 w-4" />)}
        </aside>

        {/* MAIN MODULE CONTENT AREA */}
        <main className="flex-1 p-6 overflow-y-auto bg-slate-950">
          
          {/* --- MODULE 1: EXECUTIVE COCKPIT --- */}
          {activeTab === 'executive' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800/60">
                <div>
                  <h3 className="text-base font-bold text-slate-100">Executive Cockpit</h3>
                  <p className="text-xs text-slate-500">Mappatura integrata delle performance ospedaliere, no-show, rischi sanitari e indicatori finanziari.</p>
                </div>
              </div>
              <ExecutiveCockpit state={state} setViewTab={setActiveTab} />
            </div>
          )}

          {/* --- MODULE 2: PATIENT JOURNEY CONTROL TOWER --- */}
          {activeTab === 'journey' && (
            <div className="space-y-5">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800/60">
                <div>
                  <h3 className="text-base font-bold text-slate-100">Patient Journey Control Tower</h3>
                  <p className="text-xs text-slate-500">Tracciamento end-to-end degli episodi, dei referti digitali e dei canali di comunicazione.</p>
                </div>
              </div>

              {/* MPI Matching Metrics */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <p className="text-slate-500 font-semibold uppercase text-[9px]">Master Patient Index</p>
                  <p className="text-lg font-bold text-emerald-400 mt-0.5">100% Corrispondenza</p>
                </div>
                <div>
                  <p className="text-slate-500 font-semibold uppercase text-[9px]">Referti Collegati a Visita</p>
                  <p className="text-lg font-bold text-slate-200 mt-0.5">98.5% (Tassi standard)</p>
                </div>
                <div>
                  <p className="text-slate-500 font-semibold uppercase text-[9px]">Dispositivi Medicali Associati</p>
                  <p className="text-lg font-bold text-indigo-400 mt-0.5">100% Asset Tagged</p>
                </div>
                <div>
                  <p className="text-slate-500 font-semibold uppercase text-[9px]">Incongruenze Rilevate</p>
                  <p className="text-lg font-bold text-amber-500 mt-0.5">{state.dataQualityIssues.length} anomalie</p>
                </div>
              </div>

              {/* Search Bar */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <label className="text-xs font-bold text-slate-400 block mb-2 uppercase">Cerca Paziente o Episodio Clinico:</label>
                <div className="relative">
                  <input
                    id="journey-search-input"
                    type="text"
                    placeholder="Digita il nome di un paziente (es. Maria Rossi, Giovanni Bianchi, Elena Verdi...)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 pl-10 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none text-slate-200"
                  />
                  <Search className="absolute left-3.5 top-3 text-slate-500 h-4 w-4" />
                </div>
              </div>

              {/* Search Results / Timeline episodes */}
              {searchQuery && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Risultati di Ricerca</h4>
                  
                  {state.patients
                    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(pat => {
                      const visits = state.appointments.filter(a => a.patient_id === pat.patient_id);
                      return (
                        <div key={pat.patient_id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                          
                          {/* Patient Profiler Header */}
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b border-slate-800 gap-3 text-xs">
                            <div>
                              <h5 className="text-sm font-bold text-slate-200">{pat.name}</h5>
                              <p className="text-[11px] text-slate-500">ID: {pat.patient_id} • Nato il {pat.birth_date}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="bg-slate-950 px-2 py-1 rounded text-[10px] text-slate-400 font-medium">NPS: {pat.nps_score}/10</span>
                              <span className="bg-slate-950 px-2 py-1 rounded text-[10px] text-slate-400 font-medium">Churn Risk: {pat.churn_risk}</span>
                              <span className="bg-slate-950 px-2 py-1 rounded text-[10px] text-slate-400 font-medium">Canale: {pat.preferred_channel}</span>
                            </div>
                          </div>

                          {/* Appointments History List */}
                          <div className="space-y-3">
                            <p className="text-xs font-bold text-slate-400 uppercase">Fascicolo Episodi & Visite ({visits.length})</p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {visits.map(appt => {
                                const report = state.reports.find(r => r.appointment_id === appt.appointment_id);
                                const invoice = state.invoices.find(i => i.appointment_id === appt.appointment_id);
                                const ticket = state.tickets.find(t => t.appointment_id === appt.appointment_id);

                                return (
                                  <div 
                                    key={appt.appointment_id} 
                                    onClick={() => setSelectedJourneyAppt(appt)}
                                    className="bg-slate-950 border border-slate-800 hover:border-indigo-500 rounded-xl p-3 cursor-pointer text-xs transition-all relative"
                                  >
                                    <div className="flex justify-between items-start">
                                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                        appt.status === 'completed' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800' :
                                        appt.status === 'cancelled' ? 'bg-red-950/80 text-red-400 border border-red-800' : 'bg-blue-950/80 text-blue-400 border border-blue-800'
                                      }`}>
                                        {appt.status}
                                      </span>
                                      <span className="text-[10px] font-mono text-slate-500">{appt.scheduled_date}</span>
                                    </div>
                                    <h6 className="font-bold text-slate-300 mt-2">{appt.service_type}</h6>
                                    <p className="text-[11px] text-slate-500 mt-0.5">{appt.doctor_name} • {appt.facility_name}</p>

                                    {/* Timeline integration check indicators */}
                                    <div className="mt-3 pt-2 border-t border-slate-900 flex items-center space-x-3 text-[10px] text-slate-400">
                                      <span className={report ? 'text-emerald-400 font-semibold' : 'text-slate-600'}>
                                        📄 {report ? 'Referto OK' : 'No Referto'}
                                      </span>
                                      <span className={invoice?.status === 'paid' ? 'text-emerald-400 font-semibold' : 'text-amber-500'}>
                                        💰 {invoice ? `Ricevuta: ${invoice.status}` : 'No Conto'}
                                      </span>
                                      {ticket && (
                                        <span className="text-red-400 font-bold animate-pulse">
                                          ⚠️ Reclamo aperto
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                        </div>
                      );
                    })}
                </div>
              )}

              {/* Default Timeline help message */}
              {!searchQuery && (
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl text-center">
                  <Users className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Digita sopra un nome per verificare l'indice del paziente ed analizzare il suo percorso ospedaliero (es. Maria Rossi).</p>
                </div>
              )}

            </div>
          )}

          {/* --- MODULE 3: AGENDA & SLOT RECOVERY SYSTEM --- */}
          {activeTab === 'agenda' && (
            <div className="space-y-5">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800/60">
                <div>
                  <h3 className="text-base font-bold text-slate-100">Agenda & Slot Recovery Engine</h3>
                  <p className="text-xs text-slate-500">Gestione appuntamenti, telefonate preventive a 72 ore e riassegnazione intelligente degli slot disdetti.</p>
                </div>
              </div>

              {/* Filters */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Socio-reparto (Specialità):</label>
                  <select
                    id="agenda-spec-filter"
                    value={agendaFilterSpec}
                    onChange={(e) => setAgendaFilterSpec(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-300"
                  >
                    <option value="">Tutte le specialità</option>
                    <option value="Cardiologia">Cardiologia</option>
                    <option value="Radiologia">Radiologia</option>
                    <option value="Laboratorio">Laboratorio</option>
                    <option value="Ginecologia">Ginecologia</option>
                    <option value="Neurologia">Neurologia</option>
                    <option value="Ortopedia">Ortopedia</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Stato Conferma:</label>
                  <select
                    id="agenda-status-filter"
                    value={agendaFilterStatus}
                    onChange={(e) => setAgendaFilterStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-300"
                  >
                    <option value="">Tutti gli stati</option>
                    <option value="pending">Da Confermare (SMS/WhatsApp in corso)</option>
                    <option value="confirmed">Confermati</option>
                    <option value="cancelled">Annullati</option>
                    <option value="reschedule_requested">Riprogrammazione Richiesta</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => { setAgendaFilterSpec(''); setAgendaFilterStatus(''); }}
                    className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 py-2 rounded-lg font-semibold"
                  >
                    Resetta Filtri
                  </button>
                </div>
              </div>

              {/* Appointments list */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/60">
                  <h4 className="text-xs font-bold text-slate-300 uppercase">Appuntamenti Programmati</h4>
                  <span className="text-[11px] font-mono bg-slate-950 px-2 py-0.5 rounded text-indigo-400">Totale Filtri: {
                    state.appointments.filter(a => 
                      (!agendaFilterSpec || a.specialty === agendaFilterSpec) &&
                      (!agendaFilterStatus || a.confirmation_status === agendaFilterStatus || a.status === agendaFilterStatus)
                    ).length
                  }</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-950 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-800">
                        <th className="p-3">Paziente ID</th>
                        <th className="p-3">Specialità</th>
                        <th className="p-3">Data / Ora</th>
                        <th className="p-3">Sede</th>
                        <th className="p-3">Stato Presenza</th>
                        <th className="p-3 text-right">Azioni Operative</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {state.appointments
                        .filter(a => 
                          (!agendaFilterSpec || a.specialty === agendaFilterSpec) &&
                          (!agendaFilterStatus || a.confirmation_status === agendaFilterStatus || a.status === agendaFilterStatus)
                        )
                        .slice(0, 15) // limit list for clean UI
                        .map(appt => {
                          const patient = state.patients.find(p => p.patient_id === appt.patient_id);
                          return (
                            <tr key={appt.appointment_id} className="hover:bg-slate-900/40">
                              <td className="p-3">
                                <p className="font-bold text-slate-200">{patient?.name || appt.patient_id}</p>
                                <p className="text-[10px] text-slate-500 font-mono">Engagement: {patient?.digital_engagement_level}</p>
                              </td>
                              <td className="p-3">
                                <p className="font-semibold text-slate-300">{appt.service_type}</p>
                                <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                  appt.clinical_priority === 'Critical' ? 'bg-red-950 text-red-400 border border-red-800' :
                                  appt.clinical_priority === 'High' ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-blue-950 text-blue-400 border border-blue-800'
                                }`}>
                                  {appt.clinical_priority}
                                </span>
                              </td>
                              <td className="p-3 font-mono text-slate-300">
                                <p>{appt.scheduled_date}</p>
                                <p className="text-slate-500">{appt.scheduled_time}</p>
                              </td>
                              <td className="p-3 text-slate-400 truncate max-w-[120px]" title={appt.facility_name}>
                                {appt.facility_name}
                              </td>
                              <td className="p-3">
                                {appt.status === 'cancelled' ? (
                                  <span className="bg-red-950/80 text-red-400 border border-red-800/50 px-2 py-0.5 rounded text-[10px] font-semibold">
                                    Annullato
                                  </span>
                                ) : appt.confirmation_status === 'pending' ? (
                                  <span className="bg-amber-950/80 text-amber-400 border border-amber-800/50 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 w-max">
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                                    In attesa T-72h
                                  </span>
                                ) : (
                                  <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-800/50 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-0.5 w-max">
                                    <Check className="h-3 w-3" />
                                    Confermato
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end space-x-1.5">
                                  
                                  {/* Call Reminder Script (active if pending confirm) */}
                                  {appt.confirmation_status === 'pending' && appt.status !== 'cancelled' && (
                                    <button
                                      id={`btn-call-script-${appt.appointment_id}`}
                                      onClick={() => setCallModalAppt(appt)}
                                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg flex items-center gap-0.5 shadow transition-all"
                                      title="Contatta paziente via operatore (Script T-72 ore)"
                                    >
                                      <PhoneCall className="h-3 w-3" /> Chiamata
                                    </button>
                                  )}

                                  {/* Recover Slot Action (active if cancelled) */}
                                  {appt.status === 'cancelled' && (
                                    <button
                                      id={`btn-recover-slot-${appt.appointment_id}`}
                                      onClick={() => setRecoveryDrawerAppt(appt)}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg flex items-center gap-0.5 shadow transition-all"
                                    >
                                      <Plus className="h-3 w-3" /> Recupera Slot
                                    </button>
                                  )}

                                  <button
                                    onClick={() => triggerToast(`ID: ${appt.appointment_id} - Dettaglio clinico visionato.`, "info")}
                                    className="bg-slate-800 hover:bg-slate-750 text-slate-400 p-1 rounded border border-slate-700"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </button>

                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* --- MODULE 4: OPERATIONS & CLINICAL DELAYS --- */}
          {activeTab === 'operations' && (
            <div className="space-y-5">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800/60">
                <div>
                  <h3 className="text-base font-bold text-slate-100">Operations & Clinical Board</h3>
                  <p className="text-xs text-slate-500">Monitoraggio ritardi fisici in sala d'attesa e timestamping delle prestazioni mediche del giorno.</p>
                </div>
              </div>

              {/* Operational Delays Dashboard */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <p className="text-slate-500 font-bold uppercase text-[9px]">P90 Ritardo Accettazione</p>
                  <p className="text-lg font-bold text-emerald-400 mt-1">12.4 min</p>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <p className="text-slate-500 font-bold uppercase text-[9px]">Ritardo Medio Medico</p>
                  <p className="text-lg font-bold text-amber-500 mt-1">16.8 min</p>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <p className="text-slate-500 font-bold uppercase text-[9px]">Ritardo Medio Macchinario (IoMT)</p>
                  <p className="text-lg font-bold text-red-400 mt-1">22.1 min</p>
                </div>
              </div>

              {/* Table of active today visits */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
                <div className="p-4 border-b border-slate-800 bg-slate-900/60 text-xs font-bold text-slate-300 uppercase">
                  Flusso Paziente Real-Time (Visite Odierne)
                </div>

                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950 text-slate-500 uppercase tracking-wider text-[9px] border-b border-slate-800">
                        <th className="p-3">Paziente</th>
                        <th className="p-3">Prestazione</th>
                        <th className="p-3">Previsto</th>
                        <th className="p-3">Check-In</th>
                        <th className="p-3">Inizio Visita</th>
                        <th className="p-3">Ritardo Totale</th>
                        <th className="p-3">Causa Ritardo</th>
                        <th className="p-3 text-right">Azioni Real-Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {state.appointments
                        .filter(a => a.status === 'completed' || a.status === 'scheduled')
                        .slice(0, 8)
                        .map(appt => {
                          const patient = state.patients.find(p => p.patient_id === appt.patient_id);
                          return (
                            <tr key={appt.appointment_id} className="hover:bg-slate-900/40">
                              <td className="p-3 font-bold text-slate-200">
                                {patient?.name || appt.patient_id}
                              </td>
                              <td className="p-3 text-slate-300">
                                <p className="font-semibold">{appt.service_type}</p>
                                <p className="text-[10px] text-slate-500">{appt.doctor_name}</p>
                              </td>
                              <td className="p-3 font-mono font-bold text-indigo-400">
                                {appt.scheduled_time}
                              </td>
                              <td className="p-3 font-mono text-slate-400">
                                {appt.check_in_time || "—"}
                              </td>
                              <td className="p-3 font-mono text-slate-400">
                                {appt.start_time || "—"}
                              </td>
                              <td className="p-3 font-mono">
                                {appt.delay_minutes > 0 ? (
                                  <span className="text-red-400 font-bold">+{appt.delay_minutes} min</span>
                                ) : (
                                  <span className="text-emerald-400">In Orario</span>
                                )}
                              </td>
                              <td className="p-3 text-slate-400 capitalize">
                                {appt.delay_reason_code || "—"}
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  id={`btn-edit-timestamps-${appt.appointment_id}`}
                                  onClick={() => setSelectedOpsAppt(appt)}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 ml-auto"
                                >
                                  <Edit3 className="h-3 w-3" /> Timestamp
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* --- MODULE 5: RECLAMI & FEEDBACK (PX RECOVERY) --- */}
          {activeTab === 'tickets' && (
            <div className="space-y-5">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800/60">
                <div>
                  <h3 className="text-base font-bold text-slate-100">Patient Experience Recovery System</h3>
                  <p className="text-xs text-slate-500">Gestione dei reclami (ticket), assegnazione owner, conformità agli SLA e risoluzione attiva.</p>
                </div>
              </div>

              {/* Tickets Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg text-xs">
                <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex justify-between items-center">
                  <h4 className="font-bold text-slate-300 uppercase">Registro Reclami Clinici</h4>
                  <span className="bg-red-950 text-red-400 border border-red-800 px-2 py-0.5 rounded text-[10px] font-mono">
                    Criticità Elevata: {state.tickets.filter(t => t.severity === 'Critical' && t.status !== 'resolved').length} aperti
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950 text-slate-500 uppercase tracking-wider text-[9px] border-b border-slate-800">
                        <th className="p-3">ID Ticket</th>
                        <th className="p-3">Paziente</th>
                        <th className="p-3">Categoria / Causa</th>
                        <th className="p-3">Severità</th>
                        <th className="p-3">Owner Assegnato</th>
                        <th className="p-3">Stato SLA</th>
                        <th className="p-3 text-right">Risolvi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {state.tickets.map(ticket => {
                        const patient = state.patients.find(p => p.patient_id === ticket.patient_id);
                        return (
                          <tr key={ticket.ticket_id} className="hover:bg-slate-900/40">
                            <td className="p-3 font-mono font-bold text-slate-300">
                              {ticket.ticket_id}
                            </td>
                            <td className="p-3 font-bold text-slate-200">
                              {patient?.name || ticket.patient_id}
                            </td>
                            <td className="p-3">
                              <p className="font-semibold text-slate-300">{ticket.category}</p>
                              <p className="text-[10px] text-slate-500 truncate max-w-[200px]" title={ticket.root_cause}>
                                {ticket.root_cause || "Dettaglio assente"}
                              </p>
                            </td>
                            <td className="p-3">
                              <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                ticket.severity === 'Critical' ? 'bg-red-950 text-red-400 border border-red-800 animate-pulse' :
                                ticket.severity === 'High' ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-slate-950 text-slate-400 border border-slate-800'
                              }`}>
                                {ticket.severity}
                              </span>
                            </td>
                            <td className="p-3 text-slate-300 font-semibold">
                              {ticket.owner}
                            </td>
                            <td className="p-3 font-mono">
                              {ticket.status === 'resolved' ? (
                                <span className="text-emerald-400 font-semibold">Risolto</span>
                              ) : ticket.sla_due_date < "2026-07-10" ? (
                                <span className="text-red-400 font-bold flex items-center gap-0.5 animate-pulse">
                                  ⚠️ SLA Scaduto ({ticket.sla_due_date})
                                </span>
                              ) : (
                                <span className="text-slate-400">In tempo ({ticket.sla_due_date})</span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <button
                                id={`btn-action-ticket-${ticket.ticket_id}`}
                                onClick={() => setSelectedTicket(ticket)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg shadow"
                              >
                                Gestisci
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* --- MODULE 6: REFERTI & PAGAMENTI --- */}
          {activeTab === 'reports_billing' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800/60">
                <div>
                  <h3 className="text-base font-bold text-slate-100">Referti Digitali & Emissione Ricevute</h3>
                  <p className="text-xs text-slate-500">Convalida medica dei referti clinici e controllo pagamenti assicurativi/privati.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs">
                
                {/* Reports Panel */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-lg">
                  <h4 className="font-bold text-slate-300 uppercase border-b border-slate-800 pb-2">Refertazione Ospedaliera</h4>
                  
                  <div className="divide-y divide-slate-800/60 space-y-3">
                    {state.reports.slice(0, 5).map(rep => {
                      const patient = state.patients.find(p => p.patient_id === rep.patient_id);
                      return (
                        <div key={rep.report_id} className="pt-3 flex justify-between items-start">
                          <div>
                            <p className="font-bold text-slate-200">{patient?.name}</p>
                            <p className="text-[11px] text-slate-500">N° {rep.report_id} • Stato: {rep.status}</p>
                            <p className="text-[10px] text-slate-400 italic mt-1 line-clamp-2">"{rep.report_text}"</p>
                          </div>
                          {rep.status !== 'published' ? (
                            <button
                              id={`btn-publish-report-${rep.report_id}`}
                              onClick={() => {
                                const uState = readSharedState();
                                uState.reports.find(r=>r.report_id === rep.report_id)!.status = 'published';
                                onStateChange(uState);
                                triggerToast(`Referto ${rep.report_id} convalidato e pubblicato!`, "success");
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2.5 py-1 rounded"
                            >
                              Convalida
                            </button>
                          ) : (
                            <span className="text-emerald-400 font-bold">Pubblicato</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Invoices Panel */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-lg">
                  <h4 className="font-bold text-slate-300 uppercase border-b border-slate-800 pb-2">Ricevute Fiscali & Claim Rejection</h4>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="text-slate-500 text-[10px] border-b border-slate-800">
                          <th className="pb-2">Fattura</th>
                          <th className="pb-2">Paziente</th>
                          <th className="pb-2">Importo</th>
                          <th className="pb-2">Stato</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {state.invoices.slice(0, 6).map(inv => {
                          const patient = state.patients.find(p => p.patient_id === inv.patient_id);
                          return (
                            <tr key={inv.invoice_id} className="hover:bg-slate-900/30">
                              <td className="py-2 font-mono text-slate-400">{inv.invoice_id}</td>
                              <td className="py-2 font-bold text-slate-200">{patient?.name}</td>
                              <td className="py-2 font-bold font-mono">€{inv.amount.toFixed(2)}</td>
                              <td className="py-2">
                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                  inv.status === 'paid' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'
                                }`}>
                                  {inv.status}
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

          {/* --- MODULE 7: MEDICAL DEVICE CONTROL TOWER --- */}
          {activeTab === 'devices' && (
            <div className="space-y-5">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800/60">
                <div>
                  <h3 className="text-base font-bold text-slate-100">Medical Device Control Tower (IoMT)</h3>
                  <p className="text-xs text-slate-500">Monitoraggio preventivo dell'hardware clinico, integrità del firmware, uptime e anomalie.</p>
                </div>
              </div>

              {/* Devices Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                {state.devices.map(device => {
                  return (
                    <div 
                      key={device.device_id} 
                      onClick={() => setSelectedDevice(device)}
                      className={`bg-slate-900 border ${device.status === 'offline' ? 'border-red-600 shadow-red-950/20 shadow-md' : 'border-slate-800'} hover:border-indigo-500 p-4 rounded-xl cursor-pointer transition-all space-y-2.5`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-[10px] text-slate-500">{device.equipment_id}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          device.status === 'online' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                          device.status === 'offline' ? 'bg-red-950 text-red-400 border border-red-800 animate-pulse' : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}>
                          {device.status.toUpperCase()}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-slate-200">{device.device_type} Diagnostic</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">{device.facility_name} • {device.department}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-950 p-2 rounded border border-slate-800">
                        <p><strong>Uptime:</strong> {device.uptime_percentage}%</p>
                        <p><strong>Downtime:</strong> {device.downtime_minutes}m</p>
                        <p className="truncate"><strong>Firmware:</strong> {device.firmware_version}</p>
                        <p className="truncate"><strong>Patch:</strong> {device.patch_status}</p>
                      </div>

                      {device.anomaly_flag && (
                        <p className="text-[10px] text-red-400 bg-red-950/40 p-1.5 rounded border border-red-900 flex items-center gap-1">
                          <BadgeAlert className="h-3.5 w-3.5 animate-bounce text-red-400" /> Anomalia IoMT attiva
                        </p>
                      )}

                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* --- MODULE 8: CYBERSECURITY SOC --- */}
          {activeTab === 'cybersecurity' && (
            <div className="space-y-5">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800/60">
                <div>
                  <h3 className="text-base font-bold text-slate-100">Cybersecurity SOC (Security Operations Center)</h3>
                  <p className="text-xs text-slate-500">Ispezione traffico di rete IoMT, vulnerabilità MITRE, assenza MFA ed incident response.</p>
                </div>
              </div>

              {/* Cyber Alert Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg text-xs">
                <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex justify-between items-center">
                  <h4 className="font-bold text-slate-300 uppercase">Minacce & Allarmi Cyber Rilevati</h4>
                  <span className="text-red-400 font-mono font-bold">
                    In Lavorazione: {state.cyberEvents.filter(e => e.remediation_status === 'in_progress').length} threats
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950 text-slate-500 uppercase tracking-wider text-[9px] border-b border-slate-800">
                        <th className="p-3">ID Evento</th>
                        <th className="p-3">Asset ID (Device)</th>
                        <th className="p-3">MITRE Tactic</th>
                        <th className="p-3">MFA Status</th>
                        <th className="p-3">Severity</th>
                        <th className="p-3">Stato Bonifica</th>
                        <th className="p-3 text-right">Bonifica</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {state.cyberEvents.map(event => {
                        return (
                          <tr key={event.cyber_event_id} className="hover:bg-slate-900/40">
                            <td className="p-3 font-mono font-bold text-slate-300">
                              {event.cyber_event_id}
                            </td>
                            <td className="p-3 font-semibold text-slate-200">
                              {event.asset_id}
                            </td>
                            <td className="p-3 text-indigo-400">
                              {event.mitre_tactic}
                            </td>
                            <td className="p-3">
                              <span className={event.mfa_status === 'disabled' ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                                {event.mfa_status}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                event.severity === 'Critical' ? 'bg-red-950 text-red-400 border border-red-800 animate-pulse' :
                                event.severity === 'High' ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-slate-950 text-slate-400 border border-slate-800'
                              }`}>
                                {event.severity}
                              </span>
                            </td>
                            <td className="p-3 capitalize">
                              {event.remediation_status}
                            </td>
                            <td className="p-3 text-right">
                              {event.remediation_status === 'open' ? (
                                <button
                                  id={`btn-cyber-remediate-${event.cyber_event_id}`}
                                  onClick={() => {
                                    const next = createCyberTask(event.cyber_event_id, selectedRole);
                                    onStateChange(next);
                                    triggerToast(`Bonifica cyber avviata per ${event.cyber_event_id}!`, "success");
                                  }}
                                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] px-2.5 py-1 rounded"
                                >
                                  Mitiga
                                </button>
                              ) : (
                                <span className="text-emerald-400 font-semibold">In Lavorazione / OK</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* --- MODULE 9: ECONOMIC IMPACT CALCULATOR --- */}
          {activeTab === 'economic' && (
            <div className="space-y-5">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800/60">
                <div>
                  <h3 className="text-base font-bold text-slate-100">Economic Proxy Impact Analyzer</h3>
                  <p className="text-xs text-slate-500">Mappatura del margine a rischio generato da inefficienze, ritardi e fermi macchina.</p>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="bg-slate-900 border border-indigo-950/40 p-4 rounded-xl text-xs text-indigo-400">
                ⚠️ <strong>ATTENZIONE:</strong> Il valore visualizzato è una proxy di margine economico a rischio per ottimizzazione operativa ospedaliera, non una perdita contabile reale certa. I dati di costo per chiamata operatore ed i costi implementativi non sono definiti (N.D.).
              </div>

              {/* Interactive Simulator Sliders */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 shadow-lg text-xs">
                <h4 className="font-bold text-slate-300 uppercase">Simulatore Riduzione Inefficienze</h4>
                <p className="text-slate-500">Muovi il cursore per stimare il beneficio proxy recuperabile riducendo no-show, cancellazioni e downtime:</p>
                
                <div className="space-y-2.5 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-center">
                    <span className="font-bold">Percentuale inefficienze da sanare:</span>
                    <span className="text-indigo-400 font-bold font-mono">{simEfficiencyImprovement}%</span>
                  </div>
                  <input
                    id="slider-efficiency"
                    type="range"
                    min="10"
                    max="50"
                    step="10"
                    value={simEfficiencyImprovement}
                    onChange={(e) => setSimEfficiencyImprovement(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>10% (Base)</span>
                    <span>30% (Standard)</span>
                    <span>50% (Sfidante)</span>
                  </div>
                </div>

                {/* Scenario result */}
                <div className="p-4 bg-indigo-950/40 rounded-xl border border-indigo-800/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h5 className="font-bold text-indigo-300">Beneficio Proxy Recuperabile Stimato:</h5>
                    <p className="text-[11px] text-indigo-400">Ricalcolato sullo storico inefficienze attive nel localStorage.</p>
                  </div>
                  <p className="text-2xl font-bold text-emerald-400 font-mono">
                    €{( (state.appointments.filter(a => a.status === 'no-show').length * 120 + state.appointments.filter(a => a.status === 'cancelled').length * 30 + state.devices.filter(d=>d.status === 'offline').length * 450) * (simEfficiencyImprovement / 100) ).toFixed(2)}
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* --- MODULE 10: DATA GOVERNANCE --- */}
          {activeTab === 'governance' && (
            <div className="space-y-5">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800/60">
                <div>
                  <h3 className="text-base font-bold text-slate-100">Data Governance & MPI Dashboard</h3>
                  <p className="text-xs text-slate-500">Integrità dei campi, master patient index matching ed elenco dei dati fittizi non definiti (N.D.) da raccogliere.</p>
                </div>
              </div>

              {/* Data Quality Issues Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg text-xs">
                <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex justify-between items-center">
                  <h4 className="font-bold text-slate-300 uppercase">Incongruenze e Campi Mancanti (Privacy Audit)</h4>
                  <span className="text-amber-400 font-mono font-bold">
                    Campi N.D.: {state.dataQualityIssues.length} anomalie
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950 text-slate-500 uppercase tracking-wider text-[9px] border-b border-slate-800">
                        <th className="p-3">Tabella</th>
                        <th className="p-3">Campo Incriminato</th>
                        <th className="p-3">Record ID</th>
                        <th className="p-3">Descrizione Problema</th>
                        <th className="p-3">Priorità</th>
                        <th className="p-3 text-right">Risolvi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {state.dataQualityIssues.map(issue => {
                        return (
                          <tr key={issue.issue_id} className="hover:bg-slate-900/40">
                            <td className="p-3 font-mono font-bold text-slate-300">
                              {issue.table_name}
                            </td>
                            <td className="p-3 text-indigo-400">
                              {issue.field_name}
                            </td>
                            <td className="p-3 font-mono text-slate-400">
                              {issue.record_id}
                            </td>
                            <td className="p-3 text-slate-400">
                              {issue.issue_description}
                            </td>
                            <td className="p-3">
                              <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                issue.severity === 'High' ? 'bg-red-950 text-red-400 border border-red-800' :
                                issue.severity === 'Medium' ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-slate-950 text-slate-400 border border-slate-800'
                              }`}>
                                {issue.severity}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                id={`btn-resolve-dq-${issue.issue_id}`}
                                onClick={() => {
                                  const uState = readSharedState();
                                  uState.dataQualityIssues = uState.dataQualityIssues.filter(i=>i.issue_id !== issue.issue_id);
                                  onStateChange(uState);
                                  saveSharedState(uState);
                                  triggerToast(`Anomalia di Data Quality ${issue.issue_id} risolta con successo!`, "success");
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2.5 py-1 rounded"
                              >
                                Risolto
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Data N.D. Table required by guidelines */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <h4 className="font-bold text-slate-300 uppercase text-xs border-b border-slate-800 pb-2">Campi Ospedalieri Fittizi N.D. da integrare</h4>
                <p className="text-slate-500 text-xs">Mappatura dei parametri operativi assenti nei vecchi database e pronti all'importazione in SalusCare:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {[
                    "Costo reale fermo macchina per RM/TAC",
                    "Orario effettivo arrivo medico in reparto",
                    "Orario effettivo arrivo paziente in accettazione",
                    "Causa reale del ritardo della prestazione",
                    "Collegamento univoco reclamo-visita medica",
                    "Costo chiamata reminder operatore T-72h",
                    "SLA Target Cybersecurity SOC",
                    "Detection & Containment Time del Threat"
                  ].map((nd, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-950 border border-slate-850 rounded flex items-center justify-between">
                      <span className="text-slate-400">{nd}</span>
                      <span className="bg-slate-900 text-[10px] px-2 py-0.5 rounded text-amber-500 font-mono">Dato N.D.</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* --- MODULE 11: SIMULATION CENTER --- */}
          {activeTab === 'simulation' && (
            <div className="space-y-5">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800/60">
                <div>
                  <h3 className="text-base font-bold text-slate-100">Clinical Simulation & Stress Testing</h3>
                  <p className="text-xs text-slate-500">Dispatche eventi istantanei per testare la sincronizzazione, l'ottimizzazione dell'agenda e le difese di cybersecurity.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-slate-300">1. Disdetta Maria Rossi</h4>
                    <p className="text-slate-500 text-[11px] mt-1">Simula Maria Rossi che cancella una visita futura dall'app. Lo slot diagnostico si libera istantaneamente.</p>
                  </div>
                  <button
                    id="btn-sim-cancel"
                    onClick={() => triggerSimulation('cancel_maria')}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-1.5 mt-3"
                  >
                    <Play className="h-4 w-4" /> Esegui Disdetta
                  </button>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-slate-300">2. Reclamo Attesa Paolo Neri</h4>
                    <p className="text-slate-500 text-[11px] mt-1">Simula Paolo Neri che apre un reclamo grave per ritardo prestazione RM, inserendo owner e SLA.</p>
                  </div>
                  <button
                    id="btn-sim-complaint"
                    onClick={() => triggerSimulation('complaint_paolo')}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-1.5 mt-3"
                  >
                    <Play className="h-4 w-4" /> Esegui Reclamo
                  </button>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-slate-300">3. Risonanza Magnetica OFFLINE</h4>
                    <p className="text-slate-500 text-[11px] mt-1">Simula guasto blocco elio RM Milano. Genera work order manutenzione ed evidenzia visite impattate.</p>
                  </div>
                  <button
                    id="btn-sim-offline"
                    onClick={() => triggerSimulation('rm_offline')}
                    className="w-full bg-red-650 hover:bg-red-700 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-1.5 mt-3 animate-pulse"
                  >
                    <Play className="h-4 w-4" /> Spegni Risonanza
                  </button>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-slate-300">4. Attacco Cyber SOC High</h4>
                    <p className="text-slate-500 text-[11px] mt-1">Attiva allarme SOC per tentativo di escalation privilegi non autorizzati su TAC-1 (Credential Access).</p>
                  </div>
                  <button
                    id="btn-sim-cyber"
                    onClick={() => triggerSimulation('cyber_incident')}
                    className="w-full bg-red-650 hover:bg-red-700 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-1.5 mt-3"
                  >
                    <Play className="h-4 w-4" /> Lancia Attack
                  </button>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-slate-300">5. Proposta Anticipo Laura Ferri</h4>
                    <p className="text-slate-500 text-[11px] mt-1">Simula l'invio automatico di proposta di anticipo clinico a Laura Ferri per recuperare slot diagnostici.</p>
                  </div>
                  <button
                    id="btn-sim-slot"
                    onClick={() => triggerSimulation('slot_reclaimed')}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-1.5 mt-3"
                  >
                    <Play className="h-4 w-4" /> Proponi Slot
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* --- MODULE 12: AUDIT LOGS --- */}
          {activeTab === 'audit_log' && (
            <div className="space-y-5">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800/60">
                <div>
                  <h3 className="text-base font-bold text-slate-100">Piattaforma Trasparente Audit Log (GDPR compliant)</h3>
                  <p className="text-xs text-slate-500">Ogni singola azione compiuta da pazienti o medici viene registrata con stato precedente, stato successivo e causale.</p>
                </div>
              </div>

              {/* Log list */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg text-xs">
                <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex justify-between items-center">
                  <h4 className="font-bold text-slate-300 uppercase">Tracciabilità Sistema</h4>
                  <span className="text-indigo-400 font-mono">{state.auditLog.length} record censiti</span>
                </div>

                <div className="overflow-x-auto font-mono text-[11px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950 text-slate-500 uppercase tracking-wider text-[9px] border-b border-slate-800">
                        <th className="p-3">Timestamp</th>
                        <th className="p-3">Ruolo Utente</th>
                        <th className="p-3">Azione</th>
                        <th className="p-3">Target</th>
                        <th className="p-3">Stato Precedente</th>
                        <th className="p-3">Stato Successivo</th>
                        <th className="p-3">Giustificazione</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {state.auditLog.map(log => {
                        return (
                          <tr key={log.log_id} className="hover:bg-slate-900/20">
                            <td className="p-3 text-slate-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString()}</td>
                            <td className="p-3 text-indigo-400 font-semibold">{log.user_role}</td>
                            <td className="p-3 text-slate-200">{log.action}</td>
                            <td className="p-3 text-slate-400">{log.object_type} ({log.object_id})</td>
                            <td className="p-3 text-red-400/80 max-w-[120px] truncate" title={log.previous_state}>{log.previous_state}</td>
                            <td className="p-3 text-emerald-400/80 max-w-[120px] truncate" title={log.new_state}>{log.new_state}</td>
                            <td className="p-3 text-slate-400 truncate max-w-[150px]" title={log.reason}>{log.reason}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </main>
      </div>

      {/* --- DRAWERS & MODALS FOR REAL-TIME OPERATIONS --- */}

      {/* 1. SCRIPT CALL MODAL (SEGRETARIA REMINDER) */}
      {callModalAppt && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 text-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <PhoneCall className="h-4.5 w-4.5 text-indigo-400" />
                Script Chiamata Preventiva T-72 Ore
              </h4>
              <button onClick={() => setCallModalAppt(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2 text-slate-300">
              <p className="font-bold text-indigo-400 uppercase text-[9px]">Script suggerito per operatore:</p>
              <p className="italic font-serif">
                "Buongiorno, parlo con il signor/la signora <strong>{state.patients.find(p=>p.patient_id === callModalAppt.patient_id)?.name}</strong>? Chiamo da SalusCare. Volevo ricordarle il suo appuntamento di <strong>{callModalAppt.service_type}</strong> previsto per il <strong>{callModalAppt.scheduled_date}</strong> alle ore <strong>{callModalAppt.scheduled_time}</strong>. Ci conferma la sua presenza o preferisce liberare lo slot per un altro paziente?"
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Esito Chiamata:</label>
                <select
                  id="call-outcome-select"
                  value={callOutcome}
                  onChange={(e) => setCallOutcome(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="conferma">Paziente CONFERMA presenza</option>
                  <option value="cancella">Paziente CANCELLA l'appuntamento (Libera Slot)</option>
                  <option value="riprogramma">Paziente chiede di RIPROGRAMMARE la data</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Note Operatore:</label>
                <input
                  id="call-notes-input"
                  type="text"
                  placeholder="Es. Paziente in viaggio, conferma esame..."
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                id="btn-submit-call"
                onClick={handleCallOutcomeSubmit}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg"
              >
                Registra Chiamata
              </button>
              <button
                onClick={() => setCallModalAppt(null)}
                className="flex-1 bg-slate-850 hover:bg-slate-800 text-slate-400 py-2 rounded-lg border border-slate-755"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. SLOT RECOVERY CANDIDATES DRAWER */}
      {recoveryDrawerAppt && (
        <div className="fixed inset-y-0 right-0 w-96 bg-slate-900 border-l border-slate-800 shadow-2xl p-5 z-50 text-xs flex flex-col justify-between overflow-y-auto">
          
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-400" /> Slot Recovery Optimizer
              </h4>
              <button onClick={() => setRecoveryDrawerAppt(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl">
              <p className="text-[9px] text-slate-500 font-bold uppercase">Slot da recuperare:</p>
              <p className="font-bold text-slate-200 mt-1">{recoveryDrawerAppt.service_type}</p>
              <p className="text-[11px] text-slate-400">{recoveryDrawerAppt.scheduled_date} alle {recoveryDrawerAppt.scheduled_time}</p>
            </div>

            {recoverySucceed ? (
              <div className="p-4 bg-emerald-950/40 border border-emerald-800 rounded-xl text-center text-emerald-400 animate-pulse">
                Proposta d'anticipo notificata con successo!
              </div>
            ) : (
              <div className="space-y-2.5">
                <p className="font-bold text-slate-300">Candidati suggeriti in lista d'attesa (Algoritmo Clinico):</p>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {getRankedCandidates(recoveryDrawerAppt).slice(0, 5).map((cand, idx) => (
                    <div key={idx} className="p-3 bg-slate-950 border border-slate-800 hover:border-indigo-500 rounded-lg space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-200">{cand.patient.name}</span>
                        <span className="bg-indigo-950 text-indigo-400 font-bold px-2 py-0.5 rounded font-mono">
                          Score: {cand.score}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">Visita attuale: {cand.appt.scheduled_date} ({cand.appt.scheduled_time})</p>
                      <p className="text-[10px] text-slate-500 italic">{cand.scoreBreakdown}</p>
                      <button
                        id={`btn-send-advance-proposal-${cand.patient.patient_id}`}
                        onClick={() => handleProposeRecovery(cand.patient.patient_id, cand.appt.appointment_id)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 rounded shadow"
                      >
                        Proponi Anticipo Visita
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800">
            <button
              onClick={() => setRecoveryDrawerAppt(null)}
              className="w-full bg-slate-800 hover:bg-slate-750 text-slate-400 py-2 rounded-lg font-bold"
            >
              Chiudi Pannello
            </button>
          </div>

        </div>
      )}

      {/* 3. TICKET ACTION DRAWER (CUSTOMER CARE RECUPERO DISSODDISFAZIONE) */}
      {selectedTicket && (
        <div className="fixed inset-y-0 right-0 w-96 bg-slate-900 border-l border-slate-800 shadow-2xl p-5 z-50 text-xs flex flex-col justify-between overflow-y-auto">
          
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h4 className="text-sm font-bold text-slate-100">Risoluzione Reclamo Paziente</h4>
              <button onClick={() => setSelectedTicket(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg space-y-1">
              <p className="text-[9px] text-slate-500 font-bold uppercase">Segnalato da:</p>
              <p className="font-bold text-slate-200">
                {state.patients.find(p=>p.patient_id === selectedTicket.patient_id)?.name}
              </p>
              <p className="text-slate-400 mt-1">"{selectedTicket.root_cause}"</p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase">Assegna Owner:</label>
                <input
                  id="ticket-owner-input"
                  type="text"
                  value={ticketOwner}
                  onChange={(e) => setTicketOwner(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase">Severità Rischio Churn:</label>
                <select
                  id="ticket-severity-select"
                  value={ticketSeverity}
                  onChange={(e) => setTicketSeverity(e.target.value as Ticket['severity'])}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-slate-300"
                >
                  <option value="Low">Basso</option>
                  <option value="Medium">Medio</option>
                  <option value="High">Elevato</option>
                  <option value="Critical">Critico</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase">Stato Ticket:</label>
                <select
                  id="ticket-status-select"
                  value={ticketStatus}
                  onChange={(e) => setTicketStatus(e.target.value as Ticket['status'])}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-slate-300"
                >
                  <option value="open">Aperto</option>
                  <option value="in_progress">In Lavorazione</option>
                  <option value="resolved">Risolto (Notifica inviata al paziente)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase">Note di Risoluzione / Risposta al paziente:</label>
                <textarea
                  id="ticket-notes-textarea"
                  value={ticketNotesText}
                  onChange={(e) => setTicketNotesText(e.target.value)}
                  placeholder="Es. Ricalcolata fattura corretta e trasmessa alla compagnia assicurativa..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-slate-200"
                ></textarea>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-2">
            <button
              id="btn-submit-ticket-status"
              onClick={handleTicketStatusSubmit}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg"
            >
              Salva Modifiche
            </button>
            <button
              onClick={() => setSelectedTicket(null)}
              className="w-full bg-slate-800 hover:bg-slate-750 text-slate-400 py-2 rounded-lg"
            >
              Annulla
            </button>
          </div>

        </div>
      )}

      {/* 4. TIMESTAMP EDIT MODAL (OPERATIONS BOARD) */}
      {selectedOpsAppt && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 text-xs text-slate-300">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h4 className="text-sm font-bold text-slate-100">Registrazione Real-Time Timestamp</h4>
              <button onClick={() => setSelectedOpsAppt(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p>Registra i passaggi del paziente <strong>{state.patients.find(p=>p.patient_id === selectedOpsAppt.patient_id)?.name}</strong> per la prestazione di <strong>{selectedOpsAppt.service_type}</strong>:</p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase">Check-In Accettazione:</label>
                <div className="flex space-x-1">
                  <input
                    id="input-check-in-time"
                    type="time"
                    value={selectedOpsAppt.check_in_time || ""}
                    onChange={(e) => handleOpsTimestampUpdate('check_in_time', e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded p-1 text-xs w-full text-slate-200"
                  />
                  <button
                    onClick={() => handleOpsTimestampUpdate('check_in_time', new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}))}
                    className="bg-slate-800 p-1 rounded hover:bg-slate-750"
                  >
                    Ora
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase">Inizio Effettivo Prestazione:</label>
                <div className="flex space-x-1">
                  <input
                    id="input-start-time"
                    type="time"
                    value={selectedOpsAppt.start_time || ""}
                    onChange={(e) => handleOpsTimestampUpdate('start_time', e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded p-1 text-xs w-full text-slate-200"
                  />
                  <button
                    onClick={() => handleOpsTimestampUpdate('start_time', new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}))}
                    className="bg-slate-800 p-1 rounded hover:bg-slate-750"
                  >
                    Ora
                  </button>
                </div>
              </div>
            </div>

            {selectedOpsAppt.delay_minutes > 15 && (
              <div className="space-y-1">
                <label className="text-[10px] text-red-400 font-bold uppercase">Causale del ritardo clinico:</label>
                <select
                  id="ops-delay-reason"
                  value={selectedOpsAppt.delay_reason_code || ""}
                  onChange={(e) => {
                    const next = updateAppointment(selectedOpsAppt.appointment_id, { delay_reason_code: e.target.value }, selectedRole, "Causale ritardo modificata");
                    onStateChange(next);
                    triggerToast("Causale ritardo salvata!", "success");
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-slate-300 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Seleziona causa...</option>
                  <option value="medico">Ritardo Medico Refertatore / Convalidatore</option>
                  <option value="paziente">Ritardo Arrivo del Paziente</option>
                  <option value="accettazione">Saturazione code in Accettazione</option>
                  <option value="sala">Mancata prontezza della Sala Diagnostica</option>
                  <option value="device">Anomalia o ricalibrazione del Dispositivo (IoMT)</option>
                </select>
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={() => setSelectedOpsAppt(null)}
                className="w-full bg-slate-800 hover:bg-slate-750 text-slate-400 py-2 rounded-lg font-bold"
              >
                Chiudi Timestamping
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MEDICAL DEVICE ACTION DETAIL MODAL */}
      {selectedDevice && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 text-xs text-slate-300">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h4 className="text-sm font-bold text-slate-100">Dispositivo {selectedDevice.equipment_id}</h4>
              <button onClick={() => setSelectedDevice(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="p-3 bg-slate-950 rounded border border-slate-855 grid grid-cols-2 gap-2">
                <p><strong>Tipo:</strong> {selectedDevice.device_type}</p>
                <p><strong>Sede:</strong> {selectedDevice.facility_name}</p>
                <p><strong>Uptime:</strong> {selectedDevice.uptime_percentage}%</p>
                <p><strong>Stato:</strong> <span className={selectedDevice.status === 'online' ? 'text-emerald-400 font-bold':'text-red-400 font-bold'}>{selectedDevice.status.toUpperCase()}</span></p>
                <p><strong>Owner Tecnico:</strong> {selectedDevice.owner_technical}</p>
                <p><strong>Owner Clinico:</strong> {selectedDevice.owner_clinical}</p>
              </div>

              <div className="p-3 bg-slate-950 rounded border border-slate-855 space-y-2">
                <p className="font-bold text-indigo-400 uppercase text-[9px]">Eventi Telemetria IoMT Recenti:</p>
                <div className="divide-y divide-slate-900 space-y-1 max-h-32 overflow-y-auto">
                  {state.iomtEvents
                    .filter(e => e.device_id === selectedDevice.device_id)
                    .map((e, idx) => (
                      <div key={idx} className="pt-1 flex justify-between">
                        <span>{e.metric_name}: <strong>{e.metric_value}</strong></span>
                        <span className={e.status === 'normal' ? 'text-emerald-400' : 'text-amber-500'}>{e.status}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              {selectedDevice.status !== 'online' ? (
                <button
                  id={`btn-device-online-${selectedDevice.device_id}`}
                  onClick={() => {
                    const next = createDeviceAlert(selectedDevice.device_id, 'online', selectedRole);
                    onStateChange(next);
                    setSelectedDevice(null);
                    triggerToast("Dispositivo ripristinato online!", "success");
                  }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg"
                >
                  Ripristina Online
                </button>
              ) : (
                <button
                  id={`btn-device-offline-${selectedDevice.device_id}`}
                  onClick={() => {
                    const next = createDeviceAlert(selectedDevice.device_id, 'offline', selectedRole);
                    onStateChange(next);
                    setSelectedDevice(null);
                    triggerToast("Simulazione: Dispositivo spento!", "warning");
                  }}
                  className="flex-1 bg-red-650 hover:bg-red-700 text-white font-bold py-2 rounded-lg"
                >
                  Spegni (Simula Guasto)
                </button>
              )}
              <button
                onClick={() => setSelectedDevice(null)}
                className="flex-1 bg-slate-800 text-slate-400 py-2 rounded-lg border border-slate-700"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
