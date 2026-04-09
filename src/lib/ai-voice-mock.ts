// Mock provider service for AI Voice Agent module
// This abstraction allows swapping mock ↔ real providers later

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface VoiceProvider {
  type: 'mock' | 'twilio' | 'custom';
  startOutboundCall(params: OutboundCallParams): Promise<MockSession>;
  simulateInboundCall(params: InboundCallParams): Promise<MockSession>;
  endCall(sessionId: string): Promise<void>;
}

export interface OutboundCallParams {
  leadId: string;
  agentId: string;
  phoneNumber: string;
  scenario?: ScenarioKey;
}

export interface InboundCallParams {
  agentId: string;
  callerNumber: string;
  scenario?: ScenarioKey;
}

export type CallStatus = 'ringing' | 'connected' | 'no_answer' | 'busy' | 'voicemail' | 'failed' | 'completed';
export type SessionOutcome =
  | 'appointment_scheduled' | 'not_interested' | 'callback_requested'
  | 'wrong_number' | 'lead_created' | 'escalated' | 'voicemail_left'
  | 'info_provided' | 'no_answer' | 'failed';

export type ScenarioKey =
  | 'interested' | 'not_interested' | 'callback' | 'wrong_number'
  | 'job_question' | 'appointment' | 'human_requested' | 'escalation_unclear';

export interface MockSession {
  id: string;
  status: CallStatus;
  direction: string;
  startedAt: string;
  turns: MockTurn[];
  summary: string;
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  outcome: SessionOutcome;
  durationSeconds: number;
  intents: DetectedIntent[];
  suggestedActions: SuggestedAction[];
  costs: SessionCosts;
  callStates: CallStateEvent[];
}

export interface MockTurn {
  role: 'agent' | 'user' | 'system';
  transcript: string;
  timestampMs: number;
  confidence: number;
  intent?: string;
}

export interface DetectedIntent {
  turn: number;
  intent: string;
  confidence: number;
  entities?: Record<string, string>;
}

export interface SuggestedAction {
  type: 'status_change' | 'wizard_start' | 'follow_up' | 'appointment' | 'escalation' | 'note';
  label: string;
  description: string;
  autoExecute: boolean;
  executed: boolean;
  payload: Record<string, unknown>;
}

export interface SessionCosts {
  telephony: number;
  tts: number;
  stt: number;
  aiInference: number;
  total: number;
  currency: string;
}

export interface CallStateEvent {
  state: CallStatus;
  timestamp: number;
  detail?: string;
}

// ─── Scenarios ───────────────────────────────────────────────────────────────

interface ScenarioDef {
  turns: MockTurn[];
  summary: string;
  sentiment: MockSession['sentiment'];
  outcome: SessionOutcome;
  durationSeconds: number;
  intents: DetectedIntent[];
  suggestedActions: SuggestedAction[];
  callStates: CallStateEvent[];
}

