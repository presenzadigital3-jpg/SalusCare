/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  SharedState, Patient, Appointment, Slot, Report, Invoice, Ticket, Feedback, Notification, SlotProposal 
} from '../types';
import { 
  cancelAppointment, rescheduleAppointment, createTicket, createNotification, acceptSlotAdvance, saveSharedState, readSharedState 
} from '../stateManager';
import { 
  Home, Calendar, FileText, CreditCard, HelpCircle, User, 
  CheckCircle2, AlertTriangle, ArrowRight, Clock, MapPin, 
  UserCheck, ChevronRight, X, AlertCircle, FileDigit, Download, MessageSquare, Send, Check, Smartphone
} from 'lucide-react';

interface PatientViewProps {
  state: SharedState;
  onStateChange: (newState: SharedState) => void;
  selectedPatientId: string;
  setSelectedPatientId: (id: string) => void;
  triggerToast: (msg: string, type: 'success' | 'warning' | 'info') => void;
}

export const PatientView: React.FC<PatientViewProps> = ({
  state,
  onStateChange,
  selectedPatientId,
  setSelectedPatientId,
  triggerToast
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'book' | 'appointments' | 'reports' | 'billing' | 'support' | 'profile'>('home');
  
  // Guided Booking State
  const [bookingStep, setBookingStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [selectedFacility, setSelectedFacility] = useState<string>('');
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  // Modals / Input states
  const [cancelModalAppt, setCancelModalAppt] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('Imprevisto personale');
  const [rescheduleModalAppt, setRescheduleModalAppt] = useState<Appointment | null>(null);
  const [selectedReschedSlotId, setSelectedReschedSlotId] = useState<string>('');
  
  // Feedback post-visit
  const [feedbackAppt, setFeedbackAppt] = useState<Appointment | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackComplaint, setFeedbackComplaint] = useState<boolean>(false);
  const [feedbackComment, setFeedbackComment] = useState<string>('');
  const [feedbackCallback, setFeedbackCallback] = useState<boolean>(false);

  // Report Issue
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportIssueType, setReportIssueType] = useState<string>('Referto poco chiaro');
  const [reportIssueComment, setReportIssueComment] = useState<string>('');

  // Billing Dispute
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceDisputeType, setInvoiceDisputeType] = useState<string>('importo non chiaro');
  const [invoiceDisputeComment, setInvoiceDisputeComment] = useState<string>('');

  // Support Ticket Form
  const [ticketCategory, setTicketCategory] = useState<Ticket['category']>('App/Portale');
  const [ticketDesc, setTicketDesc] = useState<string>('');
  const [ticketRelAppt, setTicketRelAppt] = useState<string>('');

  // Active Patient
  const activePatient = state.patients.find(p => p.patient_id === selectedPatientId) || state.patients[0];

  // Auto select patient dependencies
  const patientAppointments = state.appointments.filter(a => a.patient_id === activePatient?.patient_id);
  const patientReports = state.reports.filter(r => r.patient_id === activePatient?.patient_id);
  const patientInvoices = state.invoices.filter(i => i.patient_id === activePatient?.patient_id);
  const patientTickets = state.tickets.filter(t => t.patient_id === activePatient?.patient_id);
  const patientNotifications = state.notifications.filter(n => n.patient_id === activePatient?.patient_id);

  // Active Proposal for this patient
  const activeProposal = state.slotProposals.find(
    p => p.candidate_patient_id === activePatient?.patient_id && p.status === 'proposed'
  );

  const proposedSlot = activeProposal 
    ? state.slots.find(s => s.slot_id === activeProposal.target_slot_id) 
    : null;

  const proposedAppt = activeProposal 
    ? state.appointments.find(a => a.appointment_id === activeProposal.appointment_id) 
    : null;

  // Handle Switch Patient
  const handlePatientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPatientId(e.target.value);
    setActiveTab('home');
    setBookingStep(1);
    setSelectedSpecialty('');
    setSelectedFacility('');
    setSelectedDoctor('');
    setSelectedSlot(null);
    setFeedbackAppt(null);
    setSelectedReport(null);
    setSelectedInvoice(null);
  };

  // BOOKING SYSTEM WIZARD
  const specialties = [
    "Cardiologia", "Radiologia", "Laboratorio", "Ginecologia", 
    "Neurologia", "Ortopedia", "Fisioterapia", "Telemedicina"
  ];
  const facilities = [
    { id: "fac_milano", name: "SalusCare Milano Centro" },
    { id: "fac_roma", name: "SalusCare Roma Eur" },
    { id: "fac_torino", name: "SalusCare Torino Diagnostica" },
    { id: "fac_napoli", name: "SalusCare Napoli Ambulatori" }
  ];

  // Available slots based on specialty and facility
  const filteredSlots = state.slots.filter(s => 
    s.specialty === selectedSpecialty && 
    s.facility_id === selectedFacility && 
    s.status === 'available'
  );

  const handleBookingSubmit = () => {
    if (!selectedSlot) return;
    
    const uState = readSharedState();
    const newApptId = `appt_new_${Date.now().toString().slice(-6)}`;
    const newEpId = `ep_new_${Date.now().toString().slice(-6)}`;
    const newInvId = `inv_new_${Date.now().toString().slice(-6)}`;

    // Create appointment
    const newAppt: Appointment = {
      appointment_id: newApptId,
      episode_id: newEpId,
      patient_id: activePatient.patient_id,
      service_type: selectedSpecialty === 'Radiologia' ? 'Risonanza Magnetica' : 'Visita Specialistica',
      specialty: selectedSpecialty,
      facility_id: selectedFacility,
      facility_name: facilities.find(f => f.id === selectedFacility)?.name || "SalusCare",
      department: selectedSpecialty === 'Radiologia' ? 'Radiologia' : 'Poliambulatorio',
      doctor_id: `doc_${selectedSpecialty.toLowerCase()}`,
      doctor_name: selectedSlot.doctor_id ? (selectedSlot as any).doctor_name : "Primo Medico Disponibile",
      scheduled_date: selectedSlot.date,
      scheduled_time: selectedSlot.start_time,
      status: 'scheduled',
      confirmation_status: 'confirmed', // auto confirmed upon patient booking
      confirmation_channel: 'WhatsApp',
      confirmation_timestamp: new Date().toISOString(),
      reschedule_requested: false,
      clinical_priority: 'Medium',
      waiting_list_days: 1,
      preparation_required: selectedSpecialty === 'Radiologia' ? "Digiuno 6 ore prima" : "Nessuna",
      room_id: selectedSlot.room_id,
      delay_minutes: 0,
      invoice_id: newInvId
    };

    // Add appointment
    uState.appointments = [newAppt, ...uState.appointments];

    // Book slot
    const slotIdx = uState.slots.findIndex(s => s.slot_id === selectedSlot.slot_id);
    if (slotIdx !== -1) {
      uState.slots[slotIdx].status = 'booked';
      uState.slots[slotIdx].booked = true;
      uState.slots[slotIdx].available = false;
    }

    // Create Invoice
    const newInvoice: Invoice = {
      invoice_id: newInvId,
      episode_id: newEpId,
      appointment_id: newApptId,
      patient_id: activePatient.patient_id,
      amount: selectedSpecialty === 'Radiologia' ? 180.00 : 120.00,
      payer_type: activePatient.digital_engagement_level === 'High' ? 'Private' : 'SSN',
      status: 'unpaid',
      payment_delay_days: 0,
      claim_rejection_flag: false
    };
    uState.invoices = [newInvoice, ...uState.invoices];

    // Event & Audit
    const eventMsg = `Paziente ${activePatient.name} ha prenotato una visita di ${selectedSpecialty} per il ${selectedSlot.date} alle ${selectedSlot.start_time}.`;
    
    // push notification
    uState.notifications = [{
      notification_id: `notif_b_${Date.now()}`,
      patient_id: activePatient.patient_id,
      message: `La tua prenotazione per ${selectedSpecialty} è confermata per il ${selectedSlot.date} alle ${selectedSlot.start_time}.`,
      type: 'success',
      read: false,
      created_at: new Date().toISOString()
    }, ...uState.notifications];

    const updated = {
      ...uState,
      eventLog: [{
        event_id: `evt_b_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'APPOINTMENT_CREATED',
        message: eventMsg,
        payload: { appointment_id: newApptId }
      }, ...uState.eventLog],
      auditLog: [{
        log_id: `aud_b_${Date.now()}`,
        timestamp: new Date().toISOString(),
        user_role: 'Paziente',
        action: 'BOOK_APPOINTMENT',
        object_type: 'APPOINTMENT',
        object_id: newApptId,
        previous_state: '{}',
        new_state: JSON.stringify(newAppt),
        reason: 'Prenotazione autonoma via app portale'
      }, ...uState.auditLog]
    };

    onStateChange(updated);
    localStorage.setItem('saluscare_shared_v1', JSON.stringify(updated));
    triggerToast("Prenotazione completata con successo!", "success");
    setActiveTab('appointments');
    setBookingStep(1);
    setSelectedSpecialty('');
    setSelectedFacility('');
    setSelectedSlot(null);
  };

  // CONFIRM / CANCEL VISITS
  const handleConfirmVisit = (apptId: string) => {
    const updatedState = cancelAppointment(apptId, '', ''); // We need custom update
    const stateCopy = readSharedState();
    const index = stateCopy.appointments.findIndex(a => a.appointment_id === apptId);
    if (index !== -1) {
      stateCopy.appointments[index].confirmation_status = 'confirmed';
      stateCopy.appointments[index].status = 'confirmed';
      stateCopy.appointments[index].confirmation_channel = 'WhatsApp';
      stateCopy.appointments[index].confirmation_timestamp = new Date().toISOString();
      
      // logs
      stateCopy.eventLog = [{
        event_id: `evt_conf_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'APPOINTMENT_CONFIRMED',
        message: `Paziente ha confermato la presenza per l'appuntamento ${apptId}`,
        payload: { appointment_id: apptId }
      }, ...stateCopy.eventLog];

      stateCopy.auditLog = [{
        log_id: `aud_conf_${Date.now()}`,
        timestamp: new Date().toISOString(),
        user_role: 'Paziente',
        action: 'CONFIRM_APPOINTMENT',
        object_type: 'APPOINTMENT',
        object_id: apptId,
        previous_state: 'pending',
        new_state: 'confirmed',
        reason: 'Conferma presenza autonoma pre-visita'
      }, ...stateCopy.auditLog];

      onStateChange(stateCopy);
      saveSharedState(stateCopy);
      triggerToast("Appuntamento confermato con successo!", "success");
    }
  };

  const handleCancelClick = (appt: Appointment) => {
    setCancelModalAppt(appt);
  };

  const handleCancelSubmit = () => {
    if (!cancelModalAppt) return;
    const newState = cancelAppointment(cancelModalAppt.appointment_id, cancelReason, 'Paziente');
    onStateChange(newState);
    setCancelModalAppt(null);
    triggerToast("Visita annullata. Lo slot è stato liberato per altri pazienti.", "warning");
  };

  // RESCHEDULE REQUEST
  const handleRescheduleClick = (appt: Appointment) => {
    setRescheduleModalAppt(appt);
    setSelectedReschedSlotId('');
  };

  const handleRescheduleSubmit = () => {
    if (!rescheduleModalAppt || !selectedReschedSlotId) return;
    const newState = rescheduleAppointment(rescheduleModalAppt.appointment_id, selectedReschedSlotId, 'Paziente');
    onStateChange(newState);
    setRescheduleModalAppt(null);
    triggerToast("Appuntamento riprogrammato con successo!", "success");
  };

  // ACCEPT SLOT PROPOSAL
  const handleAcceptProposal = () => {
    if (!activeProposal) return;
    const newState = acceptSlotAdvance(activeProposal.proposal_id, 'Paziente');
    onStateChange(newState);
    triggerToast("Anticipo slot accettato! La tua agenda è stata aggiornata.", "success");
  };

  const handleRejectProposal = () => {
    if (!activeProposal) return;
    const uState = readSharedState();
    const idx = uState.slotProposals.findIndex(p => p.proposal_id === activeProposal.proposal_id);
    if (idx !== -1) {
      uState.slotProposals[idx].status = 'declined';
      
      uState.eventLog = [{
        event_id: `evt_rej_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'SLOT_ADVANCE_DECLINED',
        message: `Paziente ha rifiutato la proposta di anticipo ${activeProposal.proposal_id}`,
        payload: { proposal_id: activeProposal.proposal_id }
      }, ...uState.eventLog];

      uState.auditLog = [{
        log_id: `aud_rej_${Date.now()}`,
        timestamp: new Date().toISOString(),
        user_role: 'Paziente',
        action: 'REJECT_SLOT_PROPOSAL',
        object_type: 'SLOT_PROPOSAL',
        object_id: activeProposal.proposal_id,
        previous_state: 'proposed',
        new_state: 'declined',
        reason: 'Rifiuto proposta di anticipo'
      }, ...uState.auditLog];

      // delete/archive notification
      onStateChange(uState);
      saveSharedState(uState);
      triggerToast("Proposta rifiutata. L'appuntamento rimane invariato.", "info");
    }
  };

  // SUBMIT POST-VISIT FEEDBACK
  const handleFeedbackSubmit = () => {
    if (!feedbackAppt) return;
    const uState = readSharedState();
    
    const feedbackId = `feed_${Date.now().toString().slice(-6)}`;
    const fbk: Feedback = {
      feedback_id: feedbackId,
      patient_id: activePatient.patient_id,
      appointment_id: feedbackAppt.appointment_id,
      score: feedbackRating,
      has_complaint: feedbackComplaint,
      category: feedbackComplaint ? 'Medico/personale' : undefined,
      root_cause: feedbackComplaint ? feedbackComment : undefined,
      comment: feedbackComment,
      callback_requested: feedbackCallback,
      created_at: new Date().toISOString()
    };

    uState.feedback = [fbk, ...uState.feedback];

    uState.eventLog = [{
      event_id: `evt_fb_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'FEEDBACK_SUBMITTED',
      message: `Paziente ${activePatient.name} ha inserito un feedback con punteggio ${feedbackRating}/5 per la visita di ${feedbackAppt.specialty}`,
      payload: { feedback_id: feedbackId }
    }, ...uState.eventLog];

    // If callback is requested OR feedback rating is low and they want recovery, open a customer care ticket
    if (feedbackCallback || feedbackRating <= 3) {
      const ticketId = `tick_${uState.tickets.length + 1}`;
      const newTicket: Ticket = {
        ticket_id: ticketId,
        patient_id: activePatient.patient_id,
        appointment_id: feedbackAppt.appointment_id,
        episode_id: feedbackAppt.episode_id,
        category: 'Medico/personale',
        root_cause: `Feedback negativo (${feedbackRating}/5): ${feedbackComment}`,
        severity: feedbackRating === 1 ? 'High' : 'Medium',
        owner: 'Non assegnato',
        sla_due_date: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split('T')[0],
        status: 'open',
        escalation: feedbackRating === 1,
        created_at: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString().split('T')[0],
        notes: [`Ticket generato automaticamente da feedback negativo. callback_requested: ${feedbackCallback}`]
      };
      uState.tickets = [newTicket, ...uState.tickets];
      uState.operatorTasks = [{
        task_id: `tsk_cc_${Date.now()}`,
        type: 'ticket_followup',
        title: `Gestione Dissoddisfazione Paziente: ${ticketId}`,
        description: `Il paziente ${activePatient.name} ha lasciato un feedback di ${feedbackRating}/5. Richiesto contatto telefonico urgente.`,
        status: 'pending',
        assigned_to: 'Non assegnato',
        priority: feedbackRating === 1 ? 'High' : 'Medium',
        linked_id: ticketId,
        created_at: new Date().toISOString()
      }, ...uState.operatorTasks];

      triggerToast("Segnalazione inviata. Verrai ricontattato dall'assistenza clienti.", "warning");
    } else {
      triggerToast("Grazie per il tuo feedback!", "success");
    }

    onStateChange(uState);
    saveSharedState(uState);
    setFeedbackAppt(null);
    setFeedbackComment('');
    setFeedbackComplaint(false);
    setFeedbackCallback(false);
  };

  // REPORT COMPLAINT (Signale report issue)
  const handleReportIssueSubmit = () => {
    if (!selectedReport) return;
    
    const payload = {
      patient_id: activePatient.patient_id,
      appointment_id: selectedReport.appointment_id,
      episode_id: selectedReport.episode_id,
      category: 'Referto' as Ticket['category'],
      root_cause: `Problema referto (${reportIssueType}): ${reportIssueComment}`,
      severity: 'Medium' as Ticket['severity'],
      sla_due_date: "2026-07-13"
    };

    const newState = createTicket(payload);
    onStateChange(newState);
    setSelectedReport(null);
    setReportIssueComment('');
    triggerToast("Segnalazione inviata con successo. Il reparto referti la prenderà in carico.", "success");
  };

  // BILLING DISPUTE
  const handleInvoiceDisputeSubmit = () => {
    if (!selectedInvoice) return;

    const payload = {
      patient_id: activePatient.patient_id,
      appointment_id: selectedInvoice.appointment_id,
      episode_id: selectedInvoice.episode_id,
      category: 'Pagamento' as Ticket['category'],
      root_cause: `Contestazione fattura (${invoiceDisputeType}): ${invoiceDisputeComment}`,
      severity: 'Medium' as Ticket['severity'],
      sla_due_date: "2026-07-13"
    };

    const newState = createTicket(payload);
    // Mark invoice disputed
    const uState = readSharedState();
    const invIdx = uState.invoices.findIndex(i => i.invoice_id === selectedInvoice.invoice_id);
    if (invIdx !== -1) {
      uState.invoices[invIdx].status = 'disputed';
    }
    onStateChange(uState);
    saveSharedState(uState);
    
    setSelectedInvoice(null);
    setInvoiceDisputeComment('');
    triggerToast("Contestazione registrata. Il reparto amministrativo verificherà l'importo.", "warning");
  };

  // PAY INVOICE ONLINE
  const handlePayInvoice = (invoiceId: string) => {
    const stateCopy = readSharedState();
    const index = stateCopy.invoices.findIndex(i => i.invoice_id === invoiceId);
    if (index !== -1) {
      stateCopy.invoices[index].status = 'paid';
      
      stateCopy.eventLog = [{
        event_id: `evt_pay_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'INVOICE_PAID',
        message: `Paziente ha pagato la fattura ${invoiceId} per l'importo di €${stateCopy.invoices[index].amount}`,
        payload: { invoice_id: invoiceId }
      }, ...stateCopy.eventLog];

      stateCopy.auditLog = [{
        log_id: `aud_pay_${Date.now()}`,
        timestamp: new Date().toISOString(),
        user_role: 'Paziente',
        action: 'PAY_INVOICE',
        object_type: 'INVOICE',
        object_id: invoiceId,
        previous_state: 'unpaid',
        new_state: 'paid',
        reason: 'Pagamento elettronico online via app portale'
      }, ...stateCopy.auditLog];

      // notifications
      stateCopy.notifications = [{
        notification_id: `notif_p_${Date.now()}`,
        patient_id: activePatient.patient_id,
        message: `Pagamento di €${stateCopy.invoices[index].amount} per la fattura ${invoiceId} registrato con successo.`,
        type: 'success',
        read: false,
        created_at: new Date().toISOString()
      }, ...stateCopy.notifications];

      onStateChange(stateCopy);
      saveSharedState(stateCopy);
      triggerToast("Pagamento completato online!", "success");
    }
  };

  // SUBMIT GENERAL TICKET VIA HELP
  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketDesc) return;

    const payload = {
      patient_id: activePatient.patient_id,
      appointment_id: ticketRelAppt || undefined,
      category: ticketCategory,
      root_cause: ticketDesc,
      severity: 'Medium' as Ticket['severity'],
      sla_due_date: "2026-07-13"
    };

    const newState = createTicket(payload);
    onStateChange(newState);
    setTicketDesc('');
    setTicketRelAppt('');
    triggerToast("Richiesta di assistenza inviata!", "success");
  };

  return (
    <div id="patient-portal-container" className="bg-slate-50 min-h-screen pb-16 font-sans">
      
      {/* Target Persona Selector Card for Demo */}
      <div className="bg-cyan-900 text-white py-4 px-4 shadow-inner border-b border-cyan-800">
        <div className="max-w-md mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <UserCheck className="h-5 w-5 text-cyan-300" />
            <div>
              <p className="text-xs text-cyan-200 uppercase tracking-wider font-bold">Simula Persona Paziente:</p>
              <p className="text-[11px] text-cyan-100 italic">Ogni persona ha dati, storici e comportamenti diversi.</p>
            </div>
          </div>
          <select
            id="demo-patient-selector"
            value={selectedPatientId}
            onChange={handlePatientChange}
            className="bg-cyan-950 text-white border border-cyan-700 rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-cyan-400 focus:outline-none w-full sm:w-auto"
          >
            {state.patients.map(p => (
              <option key={p.patient_id} value={p.patient_id}>
                {p.name} ({p.digital_engagement_level === 'High' ? 'Digital Evolution' : p.digital_engagement_level === 'Low' ? 'Low Digital' : 'Standard'})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="max-w-md mx-auto bg-white min-h-[750px] shadow-2xl relative border-x border-slate-200">
        
        {/* App Title Header */}
        <div className="bg-gradient-to-r from-cyan-600 to-cyan-500 text-white px-5 py-4 flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-2">
            <Smartphone className="h-5 w-5" />
            <h2 className="text-base font-bold">SalusCare App Paziente</h2>
          </div>
          <div className="flex items-center space-x-1.5 text-xs bg-cyan-700/50 px-2 py-1 rounded-full text-cyan-50">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[10px] font-mono">Area Riservata</span>
          </div>
        </div>

        {/* --- DYNAMIC SLOT PROPOSAL / RECOVERY ALERT --- */}
        {activeProposal && proposedSlot && proposedAppt && (
          <div className="m-4 p-4 bg-amber-50 border border-amber-300 rounded-xl shadow-md animate-bounce">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="inline-block px-2 py-0.5 bg-amber-200 text-amber-800 text-[9px] font-bold uppercase rounded mb-1">
                  Proposta Recupero Slot Anticipato
                </span>
                <p className="text-xs font-bold text-slate-900">Si è liberato un appuntamento anticipato!</p>
                
                <div className="mt-2 text-xs text-slate-600 space-y-1 bg-white p-2.5 rounded-lg border border-amber-100">
                  <p><strong>Visita Attuale:</strong> {proposedAppt.specialty} il {proposedAppt.scheduled_date} ore {proposedAppt.scheduled_time}</p>
                  <p className="text-emerald-600 font-semibold flex items-center gap-1">
                    <ArrowRight className="h-3 w-3" />
                    <strong>Nuova Proposta:</strong> {proposedSlot.date} ore {proposedSlot.start_time}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">Sede: {proposedSlot.facility_name}</p>
                </div>

                <div className="mt-3 flex items-center space-x-2">
                  <button
                    id="btn-accept-proposal"
                    onClick={handleAcceptProposal}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1"
                  >
                    <Check className="h-3 w-3" /> Accetto
                  </button>
                  <button
                    id="btn-reject-proposal"
                    onClick={handleRejectProposal}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
                  >
                    Rifiuto
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- RENDER TAB VIEW --- */}
        <div className="p-4 pb-24">

          {/* TAB 1: HOME */}
          {activeTab === 'home' && (
            <div className="space-y-5 animate-fade-in">
              
              {/* Welcome Card */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
                <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4">
                  <Home className="h-32 w-32" />
                </div>
                <p className="text-xs text-cyan-400 font-semibold uppercase tracking-wider">Benvenuto nel portale,</p>
                <h3 className="text-lg font-bold mt-1">{activePatient.name}</h3>
                <div className="mt-3 flex items-center space-x-4 text-xs text-slate-300">
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">Consenso Canale</span>
                    <span className="text-cyan-300 font-semibold">{activePatient.preferred_channel}</span>
                  </div>
                  <div className="border-l border-slate-700 pl-4">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">Livello Digitale</span>
                    <span className="text-slate-100 font-semibold">{activePatient.digital_engagement_level}</span>
                  </div>
                </div>
              </div>

              {/* Next Appointment Section */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">Prossima Visita Programmata</h4>
                {patientAppointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length === 0 ? (
                  <div className="bg-slate-100 border border-slate-200 rounded-xl p-6 text-center">
                    <Calendar className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs text-slate-600 font-medium">Nessuna visita programmata al momento.</p>
                    <button
                      onClick={() => setActiveTab('book')}
                      className="mt-3 inline-flex items-center space-x-1 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md"
                    >
                      <span>Prenota ora</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  patientAppointments
                    .filter(a => a.status === 'scheduled' || a.status === 'confirmed')
                    .slice(0, 1)
                    .map(appt => (
                      <div key={appt.appointment_id} className="bg-white border border-slate-200 hover:border-cyan-300 rounded-xl p-4 shadow-sm transition-all">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              appt.clinical_priority === 'Critical' ? 'bg-red-100 text-red-800' :
                              appt.clinical_priority === 'High' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              Priorità: {appt.clinical_priority}
                            </span>
                            <h5 className="text-sm font-bold text-slate-900 mt-1">{appt.service_type}</h5>
                            <p className="text-xs text-slate-500 mt-0.5">{appt.doctor_name} • {appt.specialty}</p>
                          </div>
                          
                          {/* Confirmation status indicator badge */}
                          {appt.confirmation_status === 'pending' ? (
                            <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <span className="h-1.5 w-1.5 bg-amber-500 rounded-full animate-ping"></span>
                              Da confermare
                            </span>
                          ) : (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                              <Check className="h-3 w-3" />
                              Confermato
                            </span>
                          )}
                        </div>

                        {/* Date and Place */}
                        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-600">
                          <div className="flex items-center space-x-1.5">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            <span>{appt.scheduled_date} ore {appt.scheduled_time}</span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 truncate" />
                            <span className="truncate" title={appt.facility_name}>{appt.facility_name}</span>
                          </div>
                        </div>

                        {/* Interactive Buttons */}
                        <div className="mt-4 flex items-center space-x-2 pt-2 border-t border-slate-50">
                          {appt.confirmation_status === 'pending' && (
                            <button
                              id={`btn-confirm-appt-${appt.appointment_id}`}
                              onClick={() => handleConfirmVisit(appt.appointment_id)}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1 shadow-sm"
                            >
                              <Check className="h-3.5 w-3.5" /> Conferma Presenza
                            </button>
                          )}
                          <button
                            id={`btn-resched-appt-${appt.appointment_id}`}
                            onClick={() => handleRescheduleClick(appt)}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-1.5 px-3 rounded-lg border border-slate-200"
                          >
                            Riprogramma
                          </button>
                          <button
                            id={`btn-cancel-appt-${appt.appointment_id}`}
                            onClick={() => handleCancelClick(appt)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold py-1.5 px-3 rounded-lg border border-red-100"
                          >
                            Annulla
                          </button>
                        </div>

                      </div>
                    ))
                )}
              </div>

              {/* Unpaid Bills Section */}
              {patientInvoices.filter(i => i.status === 'unpaid').length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <CreditCard className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-red-950">Fattura da saldare</p>
                      <p className="text-xs text-red-800 mt-0.5">Hai una prestazione in sospeso di €{patientInvoices.filter(i => i.status === 'unpaid')[0].amount}.</p>
                      <button
                        onClick={() => setActiveTab('billing')}
                        className="mt-2.5 inline-flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm"
                      >
                        Paga Ora
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Post-Visit Surveys (for completed visits without feedback) */}
              {patientAppointments.filter(a => a.status === 'completed' && !state.feedback.some(f => f.appointment_id === a.appointment_id)).length > 0 && (
                <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <MessageSquare className="h-5 w-5 text-cyan-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-cyan-950">Com'è andata la visita?</p>
                      <p className="text-xs text-cyan-800 mt-0.5">La tua opinione ci aiuta a migliorare. Lascia un feedback veloce per la tua ultima visita.</p>
                      <button
                        onClick={() => {
                          const apptComp = patientAppointments.filter(a => a.status === 'completed' && !state.feedback.some(f => f.appointment_id === a.appointment_id))[0];
                          setFeedbackAppt(apptComp);
                        }}
                        className="mt-2.5 inline-flex items-center gap-1 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm"
                      >
                        Valuta Visita
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Actions Grid */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">Azioni Rapide</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => { setActiveTab('book'); setBookingStep(1); }}
                    className="flex flex-col items-start p-3 bg-white border border-slate-200 hover:border-cyan-400 rounded-xl shadow-sm text-left transition-all"
                  >
                    <Calendar className="h-5 w-5 text-cyan-600 mb-2" />
                    <span className="text-xs font-bold text-slate-900">Prenota Visita</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">Scegli slot e medico</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('reports')}
                    className="flex flex-col items-start p-3 bg-white border border-slate-200 hover:border-cyan-400 rounded-xl shadow-sm text-left transition-all"
                  >
                    <FileText className="h-5 w-5 text-emerald-600 mb-2" />
                    <span className="text-xs font-bold text-slate-900">Referti Digitali</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">Leggi ed esporta</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('billing')}
                    className="flex flex-col items-start p-3 bg-white border border-slate-200 hover:border-cyan-400 rounded-xl shadow-sm text-left transition-all"
                  >
                    <CreditCard className="h-5 w-5 text-amber-600 mb-2" />
                    <span className="text-xs font-bold text-slate-900">Ricevute & Pagamenti</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">Saldati e storici</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('support')}
                    className="flex flex-col items-start p-3 bg-white border border-slate-200 hover:border-cyan-400 rounded-xl shadow-sm text-left transition-all"
                  >
                    <HelpCircle className="h-5 w-5 text-purple-600 mb-2" />
                    <span className="text-xs font-bold text-slate-900">Assistenza & Reclami</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">Segnala disservizi</span>
                  </button>
                </div>
              </div>

              {/* Recent Notifications */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Notifiche Recenti</h4>
                <div className="space-y-2 bg-white border border-slate-200 rounded-xl p-3 shadow-sm max-h-48 overflow-y-auto">
                  {patientNotifications.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">Nessuna notifica recente.</p>
                  ) : (
                    patientNotifications.slice(0, 5).map(notif => (
                      <div key={notif.notification_id} className="flex space-x-2.5 p-2 rounded-lg bg-slate-50 border-l-2 border-cyan-500 text-xs">
                        <div className="flex-1">
                          <p className="text-slate-700 font-medium">{notif.message}</p>
                          <span className="text-[9px] text-slate-400 block mt-0.5">{new Date(notif.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: BOOK / WIZARD PRENOTAZIONE */}
          {activeTab === 'book' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex justify-between items-center bg-cyan-50 p-3 rounded-lg border border-cyan-100">
                <h3 className="text-sm font-bold text-cyan-900">Prenota una nuova prestazione</h3>
                <span className="text-xs font-mono bg-cyan-200 px-2 py-0.5 rounded text-cyan-800">Passo {bookingStep} di 5</span>
              </div>

              {/* STEP 1: Specialità */}
              {bookingStep === 1 && (
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase">Seleziona Specialità Clinica:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {specialties.map(spec => (
                      <button
                        key={spec}
                        id={`btn-spec-${spec.toLowerCase()}`}
                        onClick={() => { setSelectedSpecialty(spec); setBookingStep(2); }}
                        className={`p-3 text-left border rounded-xl text-xs font-semibold transition-all ${
                          selectedSpecialty === spec 
                            ? 'bg-cyan-600 border-cyan-600 text-white shadow-md' 
                            : 'bg-white border-slate-200 hover:border-cyan-400 text-slate-700'
                        }`}
                      >
                        {spec}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 2: Sede */}
              {bookingStep === 2 && (
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase">Seleziona la Sede SalusCare:</label>
                  <div className="space-y-2">
                    {facilities.map(fac => (
                      <button
                        key={fac.id}
                        id={`btn-facility-${fac.id}`}
                        onClick={() => { setSelectedFacility(fac.id); setBookingStep(3); }}
                        className="w-full p-4 text-left border rounded-xl text-xs font-bold flex justify-between items-center bg-white border-slate-200 hover:border-cyan-400 text-slate-800 transition-all"
                      >
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-cyan-600" />
                          <span>{fac.name}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setBookingStep(1)}
                    className="text-xs font-semibold text-cyan-600 flex items-center gap-1 mt-2 hover:underline"
                  >
                    Indietro
                  </button>
                </div>
              )}

              {/* STEP 3: Primo Disponibile o Medico */}
              {bookingStep === 3 && (
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase">Seleziona Medico o Operatore:</label>
                  <div className="space-y-2">
                    <button
                      id="btn-doc-any"
                      onClick={() => { setSelectedDoctor('doc_any'); setBookingStep(4); }}
                      className="w-full p-4 text-left border rounded-xl text-xs font-bold bg-white border-slate-200 hover:border-cyan-400 text-slate-800 flex justify-between items-center"
                    >
                      <div className="flex items-center space-x-2.5">
                        <User className="h-5 w-5 text-cyan-600 bg-cyan-50 p-1 rounded-full" />
                        <div>
                          <p>Primo Medico Disponibile</p>
                          <p className="text-[10px] text-slate-500 font-normal">Ottimizza i tempi di attesa per l'esame.</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </button>

                    <button
                      id="btn-doc-specialist"
                      onClick={() => { setSelectedDoctor(`doc_${selectedSpecialty.toLowerCase()}`); setBookingStep(4); }}
                      className="w-full p-4 text-left border rounded-xl text-xs font-bold bg-white border-slate-200 hover:border-cyan-400 text-slate-800 flex justify-between items-center"
                    >
                      <div className="flex items-center space-x-2.5">
                        <User className="h-5 w-5 text-indigo-600 bg-indigo-50 p-1 rounded-full" />
                        <div>
                          <p>Specialista Responsabile Reparto</p>
                          <p className="text-[10px] text-slate-500 font-normal">Visita pianificata con lo specialista senior della sede.</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </button>
                  </div>
                  
                  <button
                    onClick={() => setBookingStep(2)}
                    className="text-xs font-semibold text-cyan-600 flex items-center gap-1 mt-2 hover:underline"
                  >
                    Indietro
                  </button>
                </div>
              )}

              {/* STEP 4: Slot di tempo */}
              {bookingStep === 4 && (
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase">Seleziona uno Slot d'Orario:</label>
                  
                  {filteredSlots.length === 0 ? (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-center">
                      <AlertCircle className="h-6 w-6 text-amber-600 mx-auto mb-1" />
                      <p className="text-xs font-semibold text-slate-800">Saturazione slot rilevata</p>
                      <p className="text-[11px] text-slate-600 mt-1">Non ci sono slot disponibili al momento per questa combinazione. Puoi tornare indietro e provare un'altra sede o specialità, oppure richiedere di essere inserito in lista d'attesa.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                      {filteredSlots.map(slot => (
                        <button
                          key={slot.slot_id}
                          id={`btn-select-slot-${slot.slot_id}`}
                          onClick={() => { setSelectedSlot(slot); setBookingStep(5); }}
                          className={`p-3 text-center border rounded-xl text-xs font-bold transition-all ${
                            selectedSlot?.slot_id === slot.slot_id
                              ? 'bg-cyan-600 border-cyan-600 text-white shadow-md'
                              : 'bg-white border-slate-200 hover:border-cyan-400 text-slate-700'
                          }`}
                        >
                          <p className="text-[10px] text-slate-400 font-mono font-medium">{slot.date}</p>
                          <p className="text-sm mt-0.5">{slot.start_time}</p>
                          <p className="text-[9px] text-slate-500 font-normal mt-1 truncate">{slot.room_id}</p>
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => setBookingStep(3)}
                    className="text-xs font-semibold text-cyan-600 flex items-center gap-1 mt-2 hover:underline"
                  >
                    Indietro
                  </button>
                </div>
              )}

              {/* STEP 5: Riepilogo e Conferma */}
              {bookingStep === 5 && selectedSlot && (
                <div className="space-y-4 bg-white border border-slate-200 p-4 rounded-xl shadow-inner">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Verifica Dati Prenotazione</h4>
                  
                  <div className="space-y-2.5 text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-150">
                    <p><strong>Paziente:</strong> {activePatient.name}</p>
                    <p><strong>Specialità:</strong> {selectedSpecialty}</p>
                    <p><strong>Sede:</strong> {facilities.find(f => f.id === selectedFacility)?.name}</p>
                    <p><strong>Orario:</strong> {selectedSlot.date} alle {selectedSlot.start_time}</p>
                    <p><strong>Costo Stimato:</strong> {selectedSpecialty === 'Radiologia' ? '€180,00' : '€120,00'}</p>
                    {selectedSpecialty === 'Radiologia' && (
                      <p className="text-amber-700 bg-amber-50 p-2 rounded border border-amber-100 text-[10px]">
                        <strong>Preparazione Richiesta:</strong> Digiuno completo almeno 6 ore prima dell'esame clinico.
                      </p>
                    )}
                  </div>

                  <div className="pt-2 flex items-center space-x-2">
                    <button
                      id="btn-confirm-booking"
                      onClick={handleBookingSubmit}
                      className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold py-2.5 rounded-lg shadow-md flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Conferma Prenotazione
                    </button>
                    <button
                      onClick={() => setBookingStep(4)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold py-2.5 px-3 rounded-lg border border-slate-200"
                    >
                      Indietro
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 3: APPOINTMENTS */}
          {activeTab === 'appointments' && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-sm font-bold text-slate-800">I Miei Appuntamenti</h3>
              
              {patientAppointments.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-10 bg-white border border-slate-200 rounded-xl">Nessun appuntamento in archivio.</p>
              ) : (
                <div className="space-y-3">
                  {patientAppointments.map(appt => (
                    <div key={appt.appointment_id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative">
                      
                      {/* Top status indicator bar */}
                      <div className="flex justify-between items-center border-b border-slate-50 pb-2 mb-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          appt.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                          appt.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          appt.status === 'no-show' ? 'bg-slate-100 text-slate-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          Stato: {appt.status === 'no-show' ? 'No-Show' : appt.status.toUpperCase()}
                        </span>
                        
                        <span className="text-[10px] text-slate-400 font-mono">ID: {appt.appointment_id}</span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900">{appt.service_type}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{appt.doctor_name} • {appt.specialty}</p>

                      <div className="mt-2.5 space-y-1 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg">
                        <div className="flex items-center space-x-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span>{appt.scheduled_date} ore {appt.scheduled_time}</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 truncate" />
                          <span className="truncate">{appt.facility_name}</span>
                        </div>
                      </div>

                      {/* Display cancel reason if cancelled */}
                      {appt.status === 'cancelled' && appt.cancellation_reason && (
                        <p className="text-[10px] text-red-700 bg-red-50 border border-red-100 p-2 rounded mt-2">
                          <strong>Annullato:</strong> {appt.cancellation_reason}
                        </p>
                      )}

                      {/* Interactive Buttons per-appointment status */}
                      {(appt.status === 'scheduled' || appt.status === 'confirmed') && (
                        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center space-x-2">
                          {appt.confirmation_status === 'pending' && (
                            <button
                              onClick={() => handleConfirmVisit(appt.appointment_id)}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold py-1 px-2.5 rounded-lg flex items-center justify-center gap-0.5"
                            >
                              <Check className="h-3.5 w-3.5" /> Conferma Presenza
                            </button>
                          )}
                          <button
                            onClick={() => handleRescheduleClick(appt)}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold py-1 px-2.5 rounded-lg border border-slate-200 text-center"
                          >
                            Riprogramma
                          </button>
                          <button
                            onClick={() => handleCancelClick(appt)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 text-[11px] font-semibold py-1 px-2.5 rounded-lg border border-red-100"
                          >
                            Annulla
                          </button>
                        </div>
                      )}

                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: REPORTS / REFERTI */}
          {activeTab === 'reports' && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-sm font-bold text-slate-800">I Miei Referti Clinici</h3>
              <p className="text-xs text-slate-500">I referti sono firmati digitalmente dai medici convalidatori e pubblicati sul fascicolo sanitario.</p>

              {patientReports.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-10 bg-white border border-slate-200 rounded-xl">Nessun referto disponibile nel fascicolo.</p>
              ) : (
                <div className="space-y-3">
                  {patientReports.map(rep => {
                    const linkedVisit = state.appointments.find(a => a.appointment_id === rep.appointment_id);
                    return (
                      <div key={rep.report_id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                        <div className="flex justify-between items-start mb-2 pb-2 border-b border-slate-50">
                          <div>
                            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                              Disponibile • Convalidato
                            </span>
                            <h4 className="text-xs font-bold text-slate-900 mt-1">{linkedVisit?.service_type || "Esame Clinico"}</h4>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">N° {rep.report_id}</span>
                        </div>

                        <div className="space-y-1 text-xs text-slate-600 mb-3 bg-slate-50 p-2 rounded">
                          <p><strong>Data Esame:</strong> {linkedVisit?.scheduled_date || "N.D."}</p>
                          <p><strong>Reparto:</strong> {linkedVisit?.specialty} - {linkedVisit?.facility_name}</p>
                          <p className="text-[10px] text-slate-400">Firmato digitalmente il: {rep.report_validated_timestamp ? new Date(rep.report_validated_timestamp).toLocaleString() : "N.D."}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2 pt-2 border-t border-slate-50">
                          <button
                            id={`btn-view-report-${rep.report_id}`}
                            onClick={() => setSelectedReport(rep)}
                            className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1"
                          >
                            <FileDigit className="h-3.5 w-3.5" /> Visualizza Referto
                          </button>
                          <button
                            onClick={() => triggerToast(`File PDF mock generato e scaricato per referto ${rep.report_id}`, "success")}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-1.5 px-3 rounded-lg border border-slate-200 flex items-center gap-1"
                          >
                            <Download className="h-3.5 w-3.5" /> Scarica
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: BILLING / PAGAMENTI */}
          {activeTab === 'billing' && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-sm font-bold text-slate-800">Fatture e Pagamenti</h3>
              
              {patientInvoices.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-10 bg-white border border-slate-200 rounded-xl">Nessuna fattura registrata.</p>
              ) : (
                <div className="space-y-3">
                  {patientInvoices.map(inv => {
                    const linkedVisit = state.appointments.find(a => a.appointment_id === inv.appointment_id);
                    return (
                      <div key={inv.invoice_id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                        <div className="flex justify-between items-start mb-2 pb-2 border-b border-slate-50">
                          <div>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              inv.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                              inv.status === 'unpaid' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {inv.status === 'paid' ? 'Pagata' : inv.status === 'unpaid' ? 'In Attesa' : 'Contestata'}
                            </span>
                            <h4 className="text-xs font-bold text-slate-900 mt-1">{linkedVisit?.service_type || "Prestazione Sanitaria"}</h4>
                          </div>
                          <p className="text-sm font-mono font-bold text-slate-900">€{inv.amount.toFixed(2)}</p>
                        </div>

                        <div className="space-y-1 text-xs text-slate-600 bg-slate-50 p-2 rounded mb-3">
                          <p><strong>Fattura N°:</strong> {inv.invoice_id}</p>
                          <p><strong>Regime:</strong> {inv.payer_type} ({inv.payer_type === 'Insurance' ? 'Rimborso Assicurativo' : inv.payer_type === 'SSN' ? 'Ticket Sanitario' : 'Tariffa Privata'})</p>
                          <p><strong>Data Visita:</strong> {linkedVisit?.scheduled_date || "N.D."}</p>
                          {inv.claim_rejection_flag && (
                            <p className="text-red-700 bg-red-50 p-1.5 rounded text-[10px] border border-red-100 font-semibold">
                              ⚠️ Rimborso assicurazione respinto.
                            </p>
                          )}
                        </div>

                        {/* Invoice payment actions */}
                        <div className="flex items-center space-x-2 pt-2 border-t border-slate-50">
                          {inv.status === 'unpaid' && (
                            <button
                              id={`btn-pay-invoice-${inv.invoice_id}`}
                              onClick={() => handlePayInvoice(inv.invoice_id)}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow-sm"
                            >
                              Paga Ora (€{inv.amount.toFixed(2)})
                            </button>
                          )}
                          {inv.status !== 'disputed' && (
                            <button
                              id={`btn-dispute-invoice-${inv.invoice_id}`}
                              onClick={() => setSelectedInvoice(inv)}
                              className="text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold py-1.5 px-3 rounded-lg"
                            >
                              Contesta Importo
                            </button>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: SUPPORT / ASSISTENZA & RECLAMI */}
          {activeTab === 'support' && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-sm font-bold text-slate-800">Assistenza & Reclami</h3>
              <p className="text-xs text-slate-500">Apri una richiesta di chiarimento amministrativo o segnala un disservizio. Un operatore prenderà in carico la richiesta.</p>

              {/* Support Form */}
              <form onSubmit={handleSupportSubmit} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase">Nuova Segnalazione</h4>
                
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase">Categoria:</label>
                  <select
                    id="support-category"
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value as Ticket['category'])}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                  >
                    <option value="Medico/personale">Medico o Personale Sanitario</option>
                    <option value="Attesa">Tempi d'attesa elevati</option>
                    <option value="Referto">Problema Referto o Documentazione</option>
                    <option value="Pagamento">Problema Pagamento o Assicurazione</option>
                    <option value="App/Portale">Problemi tecnici applicazione</option>
                    <option value="Altro">Altra segnalazione</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase">Riguarda una visita recente?</label>
                  <select
                    id="support-linked-appt"
                    value={ticketRelAppt}
                    onChange={(e) => setTicketRelAppt(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                  >
                    <option value="">Seleziona visita (opzionale)</option>
                    {patientAppointments.slice(0, 5).map(a => (
                      <option key={a.appointment_id} value={a.appointment_id}>
                        {a.service_type} ({a.scheduled_date})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase">Descrizione Dettagliata:</label>
                  <textarea
                    id="support-description"
                    value={ticketDesc}
                    onChange={(e) => setTicketDesc(e.target.value)}
                    placeholder="Fornisci quanti più dettagli possibili per aiutarci a risolvere..."
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                    required
                  ></textarea>
                </div>

                <button
                  id="btn-submit-support"
                  type="submit"
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs py-2 rounded-lg shadow transition-all flex items-center justify-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" /> Invia Segnalazione
                </button>
              </form>

              {/* Existing Tickets List */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Le tue segnalazioni attive</h4>
                {patientTickets.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6 bg-white border border-slate-200 rounded-xl">Nessuna segnalazione aperta.</p>
                ) : (
                  patientTickets.map(ticket => (
                    <div key={ticket.ticket_id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm text-xs">
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            ticket.status === 'open' ? 'bg-red-100 text-red-800' :
                            ticket.status === 'in_progress' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {ticket.status === 'open' ? 'Aperto' : ticket.status === 'in_progress' ? 'In Lavorazione' : 'Risolto'}
                          </span>
                          <span className="font-bold text-slate-800 ml-2">{ticket.category}</span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400">{ticket.ticket_id}</span>
                      </div>

                      <p className="text-slate-600 mt-1">{ticket.root_cause}</p>

                      {/* Display operator responses */}
                      {ticket.notes && ticket.notes.length > 1 && (
                        <div className="mt-2.5 bg-slate-50 p-2 rounded border border-slate-100 text-[11px] text-slate-700">
                          <p className="font-bold text-indigo-700 mb-0.5">Aggiornamento Clinica:</p>
                          <p className="italic">"{ticket.notes[ticket.notes.length - 1]}"</p>
                        </div>
                      )}

                      <p className="text-[10px] text-slate-400 mt-1.5 text-right">Ultimo aggiornamento: {ticket.updated_at}</p>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}

          {/* TAB 7: PROFILE / PROFILO */}
          {activeTab === 'profile' && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-sm font-bold text-slate-800">Il Mio Profilo</h3>
              
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
                  <div className="bg-cyan-100 p-2.5 rounded-full text-cyan-700">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{activePatient.name}</h4>
                    <p className="text-xs text-slate-500">Nato il: {activePatient.birth_date}</p>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-600">
                  <p><strong>Email:</strong> {activePatient.email}</p>
                  <p><strong>Telefono:</strong> {activePatient.phone}</p>
                  <p><strong>Canale preferito per comunicazioni:</strong> {activePatient.preferred_channel}</p>
                  <p><strong>Profilo Sanitario:</strong> Assistito Convenzionato SalusCare</p>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg text-[11px] text-slate-500 space-y-1.5 border border-slate-100">
                  <p className="font-bold text-slate-700 uppercase">Data Governance & Privacy (GDPR)</p>
                  <p>I tuoi dati sensibili sanitari sono crittografati in conformità con i protocolli GDPR di SalusCare. Hai concesso l'accesso ai medici refertatori ed ai convalidatori biomedicali.</p>
                  <p className="text-cyan-700 font-bold">Consenso comunicazioni attive: SI</p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* --- PERSISTENT MOBILE BOTTOM NAVIGATION TAB --- */}
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-3 py-2 flex justify-between items-center z-10 shadow-lg">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center flex-1 py-1 ${activeTab === 'home' ? 'text-cyan-600' : 'text-slate-400'}`}
          >
            <Home className="h-5 w-5" />
            <span className="text-[9px] mt-0.5 font-bold">Home</span>
          </button>
          <button
            onClick={() => { setActiveTab('book'); setBookingStep(1); }}
            className={`flex flex-col items-center flex-1 py-1 ${activeTab === 'book' ? 'text-cyan-600' : 'text-slate-400'}`}
          >
            <Calendar className="h-5 w-5" />
            <span className="text-[9px] mt-0.5 font-bold">Prenota</span>
          </button>
          <button
            onClick={() => setActiveTab('appointments')}
            className={`flex flex-col items-center flex-1 py-1 ${activeTab === 'appointments' ? 'text-cyan-600' : 'text-slate-400'}`}
          >
            <Clock className="h-5 w-5" />
            <span className="text-[9px] mt-0.5 font-bold">Visite</span>
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex flex-col items-center flex-1 py-1 ${activeTab === 'reports' ? 'text-cyan-600' : 'text-slate-400'}`}
          >
            <FileText className="h-5 w-5" />
            <span className="text-[9px] mt-0.5 font-bold">Referti</span>
          </button>
          <button
            onClick={() => setActiveTab('billing')}
            className={`flex flex-col items-center flex-1 py-1 ${activeTab === 'billing' ? 'text-cyan-600' : 'text-slate-400'}`}
          >
            <CreditCard className="h-5 w-5" />
            <span className="text-[9px] mt-0.5 font-bold">Conto</span>
          </button>
          <button
            onClick={() => setActiveTab('support')}
            className={`flex flex-col items-center flex-1 py-1 ${activeTab === 'support' ? 'text-cyan-600' : 'text-slate-400'}`}
          >
            <HelpCircle className="h-5 w-5" />
            <span className="text-[9px] mt-0.5 font-bold">Aiuto</span>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center flex-1 py-1 ${activeTab === 'profile' ? 'text-cyan-600' : 'text-slate-400'}`}
          >
            <User className="h-5 w-5" />
            <span className="text-[9px] mt-0.5 font-bold">Profilo</span>
          </button>
        </div>

        {/* --- MODAL DIALOGS --- */}

        {/* 1. CANCEL VISIT MODAL */}
        {cancelModalAppt && (
          <div className="absolute inset-0 bg-black/60 flex items-end sm:items-center justify-center p-4 z-40">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full p-5 max-w-md space-y-4 animate-slide-up shadow-2xl">
              <div className="flex justify-between items-center border-b pb-2">
                <h4 className="text-sm font-bold text-slate-900">Annulla Visita Medica</h4>
                <button onClick={() => setCancelModalAppt(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-xs text-slate-600">
                Sei sicuro di voler annullare la visita di <strong>{cancelModalAppt.service_type}</strong> prevista per il <strong>{cancelModalAppt.scheduled_date}</strong> alle <strong>{cancelModalAppt.scheduled_time}</strong>?
              </p>
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Motivo della cancellazione:</label>
                <select
                  id="cancel-reason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                >
                  <option value="Imprevisto personale">Imprevisto personale o di lavoro</option>
                  <option value="Salute migliorata">Miglioramento dello stato di salute</option>
                  <option value="Visita già effettuata">Esame già eseguito altrove</option>
                  <option value="Costo elevato">Costo tariffa troppo elevato</option>
                  <option value="Difficoltà logistica">Difficoltà logistiche o di trasporto</option>
                </select>
              </div>

              <p className="text-[10px] text-amber-700 bg-amber-50 p-2.5 rounded border border-amber-200">
                ℹ️ Liberando questo slot, permetterai a un paziente in lista d'attesa clinica ad alta priorità di anticipare le proprie cure ospedaliere.
              </p>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  id="btn-confirm-cancel"
                  onClick={handleCancelSubmit}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 rounded-lg"
                >
                  Sì, Annulla Visita
                </button>
                <button
                  onClick={() => setCancelModalAppt(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2 rounded-lg border border-slate-200"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. RESCHEDULE MODAL */}
        {rescheduleModalAppt && (
          <div className="absolute inset-0 bg-black/60 flex items-end sm:items-center justify-center p-4 z-40">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full p-5 max-w-md space-y-4 animate-slide-up shadow-2xl">
              <div className="flex justify-between items-center border-b pb-2">
                <h4 className="text-sm font-bold text-slate-900">Riprogramma Visita</h4>
                <button onClick={() => setRescheduleModalAppt(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <p className="text-xs text-slate-600">
                Scegli una nuova data/ora per la tua visita di <strong>{rescheduleModalAppt.service_type}</strong>:
              </p>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Seleziona uno dei nuovi slot disponibili:</label>
                <select
                  id="reschedule-slot-select"
                  value={selectedReschedSlotId}
                  onChange={(e) => setSelectedReschedSlotId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                >
                  <option value="">Scegli uno slot alternativo...</option>
                  {state.slots
                    .filter(s => s.specialty === rescheduleModalAppt.specialty && s.status === 'available')
                    .map(slot => (
                      <option key={slot.slot_id} value={slot.slot_id}>
                        {slot.date} ore {slot.start_time} - {slot.facility_name} ({slot.room_id})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  id="btn-confirm-reschedule"
                  onClick={handleRescheduleSubmit}
                  disabled={!selectedReschedSlotId}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold py-2 rounded-lg"
                >
                  Conferma Riprogrammazione
                </button>
                <button
                  onClick={() => setRescheduleModalAppt(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2 rounded-lg border"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. VIEW REPORT DETAIL MODAL */}
        {selectedReport && (
          <div className="absolute inset-0 bg-black/60 flex items-end sm:items-center justify-center p-4 z-40">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full p-5 max-w-md space-y-4 animate-slide-up shadow-2xl h-[90%] flex flex-col justify-between">
              
              <div className="space-y-3 overflow-y-auto">
                <div className="flex justify-between items-center border-b pb-2">
                  <div>
                    <h4 className="text-xs text-slate-400 uppercase font-bold">Esame Refertato</h4>
                    <h3 className="text-sm font-bold text-slate-900">{state.appointments.find(a=>a.appointment_id === selectedReport.appointment_id)?.service_type}</h3>
                  </div>
                  <button onClick={() => setSelectedReport(null)} className="text-slate-400 hover:text-slate-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="text-[11px] text-slate-700 space-y-2 bg-slate-50 p-3 rounded-lg font-mono border whitespace-pre-line">
                  {selectedReport.report_text}
                </div>

                {/* Dispute / report issues forms */}
                <div className="border-t pt-3 space-y-2">
                  <h4 className="text-xs font-bold text-red-700 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> Segnala un problema o errore sul referto
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <button
                      onClick={() => setReportIssueType("Referto non chiaro")}
                      className={`p-1.5 border rounded text-center ${reportIssueType === 'Referto non chiaro' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-slate-50'}`}
                    >
                      Testo poco chiaro
                    </button>
                    <button
                      onClick={() => setReportIssueType("Errore dati anagrafici")}
                      className={`p-1.5 border rounded text-center ${reportIssueType === 'Errore dati anagrafici' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-slate-50'}`}
                    >
                      Errore Dati Anagrafici
                    </button>
                  </div>
                  <textarea
                    id="report-issue-comment"
                    value={reportIssueComment}
                    onChange={(e) => setReportIssueComment(e.target.value)}
                    placeholder="In cosa consiste il problema? Es. Mancata indicazione dei parametri..."
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                  ></textarea>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-3 border-t">
                <button
                  id="btn-report-issue-submit"
                  onClick={handleReportIssueSubmit}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 rounded-lg"
                >
                  Invia Segnalazione Errore
                </button>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2 rounded-lg border"
                >
                  Chiudi Referto
                </button>
              </div>

            </div>
          </div>
        )}

        {/* 4. BILLING DISPUTE MODAL */}
        {selectedInvoice && (
          <div className="absolute inset-0 bg-black/60 flex items-end sm:items-center justify-center p-4 z-40">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full p-5 max-w-md space-y-4 animate-slide-up shadow-2xl">
              <div className="flex justify-between items-center border-b pb-2">
                <h4 className="text-sm font-bold text-slate-900">Contesta Importo Ricevuta</h4>
                <button onClick={() => setSelectedInvoice(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-xs text-slate-600">
                Stai aprendo una contestazione per la fattura <strong>{selectedInvoice.invoice_id}</strong> di importo <strong>€{selectedInvoice.amount.toFixed(2)}</strong>.
              </p>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Seleziona Causale:</label>
                <select
                  id="dispute-type"
                  value={invoiceDisputeType}
                  onChange={(e) => setInvoiceDisputeType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="importo non chiaro">L'importo non corrisponde a quanto pattuito</option>
                  <option value="fattura errata">Fattura intestata in modo errato</option>
                  <option value="assicurazione respinta">Rimborso assicurativo o convenzione non calcolato</option>
                  <option value="pagamento gia effettuato">Ho già effettuato il pagamento ma risulta aperto</option>
                  <option value="rimborso">Richiesta rimborso per visita annullata</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Dettagli integrativi:</label>
                <textarea
                  id="dispute-comment"
                  value={invoiceDisputeComment}
                  onChange={(e) => setInvoiceDisputeComment(e.target.value)}
                  placeholder="Inserisci commento o codice di autorizzazione assicurativa..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                ></textarea>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  id="btn-confirm-dispute"
                  onClick={handleInvoiceDisputeSubmit}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 rounded-lg"
                >
                  Invia Contestazione
                </button>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2 rounded-lg border"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 5. SURVEY FEEDBACK DIALOG */}
        {feedbackAppt && (
          <div className="absolute inset-0 bg-black/60 flex items-end sm:items-center justify-center p-4 z-40">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full p-5 max-w-md space-y-4 animate-slide-up shadow-2xl">
              <div className="flex justify-between items-center border-b pb-2">
                <h4 className="text-sm font-bold text-slate-900">Valuta il Servizio SalusCare</h4>
                <button onClick={() => setFeedbackAppt(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-xs text-slate-600">
                La tua opinione è fondamentale. Com'è andata la visita di <strong>{feedbackAppt.service_type}</strong> con il {feedbackAppt.doctor_name}?
              </p>

              {/* Star rating picker */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Voto d'esperienza (1-5 stelle):</label>
                <div className="flex justify-around items-center bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedbackRating(star)}
                      className="text-2xl transition-all hover:scale-125 focus:outline-none"
                    >
                      {star <= feedbackRating ? "⭐" : "☆"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Checkboxes */}
              <div className="space-y-2 text-xs text-slate-700 pt-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={feedbackComplaint}
                    onChange={(e) => setFeedbackComplaint(e.target.checked)}
                    className="rounded text-cyan-600 focus:ring-cyan-500 h-4 w-4"
                  />
                  <span>Ho riscontrato problemi durante la visita (attesa, cortesia...)</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={feedbackCallback}
                    onChange={(e) => setFeedbackCallback(e.target.checked)}
                    className="rounded text-cyan-600 focus:ring-cyan-500 h-4 w-4"
                  />
                  <span>Voglio essere ricontattato dall'assistenza pazienti</span>
                </label>
              </div>

              {/* Text comment */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Commento Libero:</label>
                <textarea
                  id="feedback-comment"
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="Dicci cosa ti è piaciuto o cosa possiamo migliorare..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                ></textarea>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  id="btn-confirm-feedback"
                  onClick={handleFeedbackSubmit}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold py-2 rounded-lg"
                >
                  Invia Valutazione
                </button>
                <button
                  onClick={() => setFeedbackAppt(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2 rounded-lg border"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
