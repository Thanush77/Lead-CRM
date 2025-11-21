export enum Stage {
  New = 'New',
  Contacted = 'Contacted',
  Qualified = 'Qualified',
  Proposal = 'Proposal',
  Won = 'Won',
  Lost = 'Lost'
}

export enum Status {
  Open = 'Open',
  Won = 'Won',
  Lost = 'Lost',
  OnHold = 'On Hold'
}

export enum Source {
  Website = 'Website',
  Referral = 'Referral',
  LinkedIn = 'LinkedIn',
  Event = 'Event',
  ColdCall = 'Cold Call'
}

export enum BudgetRange {
  Below1L = '<1L',
  OneToFiveL = '1–5L',
  FiveToTenL = '5–10L',
  Above10L = '>10L'
}

export enum ActivityType {
  Call = 'Call',
  Email = 'Email',
  Meeting = 'Meeting',
  WhatsApp = 'WhatsApp',
  Demo = 'Demo'
}

export enum ActivityOutcome {
  Interested = 'Interested',
  FollowUpRequired = 'Follow-up Required',
  NoResponse = 'No Response',
  NotInterested = 'Not Interested'
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'Admin' | 'Sales';
  password?: string; // Only for mock auth
  territory?: string;
}

export interface Lead {
  id: string;
  leadName: string;
  companyName: string;
  email: string;
  phone: string;
  industry: string;
  source: Source;
  budgetRange: BudgetRange;
  stage: Stage;
  status: Status;
  leadOwner: string; // User email
  leadScore: number;
  probability: number; // 0-100
  dealValue: number;
  expectedValue: number;
  nextActionType?: ActivityType;
  nextActionDateTime?: string; // ISO string
  lastContactedAt?: string; // ISO string
  createdAt: string;
  notes: string;
  suggestedEmailSubject?: string;
  suggestedEmailBody?: string;
}

export interface Activity {
  id: string;
  leadId: string;
  type: ActivityType;
  subject: string;
  description: string;
  outcome: ActivityOutcome;
  dateTime: string;
  createdBy: string;
}

export interface AIEmailResponse {
  subject: string;
  body: string;
}