const SCENARIOS: Record<ScenarioKey, ScenarioDef> = {
  interested: {
    turns: [
      { role: 'system', transcript: 'Anruf wird verbunden...', timestampMs: 0, confidence: 1 },
      { role: 'agent', transcript: 'Guten Tag, hier spricht der SSM Recruiting-Assistent. Ich rufe Sie an bezüglich Ihrer Bewerbung als Finanzberater. Haben Sie kurz Zeit?', timestampMs: 1200, confidence: 0.97, intent: 'greeting' },
      { role: 'user', transcript: 'Ja, hallo. Worum geht es genau?', timestampMs: 5400, confidence: 0.92, intent: 'inquiry' },
      { role: 'agent', transcript: 'Wir haben Ihre Unterlagen erhalten und möchten gerne einen persönlichen Termin mit Ihnen vereinbaren. Wann würde es Ihnen passen?', timestampMs: 8200, confidence: 0.95, intent: 'appointment_offer' },
      { role: 'user', transcript: 'Nächste Woche Dienstag wäre gut, am Nachmittag.', timestampMs: 14000, confidence: 0.89, intent: 'appointment_accept' },
      { role: 'agent', transcript: 'Perfekt, ich trage Dienstag Nachmittag um 14:00 Uhr ein. Sie erhalten eine Bestätigung per E-Mail. Vielen Dank und bis dann!', timestampMs: 18500, confidence: 0.96 },
      { role: 'user', transcript: 'Super, danke. Bis dann!', timestampMs: 24000, confidence: 0.93 },
      { role: 'system', transcript: 'Anruf beendet. Dauer: 28 Sekunden.', timestampMs: 28000, confidence: 1 },
    ],
    summary: 'Terminvereinbarung erfolgreich. Kandidat ist interessiert und hat einen Termin für Dienstag 14:00 Uhr bestätigt.',
    sentiment: 'positive',
    outcome: 'appointment_scheduled',
    durationSeconds: 28,
    intents: [
      { turn: 2, intent: 'inquiry', confidence: 0.92 },
      { turn: 4, intent: 'appointment_accept', confidence: 0.89, entities: { day: 'Dienstag', time: 'Nachmittag' } },
    ],
    suggestedActions: [
      { type: 'appointment', label: 'Termin erstellen', description: 'Di 14:00 Uhr Erstgespräch', autoExecute: true, executed: true, payload: { day: 'Dienstag', time: '14:00' } },
      { type: 'status_change', label: 'Status → Terminiert', description: 'Lead-Status auf "Terminiert" setzen', autoExecute: true, executed: true, payload: { newStatus: 'terminiert' } },
      { type: 'note', label: 'Notiz erstellen', description: 'Gesprächszusammenfassung speichern', autoExecute: true, executed: true, payload: {} },
    ],
    callStates: [
      { state: 'ringing', timestamp: 0 },
      { state: 'connected', timestamp: 1200 },
      { state: 'completed', timestamp: 28000 },
    ],
  },

  not_interested: {
    turns: [
      { role: 'system', transcript: 'Anruf wird verbunden...', timestampMs: 0, confidence: 1 },
      { role: 'agent', transcript: 'Guten Tag, hier spricht der SSM Recruiting-Assistent. Ich kontaktiere Sie bezüglich einer Karrieremöglichkeit als Finanzberater.', timestampMs: 1200, confidence: 0.97 },
      { role: 'user', transcript: 'Nein danke, ich habe kein Interesse.', timestampMs: 4500, confidence: 0.95, intent: 'rejection' },
      { role: 'agent', transcript: 'Verstehe ich. Darf ich fragen, warum? Vielleicht kann ich Ihnen noch weitere Informationen geben.', timestampMs: 7000, confidence: 0.93 },
      { role: 'user', transcript: 'Ich habe bereits eine Stelle. Bitte rufen Sie mich nicht mehr an.', timestampMs: 11000, confidence: 0.94, intent: 'opt_out' },
      { role: 'agent', transcript: 'Selbstverständlich. Ich wünsche Ihnen alles Gute. Auf Wiederhören.', timestampMs: 14000, confidence: 0.96 },
      { role: 'system', transcript: 'Anruf beendet. Dauer: 16 Sekunden.', timestampMs: 16000, confidence: 1 },
    ],
    summary: 'Kandidat hat kein Interesse, ist bereits anderweitig angestellt. Wünscht keine weiteren Anrufe.',
    sentiment: 'negative',
    outcome: 'not_interested',
    durationSeconds: 16,
    intents: [
      { turn: 2, intent: 'rejection', confidence: 0.95 },
      { turn: 4, intent: 'opt_out', confidence: 0.94 },
    ],
    suggestedActions: [
      { type: 'status_change', label: 'Status → Nicht interessiert', description: 'Lead als nicht interessiert markieren', autoExecute: true, executed: true, payload: { newStatus: 'not_interested' } },
      { type: 'note', label: 'Opt-out Notiz', description: 'Kontaktsperre vermerken', autoExecute: true, executed: true, payload: { optOut: true } },
    ],
    callStates: [
      { state: 'ringing', timestamp: 0 },
      { state: 'connected', timestamp: 1200 },
      { state: 'completed', timestamp: 16000 },
    ],
  },

  callback: {
    turns: [
      { role: 'system', transcript: 'Anruf wird verbunden...', timestampMs: 0, confidence: 1 },
      { role: 'agent', transcript: 'Guten Tag, hier spricht der SSM Recruiting-Assistent.', timestampMs: 1200, confidence: 0.97 },
      { role: 'user', transcript: 'Hallo, ich bin gerade im Meeting. Können Sie mich später nochmal anrufen?', timestampMs: 3500, confidence: 0.91, intent: 'callback_request' },
      { role: 'agent', transcript: 'Natürlich! Wann passt es Ihnen am besten?', timestampMs: 6000, confidence: 0.95 },
      { role: 'user', transcript: 'Heute Nachmittag ab 15 Uhr wäre gut.', timestampMs: 8500, confidence: 0.88, intent: 'time_preference' },
      { role: 'agent', transcript: 'Alles klar, wir rufen Sie heute um 15 Uhr zurück. Vielen Dank!', timestampMs: 11000, confidence: 0.96 },
      { role: 'system', transcript: 'Anruf beendet. Dauer: 13 Sekunden.', timestampMs: 13000, confidence: 1 },
    ],
    summary: 'Kandidat im Meeting. Rückruf gewünscht um 15:00 Uhr.',
    sentiment: 'neutral',
    outcome: 'callback_requested',
    durationSeconds: 13,
    intents: [
      { turn: 2, intent: 'callback_request', confidence: 0.91 },
      { turn: 4, intent: 'time_preference', confidence: 0.88, entities: { time: '15:00' } },
    ],
    suggestedActions: [
      { type: 'follow_up', label: 'Rückruf planen', description: 'Rückruf um 15:00 Uhr einplanen', autoExecute: true, executed: true, payload: { callbackTime: '15:00' } },
      { type: 'note', label: 'Notiz', description: 'War im Meeting, Rückruf gewünscht', autoExecute: true, executed: true, payload: {} },
    ],
    callStates: [
      { state: 'ringing', timestamp: 0 },
      { state: 'connected', timestamp: 1200 },
      { state: 'completed', timestamp: 13000 },
    ],
  },

  wrong_number: {
    turns: [
      { role: 'system', transcript: 'Anruf wird verbunden...', timestampMs: 0, confidence: 1 },
      { role: 'agent', transcript: 'Guten Tag, hier spricht der SSM Recruiting-Assistent. Spreche ich mit Frau Müller?', timestampMs: 1200, confidence: 0.97 },
      { role: 'user', transcript: 'Nein, hier ist keine Frau Müller. Sie haben die falsche Nummer.', timestampMs: 4000, confidence: 0.93, intent: 'wrong_number' },
      { role: 'agent', transcript: 'Oh, das tut mir leid! Entschuldigen Sie die Störung. Auf Wiederhören.', timestampMs: 7000, confidence: 0.96 },
      { role: 'system', transcript: 'Anruf beendet. Dauer: 9 Sekunden.', timestampMs: 9000, confidence: 1 },
    ],
    summary: 'Falsche Nummer. Zielperson nicht unter dieser Nummer erreichbar.',
    sentiment: 'neutral',
    outcome: 'wrong_number',
    durationSeconds: 9,
    intents: [{ turn: 2, intent: 'wrong_number', confidence: 0.93 }],
    suggestedActions: [
      { type: 'status_change', label: 'Nummer als falsch markieren', description: 'Telefonnummer als ungültig markieren', autoExecute: false, executed: false, payload: { invalidNumber: true } },
      { type: 'note', label: 'Notiz', description: 'Falsche Nummer – Zielperson nicht erreichbar', autoExecute: true, executed: true, payload: {} },
    ],
    callStates: [
      { state: 'ringing', timestamp: 0 },
      { state: 'connected', timestamp: 1200 },
      { state: 'completed', timestamp: 9000 },
    ],
  },

  job_question: {
    turns: [
      { role: 'system', transcript: 'Eingehender Anruf...', timestampMs: 0, confidence: 1 },
      { role: 'agent', transcript: 'SSM Partner, guten Tag. Wie kann ich Ihnen helfen?', timestampMs: 800, confidence: 0.98 },
      { role: 'user', transcript: 'Hallo, ich habe eine Stellenanzeige gesehen und hätte ein paar Fragen dazu.', timestampMs: 3200, confidence: 0.91, intent: 'job_inquiry' },
      { role: 'agent', transcript: 'Gerne! Um welche Position geht es?', timestampMs: 6000, confidence: 0.96 },
      { role: 'user', transcript: 'Finanzberater. Wie ist das Gehalt und braucht man Erfahrung?', timestampMs: 9000, confidence: 0.87, intent: 'salary_inquiry' },
      { role: 'agent', transcript: 'Als Finanzberater bei SSM erhalten Sie ein attraktives Fixgehalt plus leistungsabhängige Vergütung. Quereinsteiger sind willkommen – wir bieten eine umfassende Ausbildung.', timestampMs: 13000, confidence: 0.95 },
      { role: 'user', transcript: 'Das klingt gut. Kann ich mich online bewerben?', timestampMs: 18000, confidence: 0.90, intent: 'application_interest' },
      { role: 'agent', transcript: 'Selbstverständlich! Ich sende Ihnen den Link per SMS. Darf ich Ihren Namen und Ihre Nummer notieren?', timestampMs: 21000, confidence: 0.94 },
      { role: 'user', transcript: 'Ja, ich bin Sandra Fischer, 078 456 78 90.', timestampMs: 25000, confidence: 0.86, intent: 'provide_contact' },
      { role: 'agent', transcript: 'Vielen Dank, Frau Fischer! Sie erhalten gleich den Bewerbungslink. Viel Erfolg!', timestampMs: 29000, confidence: 0.96 },
      { role: 'system', transcript: 'Anruf beendet. Dauer: 33 Sekunden.', timestampMs: 33000, confidence: 1 },
    ],
    summary: 'Interessentin Sandra Fischer hat Fragen zur Finanzberater-Stelle. Kontaktdaten aufgenommen, Bewerbungslink wird versendet.',
    sentiment: 'positive',
    outcome: 'lead_created',
    durationSeconds: 33,
    intents: [
      { turn: 2, intent: 'job_inquiry', confidence: 0.91 },
      { turn: 4, intent: 'salary_inquiry', confidence: 0.87 },
      { turn: 6, intent: 'application_interest', confidence: 0.90 },
      { turn: 8, intent: 'provide_contact', confidence: 0.86, entities: { name: 'Sandra Fischer', phone: '078 456 78 90' } },
    ],
    suggestedActions: [
      { type: 'status_change', label: 'Neuen Lead erstellen', description: 'Sandra Fischer als Lead anlegen', autoExecute: true, executed: true, payload: { name: 'Sandra Fischer', phone: '078 456 78 90' } },
      { type: 'wizard_start', label: 'Bewerbungs-Link senden', description: 'Bewerbungsformular-Link per SMS versenden', autoExecute: false, executed: false, payload: {} },
      { type: 'note', label: 'Notiz', description: 'Inbound-Anfrage zu Finanzberater-Stelle', autoExecute: true, executed: true, payload: {} },
    ],
    callStates: [
      { state: 'ringing', timestamp: 0 },
      { state: 'connected', timestamp: 800 },
      { state: 'completed', timestamp: 33000 },
    ],
  },

  appointment: {
    turns: [
      { role: 'system', transcript: 'Anruf wird verbunden...', timestampMs: 0, confidence: 1 },
      { role: 'agent', transcript: 'Guten Tag, hier ist der SSM Recruiting-Assistent. Wir hatten uns letzte Woche unterhalten. Ich rufe an um einen Termin zu bestätigen.', timestampMs: 1200, confidence: 0.97 },
      { role: 'user', transcript: 'Ja genau, ich erinnere mich. Wann genau?', timestampMs: 5000, confidence: 0.92 },
      { role: 'agent', transcript: 'Wir hätten diesen Donnerstag um 10:00 Uhr oder Freitag um 14:00 Uhr. Was passt Ihnen besser?', timestampMs: 8000, confidence: 0.95 },
      { role: 'user', transcript: 'Freitag 14 Uhr ist perfekt.', timestampMs: 11000, confidence: 0.93, intent: 'appointment_confirm' },
      { role: 'agent', transcript: 'Wunderbar. Der Termin ist eingetragen. Sie erhalten eine Bestätigung per E-Mail. Bis Freitag!', timestampMs: 14500, confidence: 0.96 },
      { role: 'system', transcript: 'Anruf beendet. Dauer: 17 Sekunden.', timestampMs: 17000, confidence: 1 },
    ],
    summary: 'Termin für Freitag 14:00 Uhr bestätigt.',
    sentiment: 'positive',
    outcome: 'appointment_scheduled',
    durationSeconds: 17,
    intents: [{ turn: 4, intent: 'appointment_confirm', confidence: 0.93, entities: { day: 'Freitag', time: '14:00' } }],
    suggestedActions: [
      { type: 'appointment', label: 'Termin eintragen', description: 'Freitag 14:00 Erstgespräch', autoExecute: true, executed: true, payload: { day: 'Freitag', time: '14:00' } },
      { type: 'status_change', label: 'Status → Terminiert', description: '', autoExecute: true, executed: true, payload: { newStatus: 'terminiert' } },
    ],
    callStates: [
      { state: 'ringing', timestamp: 0 },
      { state: 'connected', timestamp: 1200 },
      { state: 'completed', timestamp: 17000 },
    ],
  },

  human_requested: {
    turns: [
      { role: 'system', transcript: 'Anruf wird verbunden...', timestampMs: 0, confidence: 1 },
      { role: 'agent', transcript: 'Guten Tag, hier spricht der SSM Recruiting-Assistent.', timestampMs: 1200, confidence: 0.97 },
      { role: 'user', transcript: 'Hallo. Ich möchte nicht mit einem Computer sprechen. Können Sie mich bitte mit einem echten Menschen verbinden?', timestampMs: 4000, confidence: 0.94, intent: 'human_handover' },
      { role: 'agent', transcript: 'Selbstverständlich! Ich verbinde Sie sofort mit einem persönlichen Berater. Einen Moment bitte.', timestampMs: 7500, confidence: 0.96 },
      { role: 'system', transcript: 'Übergabe an menschlichen Berater eingeleitet...', timestampMs: 9000, confidence: 1 },
      { role: 'system', transcript: 'Anruf übergeben. Dauer: 10 Sekunden.', timestampMs: 10000, confidence: 1 },
    ],
    summary: 'Kandidat wünscht Kontakt mit menschlichem Berater. Sofortige Übergabe eingeleitet.',
    sentiment: 'neutral',
    outcome: 'escalated',
    durationSeconds: 10,
    intents: [{ turn: 2, intent: 'human_handover', confidence: 0.94 }],
    suggestedActions: [
      { type: 'escalation', label: 'An Berater übergeben', description: 'Sofortige Übergabe an menschlichen Mitarbeiter', autoExecute: true, executed: true, payload: { priority: 'high' } },
      { type: 'note', label: 'Notiz', description: 'Kandidat wünscht menschlichen Kontakt', autoExecute: true, executed: true, payload: {} },
    ],
    callStates: [
      { state: 'ringing', timestamp: 0 },
      { state: 'connected', timestamp: 1200 },
      { state: 'completed', timestamp: 10000, detail: 'handover' },
    ],
  },

  escalation_unclear: {
    turns: [
      { role: 'system', transcript: 'Anruf wird verbunden...', timestampMs: 0, confidence: 1 },
      { role: 'agent', transcript: 'Guten Tag, hier ist der SSM Recruiting-Assistent.', timestampMs: 1200, confidence: 0.97 },
      { role: 'user', transcript: 'Ja hallo. Ich bin mir nicht sicher, ob das Angebot für mich passt. Ich habe schon Erfahrung, aber in einer anderen Branche.', timestampMs: 4500, confidence: 0.85, intent: 'uncertain' },
      { role: 'agent', transcript: 'Verstehe ich. Darf ich fragen, in welcher Branche Sie tätig sind?', timestampMs: 9000, confidence: 0.93 },
      { role: 'user', transcript: 'Ich bin im Versicherungsbereich, aber mehr technisch. Keine Ahnung ob Finanzberatung etwas für mich wäre.', timestampMs: 14000, confidence: 0.82, intent: 'uncertain' },
      { role: 'agent', transcript: 'Das ist ein interessanter Hintergrund. Lassen Sie mich das mit einem erfahrenen Karriereberater besprechen. Er kann Ihnen individuell Auskunft geben.', timestampMs: 19000, confidence: 0.91 },
      { role: 'user', transcript: 'Ja, das wäre gut. Aber bitte nicht zu viel Druck.', timestampMs: 23000, confidence: 0.87 },
      { role: 'agent', transcript: 'Absolut kein Druck. Ein Berater wird sich freundlich bei Ihnen melden. Vielen Dank für Ihr Interesse!', timestampMs: 27000, confidence: 0.95 },
      { role: 'system', transcript: 'Anruf beendet. Dauer: 30 Sekunden.', timestampMs: 30000, confidence: 1 },
    ],
    summary: 'Kandidat unsicher, kommt aus Versicherungsbranche (technisch). Braucht persönliche Beratung. Weiterleitung an erfahrenen Karriereberater empfohlen.',
    sentiment: 'mixed',
    outcome: 'escalated',
    durationSeconds: 30,
    intents: [
      { turn: 2, intent: 'uncertain', confidence: 0.85 },
      { turn: 4, intent: 'uncertain', confidence: 0.82 },
    ],
    suggestedActions: [
      { type: 'escalation', label: 'Karriereberatung zuweisen', description: 'Erfahrenen Berater für persönliches Gespräch zuweisen', autoExecute: false, executed: false, payload: { priority: 'medium', reason: 'uncertain_candidate' } },
      { type: 'status_change', label: 'Status → Zu prüfen', description: 'Lead zur manuellen Prüfung markieren', autoExecute: false, executed: false, payload: { newStatus: 'review' } },
      { type: 'note', label: 'Notiz', description: 'Versicherungsbranche, technisch, unsicher. Braucht persönliche Beratung.', autoExecute: true, executed: true, payload: {} },
    ],
    callStates: [
      { state: 'ringing', timestamp: 0 },
      { state: 'connected', timestamp: 1200 },
      { state: 'completed', timestamp: 30000 },
    ],
  },
};

