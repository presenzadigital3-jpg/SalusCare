/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SharedState, Appointment, Ticket, Notification, Slot, Report, SlotProposal, OperatorTask, AuditLog, EventLog, MedicalDevice, CyberEvent } from './types';
import { generateInitialData } from './mockData';

const LOCAL_STORAGE_KEY = 'saluscare_shared_v1';

// Read state from localStorage, initialising if empty
export const readSharedState = (): SharedState => {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!data) {
    const initialState = generateInitialData();
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initialState));
    return initialState;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error("Error parsing shared state, resetting to initial data", e);
    const initialState = generateInitialData();
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initialState));
    return initialState;
  }
};

// Save state to localStorage
export const saveSharedState = (state: SharedState): void => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  // Dispatch a global storage event so React components can listen if they are in different components
  window.dispatchEvent(new Event('saluscare_state_updated'));
};

// Reset state
export const resetSharedState = (): SharedState => {
  const initialState = generateInitialData();
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initialState));
  window.dispatchEvent(new Event('saluscare_state_updated'));
  return initialState;
};

// Emit a system event log
export const emitEvent = (state: SharedState, type: string, message: string, payload: any = {}): SharedState => {
  const event: EventLog = {
    event_id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    timestamp: new Date().toISOString(),
    type,
    message,
    payload
  };
  state.eventLog = [event, ...state.eventLog];
  return state;
};

// Add audit log record
export const addAuditLog = (
  state: SharedState,
  userRole: string,
  action: string,
  objectType: string,
  objectId: string,
  previousState: string,
  newState: string,
  reason: string
): SharedState => {
  const log: AuditLog = {
    log_id: `aud_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    timestamp: new Date().toISOString(),
    user_role: userRole,
    action,
    object_type: objectType,
    object_id: objectId,
    previous_state: previousState,
    new_state: newState,
    reason
  };
  state.auditLog = [log, ...state.auditLog];
  return state;
};

// Create a notification for a patient
export const createNotification = (
  state: SharedState,
  patientId: string,
  message: string,
  type: Notification['type'],
  actionLink?: string
): SharedState => {
  const notification: Notification = {
    notification_id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    patient_id: patientId,
    message,
    type,
    read: false,
    created_at: new Date().toISOString(),
    action_link: actionLink
  };
  state.notifications = [notification, ...state.notifications];
  return state;
};

// Helper to write changes to an appointment
export const updateAppointment = (
  appointmentId: string,
  changes: Partial<Appointment>,
  userRole: string = 'System',
  reason: string = 'Aggiornamento programmato'
): SharedState => {
  const state = readSharedState();
  const index = state.appointments.findIndex(a => a.appointment_id === appointmentId);
  if (index !== -1) {
    const prev = JSON.stringify(state.appointments[index]);
    state.appointments[index] = { ...state.appointments[index], ...changes };
    const curr = JSON.stringify(state.appointments[index]);
    
    emitEvent(
      state, 
      'APPOINTMENT_UPDATED', 
      `Appuntamento ${appointmentId} aggiornato con modifiche: ${Object.keys(changes).join(', ')}`, 
      { appointment_id: appointmentId, changes }
    );
    
    addAuditLog(
      state,
      userRole,
      'UPDATE_APPOINTMENT',
      'APPOINTMENT',
      appointmentId,
      prev,
      curr,
      reason
    );
    
    saveSharedState(state);
  }
  return state;
};

// Create an operator task
export const createOperatorTask = (
  state: SharedState,
  type: OperatorTask['type'],
  title: string,
  description: string,
  priority: OperatorTask['priority'],
  linkedId?: string
): SharedState => {
  const task: OperatorTask = {
    task_id: `tsk_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    type,
    title,
    description,
    status: 'pending',
    assigned_to: 'Non assegnato',
    priority,
    linked_id: linkedId,
    created_at: new Date().toISOString()
  };
  state.operatorTasks = [task, ...state.operatorTasks];
  return state;
};

