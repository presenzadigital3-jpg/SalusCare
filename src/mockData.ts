/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Patient,
  Appointment,
  Slot,
  Report,
  Invoice,
  Ticket,
  Feedback,
  Notification,
  OperatorTask,
  MedicalDevice,
  IoMTEvent,
  CyberEvent,
  AuditLog,
  EventLog,
  DataQualityIssue,
  SlotProposal,
  SharedState
} from './types';

// Helper to generate IDs
const generateId = (prefix: string) => `${prefix}_${Math.random().toString(36).substr(2, 9)}`;

export const initialPatients: Patient[] = [
  {
    patient_id: "pat_maria",
    name: "Maria Rossi",
    birth_date: "1988-04-12",
    email: "maria.rossi@email.com",
    phone: "+39 345 678 9012",
    preferred_channel: "WhatsApp",
    digital_engagement_level: "High",
    churn_risk: "Low",
    nps_score: 9,
    satisfaction_score: 5,
    no_show_history: 0,
    complaint_history: 0
  },
  {
    patient_id: "pat_giovanni",
    name: "Giovanni Bianchi",
    birth_date: "1952-11-23",
    email: "giovanni.b52@email.it",
    phone: "+39 333 112 2334",
    preferred_channel: "SMS",
    digital_engagement_level: "Low",
    churn_risk: "Medium",
    nps_score: 6,
    satisfaction_score: 3,
    no_show_history: 2,
    complaint_history: 1
  },
  {
    patient_id: "pat_elena",
    name: "Elena Verdi",
    birth_date: "1975-08-30",
    email: "elena.verdi@posta.it",
    phone: "+39 347 555 4433",
    preferred_channel: "Email",
    digital_engagement_level: "Medium",
    churn_risk: "Low",
    nps_score: 8,
    satisfaction_score: 4,
    no_show_history: 0,
    complaint_history: 0
  },
  {
    patient_id: "pat_paolo",
    name: "Paolo Neri",
    birth_date: "1964-01-15",
    email: "paolo.neri@libero.it",
    phone: "+39 320 998 8776",
    preferred_channel: "SMS",
    digital_engagement_level: "Medium",
    churn_risk: "High",
    nps_score: 4,
    satisfaction_score: 2,
    no_show_history: 1,
    complaint_history: 3
  },
  {
    patient_id: "pat_laura",
    name: "Laura Ferri",
    birth_date: "1992-07-22",
    email: "laura.ferri@gmail.com",
    phone: "+39 335 123 4567",
    preferred_channel: "Push",
    digital_engagement_level: "High",
    churn_risk: "Low",
    nps_score: 10,
    satisfaction_score: 5,
    no_show_history: 0,
    complaint_history: 0
  },
  {
    patient_id: "pat_6",
    name: "Alessandro Russo",
    birth_date: "1980-05-14",
    email: "a.russo@tiscali.it",
    phone: "+39 349 111 2222",
    preferred_channel: "WhatsApp",
    digital_engagement_level: "Medium",
    churn_risk: "Low",
    nps_score: 8,
    satisfaction_score: 4,
    no_show_history: 0,
    complaint_history: 0
  },
  {
    patient_id: "pat_7",
    name: "Sofia Ferrari",
    birth_date: "1995-10-05",
    email: "sofia.ferrari@icloud.com",
    phone: "+39 331 444 5555",
    preferred_channel: "Push",
    digital_engagement_level: "High",
    churn_risk: "Low",
    nps_score: 9,
    satisfaction_score: 5,
    no_show_history: 0,
    complaint_history: 0
  },
  {
    patient_id: "pat_8",
    name: "Francesco Esposito",
    birth_date: "1948-03-19",
    email: "f_esposito@virgilio.it",
    phone: "+39 328 777 8888",
    preferred_channel: "SMS",
    digital_engagement_level: "Low",
    churn_risk: "High",
    nps_score: 5,
    satisfaction_score: 3,
    no_show_history: 3,
    complaint_history: 2
  },
  {
    patient_id: "pat_9",
    name: "Giulia Romano",
    birth_date: "1990-02-28",
    email: "giulia.romano@outlook.com",
    phone: "+39 334 888 9999",
    preferred_channel: "WhatsApp",
    digital_engagement_level: "High",
    churn_risk: "Low",
    nps_score: 9,
    satisfaction_score: 4,
    no_show_history: 0,
    complaint_history: 0
  },
  {
    patient_id: "pat_10",
    name: "Lorenzo Colombo",
    birth_date: "1972-12-08",
    email: "lorenzo.colombo@fastwebnet.it",
    phone: "+39 340 123 9876",
    preferred_channel: "Email",
    digital_engagement_level: "Medium",
    churn_risk: "Medium",
    nps_score: 7,
    satisfaction_score: 4,
    no_show_history: 1,
    complaint_history: 0
  },
  {
    patient_id: "pat_11",
    name: "Chiara Ricci",
    birth_date: "1983-09-17",
    email: "chiara.ricci@gmail.com",
    phone: "+39 345 999 0000",
    preferred_channel: "WhatsApp",
    digital_engagement_level: "High",
    churn_risk: "Low",
    nps_score: 8,
    satisfaction_score: 4,
    no_show_history: 0,
    complaint_history: 0
  },
  {
    patient_id: "pat_12",
    name: "Stefano Marino",
    birth_date: "1967-06-25",
    email: "stefano.marino@alice.it",
    phone: "+39 320 443 2211",
    preferred_channel: "SMS",
    digital_engagement_level: "Low",
    churn_risk: "Medium",
    nps_score: 6,
    satisfaction_score: 3,
    no_show_history: 1,
    complaint_history: 1
  },
  {
    patient_id: "pat_13",
    name: "Francesca Bruno",
    birth_date: "2001-11-12",
    email: "f.bruno01@gmail.com",
    phone: "+39 339 777 6655",
    preferred_channel: "Push",
    digital_engagement_level: "High",
    churn_risk: "Low",
    nps_score: 9,
    satisfaction_score: 5,
    no_show_history: 0,
    complaint_history: 0
  },
  {
    patient_id: "pat_14",
    name: "Marco Gallo",
    birth_date: "1958-08-03",
    email: "marco.gallo@infinito.it",
    phone: "+39 338 222 3344",
    preferred_channel: "SMS",
    digital_engagement_level: "Low",
    churn_risk: "Low",
    nps_score: 8,
    satisfaction_score: 4,
    no_show_history: 0,
    complaint_history: 0
  },
  {
    patient_id: "pat_15",
    name: "Beatrice Conti",
    birth_date: "1979-01-20",
    email: "b.conti@libero.it",
    phone: "+39 347 111 8899",
    preferred_channel: "Email",
    digital_engagement_level: "Medium",
    churn_risk: "Low",
    nps_score: 7,
    satisfaction_score: 4,
    no_show_history: 1,
    complaint_history: 0
  },
  {
    patient_id: "pat_16",
    name: "Roberto De Luca",
    birth_date: "1985-07-16",
    email: "roberto.deluca@gmail.com",
    phone: "+39 333 444 9900",
    preferred_channel: "WhatsApp",
    digital_engagement_level: "High",
    churn_risk: "Low",
    nps_score: 8,
    satisfaction_score: 4,
    no_show_history: 0,
    complaint_history: 0
  },
  {
    patient_id: "pat_17",
    name: "Anna Costa",
    birth_date: "1994-03-04",
    email: "anna.costa@hotmail.it",
    phone: "+39 335 888 7766",
    preferred_channel: "WhatsApp",
    digital_engagement_level: "High",
    churn_risk: "Low",
    nps_score: 10,
    satisfaction_score: 5,
    no_show_history: 0,
    complaint_history: 0
  },
  {
    patient_id: "pat_18",
    name: "Vincenzo Giordano",
    birth_date: "1950-10-31",
    email: "vincenzo.giordano@tiscali.it",
    phone: "+39 320 333 4444",
    preferred_channel: "SMS",
    digital_engagement_level: "Low",
    churn_risk: "High",
    nps_score: 5,
    satisfaction_score: 2,
    no_show_history: 2,
    complaint_history: 2
  },
  {
    patient_id: "pat_19",
    name: "Silvia Rizzo",
    birth_date: "1976-12-14",
    email: "silvia.rizzo@gmail.com",
    phone: "+39 347 444 3322",
    preferred_channel: "Email",
    digital_engagement_level: "Medium",
    churn_risk: "Low",
    nps_score: 8,
    satisfaction_score: 4,
    no_show_history: 0,
    complaint_history: 0
  },
  {
    patient_id: "pat_20",
    name: "Gabriele Moretti",
    birth_date: "1989-05-25",
    email: "gabriele.moretti@outlook.it",
    phone: "+39 331 999 8888",
    preferred_channel: "WhatsApp",
    digital_engagement_level: "High",
    churn_risk: "Low",
    nps_score: 9,
    satisfaction_score: 4,
    no_show_history: 0,
    complaint_history: 0
  }
];