// ─── No-connect scenarios (no turns) ─────────────────────────────────────────

function makeNoConnectSession(status: CallStatus, outcome: SessionOutcome, detail: string): ScenarioDef {
  return {
    turns: [
      { role: 'system', transcript: `Anruf wird verbunden...`, timestampMs: 0, confidence: 1 },
      { role: 'system', transcript: detail, timestampMs: 15000, confidence: 1 },
    ],
    summary: detail,
    sentiment: 'neutral',
    outcome,
    durationSeconds: 0,
    intents: [],
    suggestedActions: [
      { type: 'follow_up', label: 'Erneut versuchen', description: 'Rückrufversuch planen', autoExecute: false, executed: false, payload: {} },
    ],
    callStates: [
      { state: 'ringing', timestamp: 0 },
      { state: status, timestamp: 15000 },
    ],
  };
}

// ─── Mock Provider ───────────────────────────────────────────────────────────

const uid = () => crypto.randomUUID();

function buildSession(scenario: ScenarioDef, direction: string): MockSession {
  const baseCost = scenario.durationSeconds * 0.02;
  return {
    id: uid(),
    status: scenario.callStates[scenario.callStates.length - 1].state,
    direction,
    startedAt: new Date().toISOString(),
    turns: scenario.turns,
    summary: scenario.summary,
    sentiment: scenario.sentiment,
    outcome: scenario.outcome,
    durationSeconds: scenario.durationSeconds,
    intents: scenario.intents,
    suggestedActions: scenario.suggestedActions,
    costs: {
      telephony: +(baseCost * 0.35).toFixed(2),
      tts: +(baseCost * 0.25).toFixed(2),
      stt: +(baseCost * 0.22).toFixed(2),
      aiInference: +(baseCost * 0.18).toFixed(2),
      total: +baseCost.toFixed(2),
      currency: 'CHF',
    },
    callStates: scenario.callStates,
  };
}