// Patient cancels an appointment
export const cancelAppointment = (
  appointmentId: string,
  reason: string,
  userRole: string = 'Paziente'
): SharedState => {
  const state = readSharedState();
  const appIndex = state.appointments.findIndex(a => a.appointment_id === appointmentId);
  if (appIndex !== -1) {
    const appt = state.appointments[appIndex];
    const prevApptState = JSON.stringify(appt);
    
    // Update appointment status to cancelled
    appt.status = 'cancelled';
    appt.confirmation_status = 'cancelled';
    appt.cancellation_reason = reason;
    
    emitEvent(state, 'APPOINTMENT_CANCELLED', `L'appuntamento ${appt.appointment_id} di ${appt.specialty} è stato annullato. Motivo: ${reason}`, { appointment_id: appointmentId });
    
    addAuditLog(
      state,
      userRole,
      'CANCEL_APPOINTMENT',
      'APPOINTMENT',
      appointmentId,
      prevApptState,
      JSON.stringify(appt),
      `Cancellazione richiesta da ${userRole}. Motivo: ${reason}`
    );

    // Release the slot if we can find it
    const slotIndex = state.slots.findIndex(s => s.date === appt.scheduled_date && s.start_time === appt.scheduled_time && s.doctor_id === appt.doctor_id);
    if (slotIndex !== -1) {
      const prevSlotState = JSON.stringify(state.slots[slotIndex]);
      state.slots[slotIndex].status = 'released';
      state.slots[slotIndex].booked = false;
      state.slots[slotIndex].available = true;
      state.slots[slotIndex].released_by_cancellation = true;
      
      addAuditLog(
        state,
        'System',
        'RELEASE_SLOT',
        'SLOT',
        state.slots[slotIndex].slot_id,
        prevSlotState,
        JSON.stringify(state.slots[slotIndex]),
        `Slot liberato automaticamente a seguito della cancellazione dell'appuntamento ${appointmentId}`
      );
      
      // Generate operator task for slot recovery
      createOperatorTask(
        state,
        'slot_recovery',
        `Recupero Slot: ${appt.specialty} del ${appt.scheduled_date}`,
        `Lo slot delle ${appt.scheduled_time} presso ${appt.facility_name} si è liberato. Identificare un paziente ad alta priorità clinica in lista d'attesa.`,
        appt.clinical_priority === 'Critical' || appt.clinical_priority === 'High' ? 'High' : 'Medium',
        appt.appointment_id
      );
    }

    createNotification(
      state,
      appt.patient_id,
      `La tua visita di ${appt.specialty} prevista per il ${appt.scheduled_date} è stata annullata.`,
      'warning'
    );

    saveSharedState(state);
  }
  return state;
};

// Reschedule an appointment
export const rescheduleAppointment = (
  appointmentId: string,
  newSlotId: string,
  userRole: string = 'Paziente'
): SharedState => {
  const state = readSharedState();
  const appIndex = state.appointments.findIndex(a => a.appointment_id === appointmentId);
  const slotIndex = state.slots.findIndex(s => s.slot_id === newSlotId);

  if (appIndex !== -1 && slotIndex !== -1) {
    const appt = state.appointments[appIndex];
    const newSlot = state.slots[slotIndex];
    
    const prevApptState = JSON.stringify(appt);
    const prevNewSlotState = JSON.stringify(newSlot);

    // Release old slot if there was one
    const oldSlotIndex = state.slots.findIndex(s => s.date === appt.scheduled_date && s.start_time === appt.scheduled_time && s.doctor_id === appt.doctor_id);
    if (oldSlotIndex !== -1) {
      const prevOldSlotState = JSON.stringify(state.slots[oldSlotIndex]);
      state.slots[oldSlotIndex].status = 'available';
      state.slots[oldSlotIndex].booked = false;
      state.slots[oldSlotIndex].available = true;
      state.slots[oldSlotIndex].released_by_cancellation = false;
      
      addAuditLog(
        state,
        'System',
        'RELEASE_SLOT',
        'SLOT',
        state.slots[oldSlotIndex].slot_id,
        prevOldSlotState,
        JSON.stringify(state.slots[oldSlotIndex]),
        `Slot liberato a seguito di riprogrammazione dell'appuntamento ${appointmentId}`
      );
    }

    // Update appointment
    appt.scheduled_date = newSlot.date;
    appt.scheduled_time = newSlot.start_time;
    appt.facility_id = newSlot.facility_id;
    appt.facility_name = newSlot.facility_name;
    appt.status = 'scheduled';
    appt.confirmation_status = 'confirmed';
    appt.reschedule_requested = false;

    // Book new slot
    newSlot.status = 'booked';
    newSlot.booked = true;
    newSlot.available = false;
    newSlot.released_by_cancellation = false;

    emitEvent(
      state, 
      'APPOINTMENT_RESCHEDULED', 
      `L'appuntamento ${appt.appointment_id} è stato riprogrammato al ${newSlot.date} ore ${newSlot.start_time}.`, 
      { appointment_id: appointmentId, new_slot_id: newSlotId }
    );

    addAuditLog(
      state,
      userRole,
      'RESCHEDULE_APPOINTMENT',
      'APPOINTMENT',
      appointmentId,
      prevApptState,
      JSON.stringify(appt),
      `Riprogrammazione completata con successo.`
    );

    addAuditLog(
      state,
      'System',
      'BOOK_SLOT',
      'SLOT',
      newSlotId,
      prevNewSlotState,
      JSON.stringify(newSlot),
      `Slot occupato per riprogrammazione appuntamento ${appointmentId}`
    );

    createNotification(
      state,
      appt.patient_id,
      `La tua visita è stata riprogrammata con successo per il ${newSlot.date} alle ore ${newSlot.start_time} presso ${newSlot.facility_name}.`,
      'success'
    );

    saveSharedState(state);
  }
  return state;
};

