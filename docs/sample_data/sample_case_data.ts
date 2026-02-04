
import { Exhibit, TimelineEvent, Witness, Injury, Violation } from '../types';
import { CASE_CONFIG } from './CaseConfig';

export const INITIAL_EXHIBITS: Exhibit[] = [
  {
    id: 'ex-demo-01',
    workspaceId: 'demo-workspace',
    matterId: 'demo-matter',
    filename: 'police_report.pdf',
    storageKey: 'police_report_key',
    createdAt: new Date().toISOString(),
    // Added integrityHash to fix missing property error in INITIAL_EXHIBITS
    integrityHash: 'sha256:d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8',
    driveId: 'demo-police-report',
    label: 'Exhibit A',
    batesNumber: '[BATES_0001]',
    category: 'CRIMINAL',
    title: 'Incident Record: Forensic Audit 001',
    date: '2025-01-01',
    mimeType: 'application/pdf',
    extractedText: `[${CASE_CONFIG.brandName} Forensic Scan: Protocol Active]`,
    summary: 'Documentation of initial confrontation. Respondent admitted to initiating contact with Plaintiff. Credibility gaps identified in Respondent statement regarding provocation.',
    type: 'LAW ENFORCEMENT RECORD',
    keyFacts: [
      { fact: 'Timestamp of onset verified via digital metadata.', citation: '[BATES_0001]', reasoning: 'Digital forensic audit.', verified: true },
      { fact: 'Admission of physical initiation recorded in initial statement.', citation: '[BATES_0001]', reasoning: 'Direct statement.', verified: true },
      { fact: 'Discontinuity identified in surveillance feed; requires forensic recovery.', citation: '[BATES_0001]', reasoning: 'Video analysis gap.', verified: true },
      { fact: 'Witness corroboration of Plaintiff de-escalation attempts.', citation: '[BATES_0001]', reasoning: 'Witness 1 statement.', verified: true }
    ],
    mentions: ['Plaintiff', 'Respondent', 'Witness 1', 'Witness 2', 'Responding Officer'],
    legalRelevance: 'Statutory Violation: Primary Physical Confrontation. Evidence of intent and unprovoked initiation.',
    admissions: [
      { fact: '"I initiated the physical confrontation."', citation: '[BATES_0001]', reasoning: 'Self-incrimination.', verified: true },
      { fact: '"I was under the influence of cognitive inhibitors."', citation: '[BATES_0001]', reasoning: 'Admission of impairment.', verified: true }
    ],
    witnessInfo: 'Bystander accounts corroborate Plaintiff version of event mechanics.',
    injuries: [
      { fact: 'Soft tissue trauma', citation: '[BATES_0001]', reasoning: 'Initial assessment.', verified: true },
      { fact: 'Acute stress response', citation: '[BATES_0001]', reasoning: 'Psychological assessment.', verified: true }
    ],
    veracityScore: 98,
    verificationStatus: 'CERTIFIED',
    billableHoursSaved: 2.5
  },
  {
    id: 'ex-demo-02',
    workspaceId: 'demo-workspace',
    matterId: 'demo-matter',
    filename: 'medical_record.pdf',
    storageKey: 'medical_report_key',
    createdAt: new Date().toISOString(),
    // Added integrityHash to fix missing property error in INITIAL_EXHIBITS
    integrityHash: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    driveId: 'demo-medical',
    label: 'Exhibit B',
    batesNumber: '[BATES_0002]',
    category: 'MEDICAL',
    title: 'Clinical Evaluation & Diagnostic Matrix',
    date: '2025-01-02',
    mimeType: 'application/pdf',
    extractedText: `[${CASE_CONFIG.brandName} Medical Analysis: ICD-10 Coding Active]`,
    summary: 'Clinical documentation of trauma. Diagnostics confirm soft tissue contusion consistent with reported mechanics of impact. Proximate cause mapping suggests 95% correlation.',
    type: 'MEDICAL EVALUATION',
    keyFacts: [
      { fact: 'Diagnostic Code verified: S40.011A.', citation: '[BATES_0002]', reasoning: 'Clinical verification.', verified: true },
      { fact: 'Physiological indicators (Tachycardia) consistent with reported trauma event.', citation: '[BATES_0002]', reasoning: 'Triage records.', verified: true },
      { fact: 'Treatment regimen initiated: Analgesics and therapeutic muscle relaxants.', citation: '[BATES_0002]', reasoning: 'Prescription history.', verified: true },
      { fact: 'Imaging confirms significant edema without skeletal fracture.', citation: '[BATES_0002]', reasoning: 'Radiology report.', verified: true }
    ],
    mentions: ['Evaluating Physician', 'Plaintiff'],
    legalRelevance: 'Proximate Cause: Injuries are bio-mechanically consistent with force mechanics described in Exhibit A.',
    admissions: [],
    witnessInfo: 'Medical staff observations of acute physical trauma.',
    injuries: [
      { fact: 'Contusion', citation: '[BATES_0002]', reasoning: 'Visual exam.', verified: true },
      { fact: 'Acute Anxiety', citation: '[BATES_0002]', reasoning: 'Clinical observation.', verified: true },
      { fact: 'Localized Edema', citation: '[BATES_0002]', reasoning: 'Visual exam.', verified: true }
    ],
    veracityScore: 100,
    verificationStatus: 'CERTIFIED',
    billableHoursSaved: 1.8
  }
];

export const INITIAL_TIMELINE: TimelineEvent[] = [
  {
    id: 't-demo-01',
    date: '2025-01-01',
    title: 'Primary Incident Sequence',
    description: 'Onset of unprovoked confrontation. Respondent initiates physical contact. Surveillance continuity break identified.',
    category: 'assault',
    exhibitIds: ['Exhibit A']
  },
  {
    id: 't-demo-02',
    date: '2025-01-02',
    title: 'Clinical Forensic Verification',
    description: 'Diagnostic mapping of physical trauma. Medical-legal nexus established via physician evaluation.',
    category: 'medical',
    exhibitIds: ['Exhibit B']
  }
];

export const INITIAL_WITNESSES: Witness[] = [
  {
    id: 'w-demo-01',
    name: 'Witness 1',
    role: 'Bystander / Observer',
    testimony: 'Corroborates unprovoked nature of confrontation. Observed Respondent initiating physical contact.',
    exhibits: ['Exhibit A'],
    reliability: 'High'
  }
];

export const INITIAL_INJURIES: Injury[] = [
  {
    diagnosis: 'Traumatic Contusion (ICD-10 S40.011A)',
    date: '2025-01-02',
    bodyPart: 'Localized Area',
    symptoms: ['Acute Pain', 'Edema', 'Reduced Function'],
    treatment: 'Pharmacological intervention and rest.',
    exhibitRef: 'Exhibit B'
  }
];

export const INITIAL_VIOLATIONS: Violation[] = [
  {
    type: 'Statutory Liability Breach',
    description: 'Respondent failed to comply with established safety/legal protocols resulting in physical injury.',
    citation: 'Exhibit A',
    evidenceStrength: 'Strong'
  }
];