function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

export class MockVoiceProvider implements VoiceProvider {
  type: 'mock' = 'mock';

  async startOutboundCall(params: OutboundCallParams): Promise<MockSession> {
    await delay(800 + Math.random() * 400);
    const key = params.scenario ?? 'interested';
    const scenario = SCENARIOS[key] ?? SCENARIOS.interested;
    return buildSession(scenario, 'outbound');
  }

  async simulateInboundCall(params: InboundCallParams): Promise<MockSession> {
    await delay(800 + Math.random() * 400);
    const key = params.scenario ?? 'job_question';
    const scenario = SCENARIOS[key] ?? SCENARIOS.job_question;
    return buildSession(scenario, 'inbound');
  }

  async endCall(_sessionId: string): Promise<void> {
    await delay(300);
  }

  /** Simulate a no-connect call (no_answer / busy / voicemail / failed) */
  async simulateNoConnect(type: 'no_answer' | 'busy' | 'voicemail' | 'failed'): Promise<MockSession> {
    await delay(600);
    const details: Record<string, string> = {
      no_answer: 'Keine Antwort nach 6 Klingelzeichen.',
      busy: 'Leitung besetzt.',
      voicemail: 'Anrufbeantworter erreicht. Nachricht hinterlassen.',
      failed: 'Verbindungsfehler: Nummer nicht erreichbar.',
    };
    const def = makeNoConnectSession(type, type === 'voicemail' ? 'voicemail_left' : type === 'failed' ? 'failed' : 'no_answer', details[type]);
    return buildSession(def, 'outbound');
  }
}