// Create a new ticket (complaint / customer care request)
export const createTicket = (payload: Omit<Ticket, 'ticket_id' | 'created_at' | 'updated_at' | 'status' | 'owner' | 'escalation'>): SharedState => {
  const state = readSharedState();
  const ticketId = `tick_${state.tickets.length + 1}`;
  
  const ticket: Ticket = {
    ...payload,
    ticket_id: ticketId,
    status: 'open',
    owner: 'Non assegnato',
    escalation: payload.severity === 'Critical' || payload.severity === 'High',
    created_at: new Date().toISOString().split('T')[0],
    updated_at: new Date().toISOString().split('T')[0],
    notes: [`Ticket aperto dal paziente.`]
  };

  state.tickets = [ticket, ...state.tickets];

  emitEvent(
    state, 
    'COMPLAINT_CREATED', 
    `Creato reclamo ${ticketId} da paziente ${ticket.patient_id} per categoria ${ticket.category}.`, 
    { ticket_id: ticketId, patient_id: ticket.patient_id }
  );

  addAuditLog(
    state,
    'Paziente',
    'CREATE_TICKET',
    'TICKET',
    ticketId,
    '{}',
    JSON.stringify(ticket),
    `Apertura reclamo o ticket assistenza via app.`
  );

  // Generate task for Customer Care
  createOperatorTask(
    state,
    'ticket_followup',
    `Gestione Reclamo ${ticketId}: ${ticket.category}`,
    `Un paziente ha segnalato un problema relativo a: ${ticket.root_cause || ticket.category}. Severità: ${ticket.severity}. Risolvere entro i tempi SLA.`,
    ticket.severity === 'Critical' || ticket.severity === 'High' ? 'High' : 'Medium',
    ticketId
  );

  // If connected to appointment, record in patient history
  const patIdx = state.patients.findIndex(p => p.patient_id === ticket.patient_id);
  if (patIdx !== -1) {
    state.patients[patIdx].complaint_history += 1;
  }

  saveSharedState(state);
  return state;
};

// Update ticket status
export const updateTicketStatus = (
  ticketId: string,
  changes: Partial<Ticket>,
  userRole: string = 'Customer Care'
): SharedState => {
  const state = readSharedState();
  const index = state.tickets.findIndex(t => t.ticket_id === ticketId);
  if (index !== -1) {
    const prev = JSON.stringify(state.tickets[index]);
    state.tickets[index] = { 
      ...state.tickets[index], 
      ...changes, 
      updated_at: new Date().toISOString().split('T')[0] 
    };
    
    // Add custom note if status changed
    if (changes.status) {
      const currentNotes = state.tickets[index].notes || [];
      state.tickets[index].notes = [
        ...currentNotes,
        `Stato modificato in ${changes.status} da ${userRole}. Nota: ${changes.notes?.slice(-1)[0] || 'Aggiornamento operatore'}`
      ];
    }

    const curr = JSON.stringify(state.tickets[index]);

    emitEvent(
      state, 
      'TICKET_UPDATED', 
      `Ticket ${ticketId} aggiornato. Stato: ${state.tickets[index].status}`, 
      { ticket_id: ticketId, changes }
    );

    addAuditLog(
      state,
      userRole,
      'UPDATE_TICKET',
      'TICKET',
      ticketId,
      prev,
      curr,
      `Modificato stato o proprietà del reclamo.`
    );

    // Notify patient
    createNotification(
      state,
      state.tickets[index].patient_id,
      `Il tuo ticket di assistenza ${ticketId} è stato aggiornato allo stato: ${state.tickets[index].status}.`,
      changes.status === 'resolved' ? 'success' : 'info'
    );

    saveSharedState(state);
  }
  return state;
};

