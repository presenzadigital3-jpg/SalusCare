/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Patient {
  patient_id: string;
  name: string;
  birth_date: string;
  email: string;
  phone: string;
  preferred_channel: 'SMS' | 'Email' | 'WhatsApp' | 'Push';
  digital_engagement_level: 'High' | 'Medium' | 'Low';
  churn_risk: 'High' | 'Medium' | 'Low';
  nps_score: number; // 0-10
  satisfaction_score: number; // 1-5
  no_show_history: number;
  complaint_history: number;
}

export interface Appointment {
  appointment_id: string;
  episode_id: string;
  patient_id: string;
  service_type: string;
  specialty: string;
  facility_id: string;
  facility_name: string;
  department: string;
  doctor_id: string;
  doctor_name: string;
  scheduled_date: string;
  scheduled_time: string;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'reschedule_requested' | 'completed' | 'no-show';
  confirmation_status: 'pending' | 'confirmed' | 'cancelled';
  confirmation_channel?: 'SMS' | 'Email' | 'WhatsApp' | 'IVR' | 'Operator';
  confirmation_timestamp?: string;
  cancellation_reason?: string;
  reschedule_requested: boolean;
  clinical_priority: 'Low' | 'Medium' | 'High' | 'Critical';
  waiting_list_days: number;
  preparation_required: string;
  report_id?: string;
  invoice_id?: string;
  device_id?: string;
  room_id: string;
  delay_minutes: number;
  delay_reason_code?: string; // 'paziente' | 'medico' | 'accettazione' | 'sala' | 'device' | 'prestazione_precedente' | 'scheduling' | 'amministrativo' | 'digitale'
  check_in_time?: string;
  arrival_time?: string;
  clinician_ready_time?: string;
  room_ready_time?: string;
  device_ready_time?: string;
  start_time?: string;
  end_time?: string;
}

export interface Slot {
  slot_id: string;
  facility_id: string;
  facility_name: string;
  department: string;
  specialty: string;
  doctor_id: string;
  room_id: string;
  device_id?: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'available' | 'booked' | 'released' | 'recovered';
  booked: boolean;
  available: boolean;
  released_by_cancellation: boolean;
  recovered: boolean;
}

export interface Report {
  report_id: string;
  episode_id: string;
  appointment_id: string;
  patient_id: string;
  status: 'draft' | 'validated' | 'published';
  report_created_timestamp?: string;
  report_validated_timestamp?: string;
  report_published_timestamp?: string;
  report_downloaded_flag: boolean;
  report_text: string;
  issue_flag: boolean;
}

export interface Invoice {
  invoice_id: string;
  episode_id: string;
  appointment_id: string;
  patient_id: string;
  amount: number;
  payer_type: 'SSN' | 'Private' | 'Insurance';
  status: 'unpaid' | 'paid' | 'reclaimed' | 'disputed';
  payment_delay_days: number;
  claim_rejection_flag: boolean;
}

export interface Ticket {
  ticket_id: string;
  patient_id: string;
  appointment_id?: string;
  episode_id?: string;
  category: 'Referto' | 'Pagamento' | 'Attesa' | 'Accettazione' | 'Medico/personale' | 'App/Portale' | 'Comunicazione' | 'Altro';
  root_cause?: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  owner: string;
  sla_due_date: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  escalation: boolean;
  created_at: string;
  updated_at: string;
  resolution_time_hours?: number;
  notes?: string[];
}

export interface Feedback {
  feedback_id: string;
  patient_id: string;
  appointment_id: string;
  score: number; // 1-5
  has_complaint: boolean;
  category?: string;
  root_cause?: string;
  comment: string;
  callback_requested: boolean;
  created_at: string;
}

export interface Notification {
  notification_id: string;
  patient_id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'alert' | 'proposal';
  read: boolean;
  created_at: string;
  action_link?: string;
}

export interface OperatorTask {
  task_id: string;
  type: 'slot_recovery' | 'patient_call' | 'device_maintenance' | 'cyber_remediation' | 'ticket_followup';
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  assigned_to: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  linked_id?: string; // appointment_id, device_id, etc.
  created_at: string;
}

export interface MedicalDevice {
  device_id: string;
  equipment_id: string;
  device_type: 'RM' | 'TAC' | 'Ecografo' | 'Lab Analyzer' | 'Monitor' | 'Gateway';
  facility_id: string;
  facility_name: string;
  department: string;
  room_id: string;
  status: 'online' | 'offline' | 'maintenance' | 'anomaly';
  uptime_percentage: number;
  downtime_minutes: number;
  anomaly_flag: boolean;
  patch_status: 'up-to-date' | 'pending' | 'outdated';
  firmware_version: string;
  maintenance_required: boolean;
  cyber_relevance: boolean;
  owner_technical: string;
  owner_clinical: string;
  criticality: 'Low' | 'Medium' | 'High' | 'Critical';
}

export interface IoMTEvent {
  event_id: string;
  device_id: string;
  timestamp: string;
  metric_name: string;
  metric_value: string;
  status: 'normal' | 'warning' | 'critical';
}

export interface CyberEvent {
  cyber_event_id: string;
  asset_id: string; // device_id
  device_id?: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  mitre_tactic: string;
  timestamp: string;
  mfa_status: 'enabled' | 'disabled';
  privileged_account: boolean;
  incident_linked: boolean;
  response_time_minutes?: number;
  patch_available: boolean;
  remediation_status: 'open' | 'in_progress' | 'mitigated' | 'resolved';
  owner: string;
}

export interface AuditLog {
  log_id: string;
  timestamp: string;
  user_role: string;
  action: string;
  object_type: string;
  object_id: string;
  previous_state: string;
  new_state: string;
  reason: string;
}

export interface EventLog {
  event_id: string;
  timestamp: string;
  type: string; // 'APPOINTMENT_CREATED', 'APPOINTMENT_CANCELLED', etc.
  message: string;
  payload: any;
}

export interface DataQualityIssue {
  issue_id: string;
  table_name: string;
  field_name: string;
  record_id: string;
  issue_description: string;
  severity: 'Low' | 'Medium' | 'High';
  status: 'open' | 'resolved';
}

export interface SlotProposal {
  proposal_id: string;
  appointment_id: string; // original appointment
  candidate_patient_id: string;
  target_slot_id: string; // new earlier slot
  status: 'proposed' | 'accepted' | 'declined' | 'expired';
  created_at: string;
  expires_at: string;
}

export interface SharedState {
  patients: Patient[];
  appointments: Appointment[];
  slots: Slot[];
  reports: Report[];
  invoices: Invoice[];
  tickets: Ticket[];
  feedback: Feedback[];
  notifications: Notification[];
  operatorTasks: OperatorTask[];
  devices: MedicalDevice[];
  iomtEvents: IoMTEvent[];
  cyberEvents: CyberEvent[];
  auditLog: AuditLog[];
  eventLog: EventLog[];
  dataQualityIssues: DataQualityIssue[];
  slotProposals: SlotProposal[];
}