// ─── Scenario metadata for UI ────────────────────────────────────────────────

export const SCENARIO_OPTIONS: { key: ScenarioKey; label: string; direction: 'outbound' | 'inbound'; description: string }[] = [
  { key: 'interested', label: 'Kandidat interessiert', direction: 'outbound', description: 'Erfolgreiche Terminvereinbarung' },
  { key: 'not_interested', label: 'Nicht interessiert', direction: 'outbound', description: 'Ablehnung mit Opt-out' },
  { key: 'callback', label: 'Rückruf gewünscht', direction: 'outbound', description: 'Kandidat im Meeting, Rückruf um 15 Uhr' },
  { key: 'wrong_number', label: 'Falsche Nummer', direction: 'outbound', description: 'Nummer gehört einer anderen Person' },
  { key: 'job_question', label: 'Frage zur Stelle', direction: 'inbound', description: 'Inbound-Anfrage mit Lead-Erstellung' },
  { key: 'appointment', label: 'Termin vereinbart', direction: 'outbound', description: 'Follow-up Call mit Terminbestätigung' },
  { key: 'human_requested', label: 'Mensch verlangt', direction: 'outbound', description: 'Sofortige Übergabe an Berater' },
  { key: 'escalation_unclear', label: 'Unsicherer Fall', direction: 'outbound', description: 'Kandidat unsicher, Eskalation empfohlen' },
];