// Propose a slot advance to a waiting/compatible patient
export const proposeSlotAdvance = (
  appointmentId: string,
  candidatePatientId: string,
  targetSlotId: string,
  userRole: string = 'Operations Manager'
): SharedState => {
  const state = readSharedState();
  const appt = state.appointments.find(a => a.appointment_id === appointmentId);
  const targetSlot = state.slots.find(s => s.slot_id === targetSlotId);

  if (appt && targetSlot) {
    const proposalId = `prop_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    const proposal: SlotProposal = {
      proposal_id: proposalId,
      appointment_id: appointmentId,
      candidate_patient_id: candidatePatientId,
      target_slot_id: targetSlotId,
      status: 'proposed',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 2 * 3600000).toISOString() // 2 hours expiry
    };

    state.slotProposals = [proposal, ...state.slotProposals];

    // Mark slot as booked or proposed? It's offered, let's keep slot status as proposed if we want, or just mark it linked.
    emitEvent(
      state, 
      'SLOT_ADVANCE_PROPOSED', 
      `Proposto anticipo slot per appuntamento ${appointmentId} al paziente ${candidatePatientId}. Slot proposto: ${targetSlot.date} alle ${targetSlot.start_time}`, 
      { proposal_id: proposalId, appointment_id: appointmentId, candidatePatientId, target_slot_id: targetSlotId }
    );

    addAuditLog(
      state,
      userRole,
      'PROPOSE_SLOT_ADVANCE',
      'SLOT_PROPOSAL',
      proposalId,
      '{}',
      JSON.stringify(proposal),
      `Proposta di anticipo visita inviata automaticamente via app per ottimizzazione agenda.`
    );

    // Create app notification for patient
    createNotification(
      state,
      candidatePatientId,
      `Ottime notizie! Si è liberato uno slot prima del previsto per la tua visita di ${appt.specialty} il ${targetSlot.date} alle ore ${targetSlot.start_time}. Accetti l'anticipo?`,
      'proposal',
      proposalId
    );

    saveSharedState(state);
  }
  return state;
};

// Accept slot advance proposed
export const acceptSlotAdvance = (proposalId: string, userRole: string = 'Paziente'): SharedState => {
  const state = readSharedState();
  const propIdx = state.slotProposals.findIndex(p => p.proposal_id === proposalId);
  if (propIdx !== -1) {
    const prop = state.slotProposals[propIdx];
    prop.status = 'accepted';

    const appIndex = state.appointments.findIndex(a => a.appointment_id === prop.appointment_id);
    const slotIndex = state.slots.findIndex(s => s.slot_id === prop.target_slot_id);

    if (appIndex !== -1 && slotIndex !== -1) {
      const appt = state.appointments[appIndex];
      const newSlot = state.slots[slotIndex];
      
      const prevAppt = JSON.stringify(appt);
      const prevNewSlot = JSON.stringify(newSlot);

      // Release old slot
      const oldSlotIndex = state.slots.findIndex(s => s.date === appt.scheduled_date && s.start_time === appt.scheduled_time && s.doctor_id === appt.doctor_id);
      if (oldSlotIndex !== -1) {
        const prevOldSlot = JSON.stringify(state.slots[oldSlotIndex]);
        state.slots[oldSlotIndex].status = 'available';
        state.slots[oldSlotIndex].booked = false;
        state.slots[oldSlotIndex].available = true;
        state.slots[oldSlotIndex].released_by_cancellation = false;
        state.slots[oldSlotIndex].recovered = false;
        
        addAuditLog(
          state,
          'System',
          'RELEASE_SLOT',
          'SLOT',
          state.slots[oldSlotIndex].slot_id,
          prevOldSlot,
          JSON.stringify(state.slots[oldSlotIndex]),
          `Slot originario liberato per accettazione proposta di anticipo`
        );
      }

      // Update appointment
      appt.scheduled_date = newSlot.date;
      appt.scheduled_time = newSlot.start_time;
      appt.status = 'scheduled';
      appt.confirmation_status = 'confirmed';

      // Update new slot
      newSlot.status = 'booked';
      newSlot.booked = true;
      newSlot.available = false;
      newSlot.recovered = true; // Mark as recovered!

      emitEvent(
        state, 
        'SLOT_ADVANCE_ACCEPTED', 
        `Paziente ${appt.patient_id} ha accettato la proposta di anticipo ${proposalId}. Nuova data: ${newSlot.date} ${newSlot.start_time}`, 
        { proposal_id: proposalId, appointment_id: appt.appointment_id }
      );

      addAuditLog(
        state,
        userRole,
        'ACCEPT_SLOT_PROPOSAL',
        'SLOT_PROPOSAL',
        proposalId,
        `{status: 'proposed'}`,
        `{status: 'accepted'}`,
        `Paziente ha accettato l'anticipo slot tramite app.`
      );

      addAuditLog(
        state,
        'System',
        'OPTIMIZE_APPOINTMENT',
        'APPOINTMENT',
        appt.appointment_id,
        prevAppt,
        JSON.stringify(appt),
        `Appuntamento anticipato tramite ottimizzazione slot.`
      );

      addAuditLog(
        state,
        'System',
        'BOOK_RECOVERED_SLOT',
        'SLOT',
        newSlot.slot_id,
        prevNewSlot,
        JSON.stringify(newSlot),
        `Slot recuperato con successo da lista d'attesa.`
      );

      createNotification(
        state,
        appt.patient_id,
        `La tua visita è stata anticipata con successo al ${newSlot.date} alle ore ${newSlot.start_time}. Grazie!`,
        'success'
      );

      // Complete associated operator task if any
      const tskIdx = state.operatorTasks.findIndex(t => t.type === 'slot_recovery' && t.linked_id === appt.appointment_id);
      if (tskIdx !== -1) {
        state.operatorTasks[tskIdx].status = 'completed';
      }

      saveSharedState(state);
    }
  }
  return state;
};