export const initialDevices: MedicalDevice[] = [
  {
    device_id: "dev_rm_1",
    equipment_id: "EQ-RM-001",
    device_type: "RM",
    facility_id: "fac_milano",
    facility_name: "SalusCare Milano Centro",
    department: "Radiologia",
    room_id: "Room-RM1",
    status: "online",
    uptime_percentage: 98.4,
    downtime_minutes: 120,
    anomaly_flag: false,
    patch_status: "up-to-date",
    firmware_version: "v4.5.2-p3",
    maintenance_required: false,
    cyber_relevance: true,
    owner_technical: "Ing. Roberta Sandri",
    owner_clinical: "Dott. Massimo Ferrari",
    criticality: "Critical"
  },
  {
    device_id: "dev_tac_1",
    equipment_id: "EQ-TAC-002",
    device_type: "TAC",
    facility_id: "fac_milano",
    facility_name: "SalusCare Milano Centro",
    department: "Radiologia",
    room_id: "Room-TAC1",
    status: "online",
    uptime_percentage: 95.1,
    downtime_minutes: 360,
    anomaly_flag: false,
    patch_status: "pending",
    firmware_version: "v3.8.1",
    maintenance_required: true,
    cyber_relevance: true,
    owner_technical: "Ing. Roberta Sandri",
    owner_clinical: "Dott. Massimo Ferrari",
    criticality: "High"
  },
  {
    device_id: "dev_rm_2",
    equipment_id: "EQ-RM-002",
    device_type: "RM",
    facility_id: "fac_roma",
    facility_name: "SalusCare Roma Eur",
    department: "Radiologia",
    room_id: "Room-RM2",
    status: "online",
    uptime_percentage: 99.1,
    downtime_minutes: 80,
    anomaly_flag: false,
    patch_status: "up-to-date",
    firmware_version: "v4.5.2-p3",
    maintenance_required: false,
    cyber_relevance: true,
    owner_technical: "Ing. Fabio Renzi",
    owner_clinical: "Dott.ssa Laura Gatti",
    criticality: "Critical"
  },
  {
    device_id: "dev_eco_1",
    equipment_id: "EQ-ECO-010",
    device_type: "Ecografo",
    facility_id: "fac_roma",
    facility_name: "SalusCare Roma Eur",
    department: "Cardiologia",
    room_id: "Room-Cardio2",
    status: "online",
    uptime_percentage: 97.8,
    downtime_minutes: 180,
    anomaly_flag: false,
    patch_status: "up-to-date",
    firmware_version: "v2.1.0",
    maintenance_required: false,
    cyber_relevance: false,
    owner_technical: "Ing. Fabio Renzi",
    owner_clinical: "Dott. Pietro Nardi",
    criticality: "Medium"
  },
  {
    device_id: "dev_eco_2",
    equipment_id: "EQ-ECO-011",
    device_type: "Ecografo",
    facility_id: "fac_torino",
    facility_name: "SalusCare Torino Diagnostica",
    department: "Ginecologia",
    room_id: "Room-Gine1",
    status: "online",
    uptime_percentage: 96.5,
    downtime_minutes: 240,
    anomaly_flag: false,
    patch_status: "outdated",
    firmware_version: "v1.9.8",
    maintenance_required: true,
    cyber_relevance: false,
    owner_technical: "Ing. Luca Pavese",
    owner_clinical: "Dott.ssa Marta Valenti",
    criticality: "Medium"
  },
  {
    device_id: "dev_lab_1",
    equipment_id: "EQ-LAB-050",
    device_type: "Lab Analyzer",
    facility_id: "fac_milano",
    facility_name: "SalusCare Milano Centro",
    department: "Laboratorio",
    room_id: "Room-Lab1",
    status: "online",
    uptime_percentage: 94.2,
    downtime_minutes: 420,
    anomaly_flag: false,
    patch_status: "pending",
    firmware_version: "v8.2.3",
    maintenance_required: false,
    cyber_relevance: true,
    owner_technical: "Ing. Roberta Sandri",
    owner_clinical: "Dott.ssa Silvia Pozzi",
    criticality: "High"
  },
  {
    device_id: "dev_mon_1",
    equipment_id: "EQ-MON-101",
    device_type: "Monitor",
    facility_id: "fac_napoli",
    facility_name: "SalusCare Napoli Ambulatori",
    department: "Cardiologia",
    room_id: "Room-CardioNap",
    status: "online",
    uptime_percentage: 99.9,
    downtime_minutes: 10,
    anomaly_flag: false,
    patch_status: "up-to-date",
    firmware_version: "v1.2.0",
    maintenance_required: false,
    cyber_relevance: false,
    owner_technical: "Ing. Carmine Esposito",
    owner_clinical: "Dott. Giuseppe Russo",
    criticality: "Medium"
  },
  {
    device_id: "dev_gtw_1",
    equipment_id: "EQ-GTW-201",
    device_type: "Gateway",
    facility_id: "fac_milano",
    facility_name: "SalusCare Milano Centro",
    department: "Data Center",
    room_id: "Room-IT-Milano",
    status: "online",
    uptime_percentage: 99.99,
    downtime_minutes: 2,
    anomaly_flag: false,
    patch_status: "up-to-date",
    firmware_version: "v11.0.4",
    maintenance_required: false,
    cyber_relevance: true,
    owner_technical: "Ing. Stefano Galli (IT)",
    owner_clinical: "Dott. Massimo Ferrari",
    criticality: "Critical"
  },
  {
    device_id: "dev_tac_2",
    equipment_id: "EQ-TAC-003",
    device_type: "TAC",
    facility_id: "fac_torino",
    facility_name: "SalusCare Torino Diagnostica",
    department: "Radiologia",
    room_id: "Room-TAC-Tor",
    status: "online",
    uptime_percentage: 97.2,
    downtime_minutes: 220,
    anomaly_flag: false,
    patch_status: "up-to-date",
    firmware_version: "v3.9.0",
    maintenance_required: false,
    cyber_relevance: true,
    owner_technical: "Ing. Luca Pavese",
    owner_clinical: "Dott. Carlo Merlo",
    criticality: "High"
  },
  {
    device_id: "dev_rm_3",
    equipment_id: "EQ-RM-003",
    device_type: "RM",
    facility_id: "fac_torino",
    facility_name: "SalusCare Torino Diagnostica",
    department: "Radiologia",
    room_id: "Room-RM-Tor",
    status: "online",
    uptime_percentage: 96.0,
    downtime_minutes: 310,
    anomaly_flag: false,
    patch_status: "pending",
    firmware_version: "v4.5.1",
    maintenance_required: true,
    cyber_relevance: true,
    owner_technical: "Ing. Luca Pavese",
    owner_clinical: "Dott. Carlo Merlo",
    criticality: "Critical"
  },
  {
    device_id: "dev_eco_3",
    equipment_id: "EQ-ECO-012",
    device_type: "Ecografo",
    facility_id: "fac_napoli",
    facility_name: "SalusCare Napoli Ambulatori",
    department: "Ginecologia",
    room_id: "Room-GineNap",
    status: "online",
    uptime_percentage: 98.9,
    downtime_minutes: 90,
    anomaly_flag: false,
    patch_status: "up-to-date",
    firmware_version: "v2.1.0",
    maintenance_required: false,
    cyber_relevance: false,
    owner_technical: "Ing. Carmine Esposito",
    owner_clinical: "Dott.ssa Anna De Rosa",
    criticality: "Medium"
  },
  {
    device_id: "dev_lab_2",
    equipment_id: "EQ-LAB-051",
    device_type: "Lab Analyzer",
    facility_id: "fac_roma",
    facility_name: "SalusCare Roma Eur",
    department: "Laboratorio",
    room_id: "Room-LabRoma",
    status: "online",
    uptime_percentage: 95.8,
    downtime_minutes: 300,
    anomaly_flag: false,
    patch_status: "pending",
    firmware_version: "v8.2.1",
    maintenance_required: false,
    cyber_relevance: true,
    owner_technical: "Ing. Fabio Renzi",
    owner_clinical: "Dott. Roberto Stella",
    criticality: "High"
  }
];