// ─── Mock data generators for dashboard / other tabs ─────────────────────────

export function getMockAgents() {
  return [
    { id: 'mock-agent-001', name: 'SSM Recruiting Bot', description: 'Automatisierter Outbound-Agent für Erstgespräche', agent_type: 'outbound', language: 'de', is_active: true, test_only: true, created_at: '2026-04-01T10:00:00Z', sessions_count: 47, success_rate: 78 },
    { id: 'mock-agent-002', name: 'SSM Inbound Assistent', description: 'Nimmt eingehende Anrufe entgegen und qualifiziert Interessenten', agent_type: 'inbound', language: 'de', is_active: false, test_only: true, created_at: '2026-04-05T14:00:00Z', sessions_count: 12, success_rate: 85 },
  ];
}

export function getMockSessions() {
  return [
    { id: 's1', agent_name: 'SSM Recruiting Bot', lead_name: 'Max Mustermann', direction: 'outbound', status: 'completed', duration_seconds: 28, sentiment: 'positive', outcome: 'appointment_scheduled', created_at: '2026-04-09T09:15:00Z', is_test: true },
    { id: 's2', agent_name: 'SSM Inbound Assistent', lead_name: 'Thomas Meier', direction: 'inbound', status: 'completed', duration_seconds: 32, sentiment: 'positive', outcome: 'lead_created', created_at: '2026-04-09T08:45:00Z', is_test: true },
    { id: 's3', agent_name: 'SSM Recruiting Bot', lead_name: 'Anna Keller', direction: 'outbound', status: 'no_answer', duration_seconds: 0, sentiment: 'neutral', outcome: 'no_answer', created_at: '2026-04-08T16:30:00Z', is_test: true },
    { id: 's4', agent_name: 'SSM Recruiting Bot', lead_name: 'Peter Schmid', direction: 'outbound', status: 'completed', duration_seconds: 45, sentiment: 'negative', outcome: 'not_interested', created_at: '2026-04-08T14:00:00Z', is_test: true },
    { id: 's5', agent_name: 'SSM Recruiting Bot', lead_name: 'Lisa Weber', direction: 'outbound', status: 'completed', duration_seconds: 35, sentiment: 'positive', outcome: 'callback_requested', created_at: '2026-04-08T11:20:00Z', is_test: true },
  ];
}