// Publish report
export const publishReport = (reportId: string, userRole: string = 'Direzione Sanitaria'): SharedState => {
  const state = readSharedState();
  const idx = state.reports.findIndex(r => r.report_id === reportId);
  if (idx !== -1) {
    const prev = JSON.stringify(state.reports[idx]);
    
    state.reports[idx].status = 'published';
    state.reports[idx].report_published_timestamp = new Date().toISOString();
    
    const curr = JSON.stringify(state.reports[idx]);

    emitEvent(state, 'REPORT_PUBLISHED', `Referto ${reportId} convalidato e pubblicato online.`, { report_id: reportId });

    addAuditLog(
      state,
      userRole,
      'PUBLISH_REPORT',
      'REPORT',
      reportId,
      prev,
      curr,
      `Convalida medica del referto ed emissione per il paziente.`
    );

    // Update appointment report_id link
    const appIdx = state.appointments.findIndex(a => a.appointment_id === state.reports[idx].appointment_id);
    if (appIdx !== -1) {
      state.appointments[appIdx].report_id = reportId;
    }

    // Notify patient
    createNotification(
      state,
      state.reports[idx].patient_id,
      `Il referto della tua visita è ora disponibile online. Puoi visualizzarlo o scaricarlo nella sezione Referti.`,
      'success'
    );

    saveSharedState(state);
  }
  return state;
};

