// Mock provider service for AI Voice Agent module
// This abstraction allows swapping mock ↔ real providers later

export interface VoiceProvider {
  type: 'mock' | 'twilio' | 'custom';
  startOutboundCall(params: { leadId: string; agentId: string; phoneNumber: string }): Promise<MockSession>;
  simulateInboundCall(params: { agentId: string; callerNumber: string }): Promise<MockSession>;
  endCall(sessionId: string): Promise<void>;
}

export interface MockSession {
  id: string;
  status: string;
  direction: string;
  startedAt: string;
  turns: MockTurn[];
  summary: string;
  sentiment: string;
  outcome: string;
  durationSeconds: number;
}

export interface MockTurn {
  role: 'agent' | 'user' | 'system';
  transcript: string;
  timestampMs: number;
  confidence: number;
}

const MOCK_CONVERSATIONS: Record<string, MockTurn[]> = {
  outbound_recruiting: [
    { role: 'system', transcript: 'Anruf wird verbunden...', timestampMs: 0, confidence: 1 },
    { role: 'agent', transcript: 'Guten Tag, hier spricht der SSM Recruiting-Assistent. Ich rufe Sie an bezüglich Ihrer Bewerbung als Finanzberater. Haben Sie kurz Zeit?', timestampMs: 1200, confidence: 0.97 },
    { role: 'user', transcript: 'Ja, hallo. Worum geht es genau?', timestampMs: 5400, confidence: 0.92 },
    { role: 'agent', transcript: 'Wir haben Ihre Unterlagen erhalten und möchten gerne einen persönlichen Termin mit Ihnen vereinbaren. Wann würde es Ihnen passen?', timestampMs: 8200, confidence: 0.95 },
    { role: 'user', transcript: 'Nächste Woche Dienstag wäre gut, am Nachmittag.', timestampMs: 14000, confidence: 0.89 },
    { role: 'agent', transcript: 'Perfekt, ich trage Dienstag Nachmittag um 14:00 Uhr ein. Sie erhalten eine Bestätigung per E-Mail. Vielen Dank und bis dann!', timestampMs: 18500, confidence: 0.96 },
    { role: 'user', transcript: 'Super, danke. Bis dann!', timestampMs: 24000, confidence: 0.93 },
    { role: 'system', transcript: 'Anruf beendet. Dauer: 28 Sekunden.', timestampMs: 28000, confidence: 1 },
  ],
  inbound_inquiry: [
    { role: 'system', transcript: 'Eingehender Anruf...', timestampMs: 0, confidence: 1 },
    { role: 'agent', transcript: 'SSM Partner, guten Tag. Wie kann ich Ihnen helfen?', timestampMs: 800, confidence: 0.98 },
    { role: 'user', transcript: 'Hallo, ich habe eine Stellenanzeige gesehen und möchte mich informieren.', timestampMs: 3200, confidence: 0.91 },
    { role: 'agent', transcript: 'Sehr gerne! Für welche Position interessieren Sie sich?', timestampMs: 7000, confidence: 0.96 },
    { role: 'user', transcript: 'Als Finanzberater, in der Region Zürich.', timestampMs: 10500, confidence: 0.88 },
    { role: 'agent', transcript: 'Wunderbar. Darf ich Ihren Namen und Ihre Kontaktdaten aufnehmen? Dann leite ich Sie an den zuständigen Berater weiter.', timestampMs: 14000, confidence: 0.95 },
    { role: 'user', transcript: 'Ja klar, ich heisse Thomas Meier, meine Nummer ist 079 123 45 67.', timestampMs: 19000, confidence: 0.87 },
    { role: 'agent', transcript: 'Vielen Dank, Herr Meier. Ein Berater wird sich heute noch bei Ihnen melden. Haben Sie sonst noch Fragen?', timestampMs: 24000, confidence: 0.94 },
    { role: 'user', transcript: 'Nein, das war alles. Vielen Dank!', timestampMs: 28000, confidence: 0.92 },
    { role: 'system', transcript: 'Anruf beendet. Dauer: 32 Sekunden.', timestampMs: 32000, confidence: 1 },
  ],
};

const uid = () => crypto.randomUUID();

export class MockVoiceProvider implements VoiceProvider {
  type: 'mock' = 'mock';

  async startOutboundCall(params: { leadId: string; agentId: string; phoneNumber: string }): Promise<MockSession> {
    await delay(800);
    const turns = MOCK_CONVERSATIONS.outbound_recruiting;
    return {
      id: uid(),
      status: 'completed',
      direction: 'outbound',
      startedAt: new Date().toISOString(),
      turns,
      summary: 'Terminvereinbarung erfolgreich. Kandidat ist interessiert und hat einen Termin für Dienstag 14:00 Uhr bestätigt.',
      sentiment: 'positive',
      outcome: 'appointment_scheduled',
      durationSeconds: 28,
    };
  }

  async simulateInboundCall(params: { agentId: string; callerNumber: string }): Promise<MockSession> {
    await delay(800);
    const turns = MOCK_CONVERSATIONS.inbound_inquiry;
    return {
      id: uid(),
      status: 'completed',
      direction: 'inbound',
      startedAt: new Date().toISOString(),
      turns,
      summary: 'Neuer Interessent Thomas Meier für Position Finanzberater in Region Zürich. Kontaktdaten aufgenommen, Weiterleitung an Berater eingeleitet.',
      sentiment: 'positive',
      outcome: 'lead_created',
      durationSeconds: 32,
    };
  }

  async endCall(_sessionId: string): Promise<void> {
    await delay(300);
  }
}

function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

// Mock data generators
export function getMockAgents() {
  return [
    {
      id: 'mock-agent-001',
      name: 'SSM Recruiting Bot',
      description: 'Automatisierter Outbound-Agent für Erstgespräche mit Kandidaten',
      agent_type: 'outbound',
      language: 'de',
      is_active: true,
      test_only: true,
      created_at: '2026-04-01T10:00:00Z',
      sessions_count: 47,
      success_rate: 78,
    },
    {
      id: 'mock-agent-002',
      name: 'SSM Inbound Assistent',
      description: 'Nimmt eingehende Anrufe entgegen und qualifiziert Interessenten',
      agent_type: 'inbound',
      language: 'de',
      is_active: false,
      test_only: true,
      created_at: '2026-04-05T14:00:00Z',
      sessions_count: 12,
      success_rate: 85,
    },
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