export function getMockCampaigns() {
  return [
    { id: 'c1', name: 'Frühlings-Recruiting 2026', agent_name: 'SSM Recruiting Bot', status: 'running', total_calls: 120, completed_calls: 47, success_rate: 78, created_at: '2026-04-01T00:00:00Z' },
    { id: 'c2', name: 'Zürich Region Inbound', agent_name: 'SSM Inbound Assistent', status: 'draft', total_calls: 0, completed_calls: 0, success_rate: 0, created_at: '2026-04-05T00:00:00Z' },
  ];
}

export function getMockCostData() {
  return {
    totalCost: 127.50,
    currency: 'CHF',
    breakdown: [
      { type: 'call', label: 'Telefonie', amount: 45.20, percentage: 35 },
      { type: 'tts', label: 'Text-to-Speech', amount: 32.80, percentage: 26 },
      { type: 'stt', label: 'Speech-to-Text', amount: 28.50, percentage: 22 },
      { type: 'ai_inference', label: 'KI-Inferenz', amount: 21.00, percentage: 17 },
    ],
    dailyTrend: [
      { date: '04.04', cost: 15.20 },
      { date: '05.04', cost: 22.40 },
      { date: '06.04', cost: 18.90 },
      { date: '07.04', cost: 25.60 },
      { date: '08.04', cost: 28.10 },
      { date: '09.04', cost: 17.30 },
    ],
  };
}