// Create Device alert / status changes (Biomedical control tower)
export const createDeviceAlert = (
  deviceId: string,
  alertType: 'offline' | 'anomaly' | 'online',
  userRole: string = 'Biomedical Engineer'
): SharedState => {
  const state = readSharedState();
  const idx = state.devices.findIndex(d => d.device_id === deviceId);
  if (idx !== -1) {
    const dev = state.devices[idx];
    const prev = JSON.stringify(dev);

    if (alertType === 'offline') {
      dev.status = 'offline';
      dev.anomaly_flag = true;
      dev.maintenance_required = true;
      
      emitEvent(state, 'DEVICE_OFFLINE', `Dispositivo medicale ${dev.equipment_id} (${dev.device_type}) andato offline improvvisamente.`, { device_id: deviceId });
      
      // Create operator task for maintenance
      createOperatorTask(
        state,
        'device_maintenance',
        `Manutenzione Straordinaria: ${dev.equipment_id}`,
        `Il dispositivo ${dev.device_type} in sala ${dev.room_id} presso ${dev.facility_name} è offline. Richiesto intervento tecnico urgente per guasto hardware.`,
        'Critical',
        deviceId
      );

      // Create a warning event in IoMT
      state.iomtEvents = [{
        event_id: `iomt_fail_${Date.now()}`,
        device_id: deviceId,
        timestamp: new Date().toISOString(),
        metric_name: "Status Connection",
        metric_value: "FATAL_OFFLINE",
        status: "critical"
      }, ...state.iomtEvents];

      // Highlight future appointments linked to this device
      state.appointments.forEach((appt, apptIdx) => {
        if (appt.device_id === deviceId && appt.status === 'scheduled') {
          // Identify slots affected
          appt.delay_minutes = 0;
          // Mark in some way as a warning or reschedule requested to help operations
          state.operatorTasks.push({
            task_id: `tsk_aff_${Date.now()}_${apptIdx}`,
            type: 'slot_recovery',
            title: `Riprogrammare Visita per Guasto Macchina: ${appt.appointment_id}`,
            description: `Riprogrammare la visita di ${appt.specialty} per ${state.patients.find(p=>p.patient_id === appt.patient_id)?.name} a causa di fermo macchina ${dev.equipment_id}.`,
            status: 'pending',
            assigned_to: 'Non assegnato',
            priority: 'High',
            linked_id: appt.appointment_id,
            created_at: new Date().toISOString()
          });
        }
      });

    } else if (alertType === 'anomaly') {
      dev.status = 'anomaly';
      dev.anomaly_flag = true;
      
      emitEvent(state, 'DEVICE_ANOMALY', `Anomalia hardware registrata su dispositivo ${dev.equipment_id} (${dev.device_type}).`, { device_id: deviceId });
      
      state.iomtEvents = [{
        event_id: `iomt_warn_${Date.now()}`,
        device_id: deviceId,
        timestamp: new Date().toISOString(),
        metric_name: "Helium Pressure / Temperature",
        metric_value: "LIMIT_WARNING",
        status: "warning"
      }, ...state.iomtEvents];
      
      createOperatorTask(
        state,
        'device_maintenance',
        `Ispezione Diagnostica: ${dev.equipment_id}`,
        `Anomalia IoMT registrata. Pianificare controllo preventivo prima del prossimo esame clinico.`,
        'High',
        deviceId
      );
    } else {
      dev.status = 'online';
      dev.anomaly_flag = false;
      dev.maintenance_required = false;
      emitEvent(state, 'DEVICE_ONLINE', `Dispositivo medicale ${dev.equipment_id} ripristinato online ed operativo.`, { device_id: deviceId });
    }

    const curr = JSON.stringify(dev);
    addAuditLog(
      state,
      userRole,
      'UPDATE_DEVICE_STATUS',
      'DEVICE',
      deviceId,
      prev,
      curr,
      `Simulazione / aggiornamento stato operativo dell'hardware ospedaliero.`
    );

    saveSharedState(state);
  }
  return state;
};

// Create cyber task remediation
export const createCyberTask = (cyberEventId: string, userRole: string = 'Cybersecurity Lead'): SharedState => {
  const state = readSharedState();
  const cyberIdx = state.cyberEvents.findIndex(c => c.cyber_event_id === cyberEventId);
  if (cyberIdx !== -1) {
    const event = state.cyberEvents[cyberIdx];
    const prev = JSON.stringify(event);

    event.remediation_status = 'in_progress';
    
    const device = state.devices.find(d => d.device_id === event.asset_id);
    const deviceName = device ? `${device.device_type} (${device.equipment_id})` : event.asset_id;

    createOperatorTask(
      state,
      'cyber_remediation',
      `Rimozione Rischio Cyber: ${event.cyber_event_id}`,
      `Eseguire patch firmware o attivazione controlli di rete per minaccia MITRE: ${event.mitre_tactic} su asset ${deviceName}. Severità: ${event.severity}.`,
      event.severity === 'Critical' || event.severity === 'High' ? 'Critical' : 'Medium',
      cyberEventId
    );

    emitEvent(state, 'CYBER_REMEDIATION_STARTED', `Risoluzione avviata per minaccia cyber ${cyberEventId}.`, { cyber_event_id: cyberEventId });

    addAuditLog(
      state,
      userRole,
      'START_CYBER_REMEDIATION',
      'CYBER_EVENT',
      cyberEventId,
      prev,
      JSON.stringify(event),
      `Apertura ticket di cybersecurity e attivazione protocolli SOC.`
    );

    saveSharedState(state);
  }
  return state;
};