export const generateInitialData = (): SharedState => {
  const patients = [...initialPatients];
  const devices = [...initialDevices];

  // Let's create slots (30 slots)
  const specialties = [
    "Cardiologia", "Radiologia", "Laboratorio", "Ginecologia", 
    "Neurologia", "Ortopedia", "Fisioterapia", "Telemedicina"
  ];
  const doctorNames: { [key: string]: string } = {
    "Cardiologia": "Dott. Pietro Nardi",
    "Radiologia": "Dott. Massimo Ferrari",
    "Laboratorio": "Dott.ssa Silvia Pozzi",
    "Ginecologia": "Dott.ssa Marta Valenti",
    "Neurologia": "Dott. Alessandro Galli",
    "Ortopedia": "Dott. Giovanni Riva",
    "Fisioterapia": "Dott.ssa Chiara Bernardi",
    "Telemedicina": "Dott. Luca Morelli"
  };

  const facilities = [
    { id: "fac_milano", name: "SalusCare Milano Centro" },
    { id: "fac_roma", name: "SalusCare Roma Eur" },
    { id: "fac_torino", name: "SalusCare Torino Diagnostica" },
    { id: "fac_napoli", name: "SalusCare Napoli Ambulatori" }
  ];

  const slots: Slot[] = [];
  const baseDate = new Date("2026-07-10");

  // Create 30 future slots from July 10 to July 20
  let slotIdCounter = 1;
  for (let d = 0; d < 10; d++) {
    const slotDate = new Date(baseDate);
    slotDate.setDate(baseDate.getDate() + d);
    const dateStr = slotDate.toISOString().split('T')[0];

    facilities.forEach((fac, facIdx) => {
      specialties.forEach((spec, specIdx) => {
        // limit slots creation to keep it clean and performant
        if ((facIdx + specIdx + d) % 4 === 0 && slots.length < 30) {
          const startTime = `${9 + (slotIdCounter % 4)}:00`;
          const endTime = `${10 + (slotIdCounter % 4)}:00`;
          const device = devices.find(dev => dev.facility_id === fac.id && dev.department === (spec === 'Radiologia' ? 'Radiologia' : spec === 'Cardiologia' ? 'Cardiologia' : 'Laboratorio'));
          
          slots.push({
            slot_id: `slot_${slotIdCounter}`,
            facility_id: fac.id,
            facility_name: fac.name,
            department: spec === 'Radiologia' ? 'Radiologia' : spec === 'Laboratorio' ? 'Laboratorio Analisi' : 'Ambulatorio specialistico',
            specialty: spec,
            doctor_id: `doc_${spec.toLowerCase()}`,
            doctor_name: doctorNames[spec] || "Dott. Medico",
            room_id: `Room-${spec.substr(0, 3)}-${100 + slotIdCounter}`,
            device_id: device?.device_id,
            date: dateStr,
            start_time: startTime,
            end_time: endTime,
            status: 'available',
            booked: false,
            available: true,
            released_by_cancellation: false,
            recovered: false
          } as any);
          slotIdCounter++;
        }
      });
    });
  }

  // Create 60 appointments
  const appointments: Appointment[] = [];
  const reports: Report[] = [];
  const invoices: Invoice[] = [];
  
  let apptIdCounter = 1;
  
  // Past appointments (35 of them)
  for (let i = 0; i < 35; i++) {
    const pat = patients[i % patients.length];
    const spec = specialties[i % specialties.length];
    const fac = facilities[i % facilities.length];
    
    const apptDate = new Date(baseDate);
    apptDate.setDate(baseDate.getDate() - (1 + i % 15));
    const dateStr = apptDate.toISOString().split('T')[0];
    
    const apptId = `appt_past_${apptIdCounter}`;
    const epId = `ep_past_${apptIdCounter}`;
    const rId = `rep_${apptIdCounter}`;
    const invId = `inv_${apptIdCounter}`;

    const dev = devices.find(d => d.facility_id === fac.id && (d.device_type === 'RM' || d.device_type === 'TAC' || d.device_type === 'Ecografo'));

    // Status: completed or no-show
    const isNoShow = i % 12 === 0 && pat.patient_id === "pat_giovanni" || pat.patient_id === "pat_8";
    const status = isNoShow ? 'no-show' : 'completed';

    const appt: Appointment = {
      appointment_id: apptId,
      episode_id: epId,
      patient_id: pat.patient_id,
      service_type: spec === 'Radiologia' ? 'Risonanza Magnetica' : 'Visita Specialistica',
      specialty: spec,
      facility_id: fac.id,
      facility_name: fac.name,
      department: spec === 'Radiologia' ? 'Radiologia' : 'Ambulatorio',
      doctor_id: `doc_${spec.toLowerCase()}`,
      doctor_name: doctorNames[spec] || "Dott. Medico",
      scheduled_date: dateStr,
      scheduled_time: `${9 + (i % 8)}:30`,
      status: status,
      confirmation_status: isNoShow ? 'pending' : 'confirmed',
      confirmation_channel: isNoShow ? undefined : 'WhatsApp',
      confirmation_timestamp: isNoShow ? undefined : `${dateStr} 08:30:00`,
      reschedule_requested: false,
      clinical_priority: i % 5 === 0 ? 'High' : 'Medium',
      waiting_list_days: 5 + (i % 25),
      preparation_required: spec === 'Radiologia' ? "Digiuno 6 ore prima" : "Nessuna",
      report_id: isNoShow ? undefined : rId,
      invoice_id: invId,
      device_id: dev?.device_id,
      room_id: `Room-${spec.substr(0, 3)}-02`,
      delay_minutes: isNoShow ? 0 : (i % 4 === 0 ? 15 + (i % 30) : 0),
      delay_reason_code: i % 4 === 0 && !isNoShow ? (i % 8 === 0 ? 'medico' : 'accettazione') : undefined,
      arrival_time: isNoShow ? undefined : `${9 + (i % 8)}:15`,
      check_in_time: isNoShow ? undefined : `${9 + (i % 8)}:20`,
      start_time: isNoShow ? undefined : `${9 + (i % 8)}:35`,
      end_time: isNoShow ? undefined : `${10 + (i % 8)}:05`
    };
    appointments.push(appt);

    // Create a report if completed
    if (status === 'completed') {
      const isElena = pat.patient_id === "pat_elena";
      reports.push({
        report_id: rId,
        episode_id: epId,
        appointment_id: apptId,
        patient_id: pat.patient_id,
        status: isElena && i === 2 ? 'published' : 'published',
        report_created_timestamp: `${dateStr} 12:30:00`,
        report_validated_timestamp: `${dateStr} 14:00:00`,
        report_published_timestamp: `${dateStr} 15:00:00`,
        report_downloaded_flag: pat.patient_id === 'pat_maria',
        report_text: `ESAME CLINICO SPECIALISTICO DI ${spec.toUpperCase()}.\nQuesito diagnostico: Controllo periodico.\n\nReperti: Strutture anatomiche nei limiti fisiologici. Non si evidenziano lesioni a carattere flogistico o infiltrativo in atto. Margini ben definiti. Si consiglia un nuovo controllo di routine tra 12 mesi.\n\nRefertatore: Prof. Alessandro Neri (SalusCare)`,
        issue_flag: false
      });
    }

    // Create an invoice
    invoices.push({
      invoice_id: invId,
      episode_id: epId,
      appointment_id: apptId,
      patient_id: pat.patient_id,
      amount: spec === 'Radiologia' ? 180.00 : spec === 'Laboratorio' ? 45.00 : 120.00,
      payer_type: i % 3 === 0 ? 'Insurance' : i % 3 === 1 ? 'SSN' : 'Private',
      status: i % 5 === 0 ? 'unpaid' : 'paid',
      payment_delay_days: i % 5 === 0 ? 10 + (i % 20) : 0,
      claim_rejection_flag: i % 15 === 0
    });

    apptIdCounter++;
  }

  // Active / Future appointments (25 of them)
  const confirmation_states: ('pending' | 'confirmed' | 'cancelled')[] = ['confirmed', 'pending', 'pending', 'confirmed'];
  const clinical_priorities: ('Low' | 'Medium' | 'High' | 'Critical')[] = ['Medium', 'Low', 'High', 'Critical'];

  for (let i = 0; i < 25; i++) {
    const pat = patients[(i + 3) % patients.length];
    const spec = specialties[(i + 2) % specialties.length];
    const fac = facilities[(i + 1) % facilities.length];
    
    const apptDate = new Date(baseDate);
    // 0 is today, some in next 10 days
    const daysOffset = i % 5;
    apptDate.setDate(baseDate.getDate() + daysOffset);
    const dateStr = apptDate.toISOString().split('T')[0];

    const apptId = `appt_fut_${apptIdCounter}`;
    const epId = `ep_fut_${apptIdCounter}`;
    const invId = `inv_fut_${apptIdCounter}`;

    const dev = devices.find(d => d.facility_id === fac.id && d.department === (spec === 'Radiologia' ? 'Radiologia' : spec === 'Cardiologia' ? 'Cardiologia' : 'Laboratorio'));

    // specific configuration to match patient requirements in prompt:
    // Elena Verdi has available report (done above in past appts).
    // Maria Rossi has a future appointment that she can cancel.
    // Paolo Neri has an open complaint (done below).
    // Laura Ferri is a high priority wait list patient.

    let p = clinical_priorities[i % clinical_priorities.length];
    let apptStatus: Appointment['status'] = 'scheduled';
    let confStatus: Appointment['confirmation_status'] = confirmation_states[i % confirmation_states.length];

    if (pat.patient_id === "pat_maria" && i === 1) {
      apptStatus = 'scheduled';
      confStatus = 'pending'; // Needs confirmation
    }
    if (pat.patient_id === "pat_laura") {
      p = 'High';
    }

    const appt: Appointment = {
      appointment_id: apptId,
      episode_id: epId,
      patient_id: pat.patient_id,
      service_type: spec === 'Radiologia' ? 'Risonanza Magnetica Cranio' : `Visita specialistica in ${spec}`,
      specialty: spec,
      facility_id: fac.id,
      facility_name: fac.name,
      department: spec === 'Radiologia' ? 'Radiologia' : 'Ambulatorio',
      doctor_id: `doc_${spec.toLowerCase()}`,
      doctor_name: doctorNames[spec] || "Dott. Medico",
      scheduled_date: dateStr,
      scheduled_time: `${10 + (i % 6)}:15`,
      status: apptStatus,
      confirmation_status: confStatus,
      reschedule_requested: false,
      clinical_priority: p,
      waiting_list_days: 12 + (i % 30),
      preparation_required: spec === 'Radiologia' ? "Digiuno 6 ore prima" : "Nessuna",
      invoice_id: invId,
      device_id: dev?.device_id,
      room_id: `Room-${spec.substr(0, 3)}-11`,
      delay_minutes: 0,
    };
    appointments.push(appt);

    // Create future invoice
    invoices.push({
      invoice_id: invId,
      episode_id: epId,
      appointment_id: apptId,
      patient_id: pat.patient_id,
      amount: spec === 'Radiologia' ? 180.00 : spec === 'Laboratorio' ? 45.00 : 120.00,
      payer_type: i % 2 === 0 ? 'SSN' : 'Insurance',
      status: 'unpaid',
      payment_delay_days: 0,
      claim_rejection_flag: false
    });

    apptIdCounter++;
  }

  // Create 20 tickets/complaints
  const tickets: Ticket[] = [];
  const ticketCategories: Ticket['category'][] = ['Referto', 'Pagamento', 'Attesa', 'Accettazione', 'Medico/personale', 'App/Portale', 'Comunicazione', 'Altro'];
  const ticketCauses = [
    "Referto non disponibile nei tempi previsti",
    "Addebito doppio su carta di credito",
    "Tempo di attesa in sala oltre 60 minuti",
    "Accettazione scortese o poco collaborativa",
    "Mancata risposta alle telefonate",
    "Errore anagrafico su fattura fiscale",
    "Referto poco chiaro o incomprensibile",
    "App mobile crasha continuamente su Android"
  ];
  const ticketOwners = ["Dott. G. Rossi", "Dott.ssa M. Ferri", "Ing. S. Galli", "D. De Luca", "M. Esposito"];

  for (let i = 0; i < 20; i++) {
    const pat = patients[i % patients.length];
    const pastAppt = appointments.filter(a => a.patient_id === pat.patient_id && a.status === 'completed')[0];
    
    // Paolo Neri has an open complaint
    const isOpen = pat.patient_id === "pat_paolo" || i % 3 === 0;

    tickets.push({
      ticket_id: `tick_${i + 1}`,
      patient_id: pat.patient_id,
      appointment_id: pastAppt?.appointment_id,
      episode_id: pastAppt?.episode_id,
      category: ticketCategories[i % ticketCategories.length],
      root_cause: ticketCauses[i % ticketCauses.length],
      severity: i % 4 === 0 ? 'High' : i % 4 === 1 ? 'Critical' : 'Medium',
      owner: isOpen ? "Non assegnato" : ticketOwners[i % ticketOwners.length],
      sla_due_date: new Date(baseDate.getTime() + (2 + (i % 5)) * 24 * 3600 * 1000).toISOString().split('T')[0],
      status: isOpen ? 'open' : 'resolved',
      escalation: i % 5 === 0 && isOpen,
      created_at: new Date(baseDate.getTime() - (1 + i) * 24 * 3600 * 1000).toISOString().split('T')[0],
      updated_at: new Date(baseDate.getTime() - (i % 2) * 24 * 3600 * 1000).toISOString().split('T')[0],
      resolution_time_hours: isOpen ? undefined : 12 + (i % 48),
      notes: isOpen ? ["In attesa di riscontro dal reparto di radiologia."] : ["Contattato il paziente per telefono, fattura ricalcolata ed inviata. Problema risolto."]
    });
  }

  // Create 25 IoMT events
  const iomtEvents: IoMTEvent[] = [];
  const metrics = [
    { name: "Temperature", val: "36.8 °C", normal: true },
    { name: "Helium Level", val: "94 %", normal: true },
    { name: "Helium Level", val: "55 %", normal: false }, // warning
    { name: "CPU Utilization", val: "42 %", normal: true },
    { name: "Vibration Index", val: "1.2 mm/s", normal: true },
    { name: "Radiation Output", val: "102%", normal: true },
    { name: "Radiation Output", val: "115%", normal: false } // critical
  ];

  for (let i = 0; i < 25; i++) {
    const dev = devices[i % devices.length];
    const metric = metrics[i % metrics.length];
    
    iomtEvents.push({
      event_id: `iomt_${i + 1}`,
      device_id: dev.device_id,
      timestamp: new Date(baseDate.getTime() - (i * 30) * 60000).toISOString(),
      metric_name: metric.name,
      metric_value: metric.normal ? metric.val : (metric.name === "Helium Level" ? "52 %" : "118%"),
      status: metric.normal ? 'normal' : (metric.name === "Helium Level" ? 'warning' : 'critical')
    });
  }

  // Create 20 cyber events
  const cyberEvents: CyberEvent[] = [];
  const mitreTactics = [
    "Initial Access", "Execution", "Persistence", "Privilege Escalation", 
    "Defense Evasion", "Credential Access", "Discovery", "Lateral Movement"
  ];
  const cyberRemediations = [
    "Aggiornare patch di sicurezza firmware su device",
    "Forzare attivazione MFA su account amministratore",
    "Cambiare credenziali di default gateway IoMT",
    "Isolare porta switch di rete RM",
    "Verificare accessi anomali da rete esterna"
  ];

  for (let i = 0; i < 20; i++) {
    const dev = devices[i % devices.length];
    const isHigh = i % 4 === 0 || i % 6 === 0;
    const isMFAOff = i % 3 === 0;

    cyberEvents.push({
      cyber_event_id: `cyber_${i + 1}`,
      asset_id: dev.device_id,
      device_id: dev.device_id,
      severity: isHigh ? 'High' : (i % 8 === 0 ? 'Critical' : 'Medium'),
      mitre_tactic: mitreTactics[i % mitreTactics.length],
      timestamp: new Date(baseDate.getTime() - (i * 2) * 3600000).toISOString(),
      mfa_status: isMFAOff ? 'disabled' : 'enabled',
      privileged_account: i % 2 === 0,
      incident_linked: i % 5 === 0,
      response_time_minutes: i % 2 === 0 ? 15 + (i % 60) : undefined,
      patch_available: i % 2 === 0,
      remediation_status: i % 4 === 0 ? 'open' : (i % 4 === 1 ? 'in_progress' : 'resolved'),
      owner: isHigh ? "SOC Lead SalusCare" : "IT Team"
    });
  }

  // Create 20 notifications
  const notifications: Notification[] = [];
  const notifMsgs = [
    "Il referto della tua Risonanza Magnetica è ora disponibile online.",
    "Promemoria: Conferma la tua visita di Cardiologia prevista per domani alle 10:15.",
    "Si è liberato uno slot anticipato per la tua visita di Ortopedia!",
    "Il tuo reclamo per il pagamento della visita è in lavorazione.",
    "Fattura n° 2026/012 emessa per un importo di 120,00€."
  ];

  for (let i = 0; i < 20; i++) {
    const pat = patients[i % patients.length];
    const typeVal: Notification['type'] = i % 5 === 2 ? 'proposal' : (i % 5 === 1 ? 'warning' : 'info');
    notifications.push({
      notification_id: `notif_${i + 1}`,
      patient_id: pat.patient_id,
      message: notifMsgs[i % notifMsgs.length],
      type: typeVal,
      read: i % 3 === 0,
      created_at: new Date(baseDate.getTime() - i * 3600000).toISOString()
    });
  }

  // Create 15 operator tasks
  const operatorTasks: OperatorTask[] = [];
  const taskTitles = [
    "Recupero slot vuoto in Radiologia",
    "Chiamata reminder no-show Giovanni Bianchi",
    "Aggiornamento firmware RM Milano Centro",
    "Verifica segnalazione cyber High su TAC Roma",
    "Contatto reclamo Elena Verdi per ritardo referto",
    "Riassegnazione slot dopo disdetta Maria Rossi"
  ];
  const taskTypes: OperatorTask['type'][] = ['slot_recovery', 'patient_call', 'device_maintenance', 'cyber_remediation', 'ticket_followup', 'slot_recovery'];

  for (let i = 0; i < 15; i++) {
    operatorTasks.push({
      task_id: `task_${i + 1}`,
      type: taskTypes[i % taskTypes.length],
      title: taskTitles[i % taskTitles.length],
      description: `Risolvere tempestivamente la segnalazione in linea con le policy ospedaliere. Riferimento ID: ${i + 100}`,
      status: i % 3 === 0 ? 'pending' : (i % 3 === 1 ? 'in_progress' : 'completed'),
      assigned_to: i % 3 === 0 ? "Non assegnato" : "Operatore Rossi",
      priority: i % 4 === 0 ? 'Critical' : (i % 4 === 1 ? 'High' : 'Medium'),
      created_at: new Date(baseDate.getTime() - i * 3600000).toISOString()
    });
  }

  // Create 10 Data Quality issues
  const dataQualityIssues: DataQualityIssue[] = [
    {
      issue_id: "dq_1",
      table_name: "appointments",
      field_name: "episode_id",
      record_id: "appt_past_12",
      issue_description: "Missing or malformed Episode ID link for past appointment",
      severity: "High",
      status: "open"
    },
    {
      issue_id: "dq_2",
      table_name: "tickets",
      field_name: "root_cause",
      record_id: "tick_5",
      issue_description: "Ticket closed without formal root cause classification",
      severity: "Medium",
      status: "open"
    },
    {
      issue_id: "dq_3",
      table_name: "devices",
      field_name: "equipment_id",
      record_id: "dev_rm_2",
      issue_description: "Equipment ID does not match physical tag format",
      severity: "Low",
      status: "open"
    },
    {
      issue_id: "dq_4",
      table_name: "cyberEvents",
      field_name: "owner",
      record_id: "cyber_3",
      issue_description: "Cyber event High severity lacking assigned owner",
      severity: "High",
      status: "open"
    },
    {
      issue_id: "dq_5",
      table_name: "appointments",
      field_name: "delay_reason_code",
      record_id: "appt_past_4",
      issue_description: "Appointment had delay > 45min but delay_reason_code is empty",
      severity: "Medium",
      status: "open"
    },
    {
      issue_id: "dq_6",
      table_name: "patients",
      field_name: "phone",
      record_id: "pat_8",
      issue_description: "Incomplete mobile number format (low digital engagement)",
      severity: "Low",
      status: "open"
    },
    {
      issue_id: "dq_7",
      table_name: "invoices",
      field_name: "payer_type",
      record_id: "inv_4",
      issue_description: "Unmatched invoice payer type for insurance claim",
      severity: "Medium",
      status: "open"
    },
    {
      issue_id: "dq_8",
      table_name: "devices",
      field_name: "firmware_version",
      record_id: "dev_eco_2",
      issue_description: "Ecografo firmware reported legacy version with security vulnerabilities",
      severity: "High",
      status: "open"
    },
    {
      issue_id: "dq_9",
      table_name: "tickets",
      field_name: "episode_id",
      record_id: "tick_14",
      issue_description: "Complaint from active patient does not point to any past episode_id",
      severity: "Medium",
      status: "open"
    },
    {
      issue_id: "dq_10",
      table_name: "reports",
      field_name: "report_validated_timestamp",
      record_id: "rep_5",
      issue_description: "Report published but missing digital validation sign timestamp",
      severity: "High",
      status: "open"
    }
  ];

  const auditLog: AuditLog[] = [
    {
      log_id: "audit_init",
      timestamp: new Date(baseDate.getTime() - 24 * 3600000).toISOString(),
      user_role: "System Administrator",
      action: "DATABASE_INITIALIZATION",
      object_type: "SYSTEM",
      object_id: "SYS-001",
      previous_state: "{}",
      new_state: "{status: 'operational'}",
      reason: "Initial system bootstrap for SalusCare Digital Platform"
    }
  ];

  const eventLog: EventLog[] = [
    {
      event_id: "ev_init",
      timestamp: new Date(baseDate.getTime() - 24 * 3600000).toISOString(),
      type: "SYSTEM_INITIALIZED",
      message: "SalusCare Platform mock database successfully generated and active in localStorage",
      payload: {}
    }
  ];

  const feedback: Feedback[] = [];
  const slotProposals: SlotProposal[] = [];

  return {
    patients,
    appointments,
    slots,
    reports,
    invoices,
    tickets,
    feedback,
    notifications,
    operatorTasks,
    devices,
    iomtEvents,
    cyberEvents,
    auditLog,
    eventLog,
    dataQualityIssues,
    slotProposals
  };
};
