/**
 * AI Voice Agent – Provider Adapter Interfaces & Mock Implementations
 * 
 * All external provider integrations go through these interfaces.
 * Swap mock → real by replacing adapter instances in the registry.
 */

// ── Common Types ──────────────────────────────────────────────────

export interface ProviderHealth {
  status: 'healthy' | 'degraded' | 'offline';
  latencyMs: number;
  lastCheckedAt: string;
  details?: Record<string, unknown>;
}

export interface ProviderCredentials {
  apiKey?: string;
  accountSid?: string;
  secret?: string;
  webhookUrl?: string;
  region?: string;
}

// ── 1. Telephony Adapter ──────────────────────────────────────────

export interface TelephonyCallParams {
  to: string;
  from: string;
  agentId: string;
  sessionId: string;
  metadata?: Record<string, unknown>;
}

export interface TelephonyCallResult {
  providerCallId: string;
  status: 'initiated' | 'ringing' | 'connected' | 'failed';
  startedAt: string;
}

export interface TelephonyAdapterInterface {
  readonly providerType: string;
  initiateCall(params: TelephonyCallParams): Promise<TelephonyCallResult>;
  endCall(providerCallId: string): Promise<void>;
  getCallStatus(providerCallId: string): Promise<string>;
  healthCheck(): Promise<ProviderHealth>;
}

// ── 2. Voice AI Adapter ───────────────────────────────────────────

export interface VoiceAIStreamParams {
  sessionId: string;
  systemPrompt: string;
  greetingMessage: string;
  language: string;
  voiceId: string;
  knowledgeContext?: string;
}

export interface VoiceAITurn {
  role: 'agent' | 'user';
  transcript: string;
  confidence: number;
  intent?: string;
  durationMs: number;
  latencyMs: number;
}

export interface VoiceAIAdapterInterface {
  readonly providerType: string;
  startStream(params: VoiceAIStreamParams): Promise<{ streamId: string }>;
  endStream(streamId: string): Promise<VoiceAITurn[]>;
  processUserAudio(streamId: string, audioChunk: ArrayBuffer): Promise<VoiceAITurn | null>;
  healthCheck(): Promise<ProviderHealth>;
}

// ── 3. Transcription Adapter ──────────────────────────────────────

export interface TranscriptionRequest {
  audioUrl?: string;
  audioData?: ArrayBuffer;
  language: string;
  speakerDiarization?: boolean;
}

export interface TranscriptionResult {
  text: string;
  segments: { start: number; end: number; text: string; speaker?: string }[];
  language: string;
  confidence: number;
  durationMs: number;
}

export interface TranscriptionAdapterInterface {
  readonly providerType: string;
  transcribe(request: TranscriptionRequest): Promise<TranscriptionResult>;
  healthCheck(): Promise<ProviderHealth>;
}

// ── 4. Storage Adapter ────────────────────────────────────────────

export interface StorageUploadParams {
  key: string;
  data: ArrayBuffer | Blob;
  contentType: string;
  metadata?: Record<string, string>;
}

export interface StorageAdapterInterface {
  readonly providerType: string;
  upload(params: StorageUploadParams): Promise<{ url: string; key: string }>;
  getSignedUrl(key: string, expiresInSeconds: number): Promise<string>;
  delete(key: string): Promise<void>;
  healthCheck(): Promise<ProviderHealth>;
}

// ── 5. Webhook Adapter ────────────────────────────────────────────

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
  signature?: string;
}

export interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  responseTime: number;
  error?: string;
}

export interface WebhookAdapterInterface {
  readonly providerType: string;
  dispatch(url: string, payload: WebhookPayload): Promise<WebhookDeliveryResult>;
  validateSignature(payload: string, signature: string, secret: string): boolean;
  healthCheck(): Promise<ProviderHealth>;
}

// ══════════════════════════════════════════════════════════════════
// MOCK IMPLEMENTATIONS
// ══════════════════════════════════════════════════════════════════

function mockHealth(): ProviderHealth {
  return { status: 'healthy', latencyMs: Math.round(Math.random() * 20 + 5), lastCheckedAt: new Date().toISOString() };
}

// ── Mock Telephony ────────────────────────────────────────────────

export class MockTelephonyAdapter implements TelephonyAdapterInterface {
  readonly providerType = 'mock';
  private calls = new Map<string, string>();

  async initiateCall(params: TelephonyCallParams): Promise<TelephonyCallResult> {
    const callId = `mock-call-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.calls.set(callId, 'ringing');
    setTimeout(() => this.calls.set(callId, 'connected'), 1500);
    return { providerCallId: callId, status: 'ringing', startedAt: new Date().toISOString() };
  }

  async endCall(providerCallId: string) {
    this.calls.set(providerCallId, 'completed');
  }

  async getCallStatus(providerCallId: string) {
    return this.calls.get(providerCallId) ?? 'unknown';
  }

  async healthCheck() { return mockHealth(); }
}

// ── Mock Voice AI ─────────────────────────────────────────────────

export class MockVoiceAIAdapter implements VoiceAIAdapterInterface {
  readonly providerType = 'mock';
  private streams = new Map<string, VoiceAITurn[]>();

  async startStream(params: VoiceAIStreamParams) {
    const streamId = `mock-stream-${Date.now()}`;
    this.streams.set(streamId, [{
      role: 'agent',
      transcript: params.greetingMessage || 'Guten Tag, wie kann ich Ihnen helfen?',
      confidence: 0.98,
      durationMs: 2500,
      latencyMs: 120,
    }]);
    return { streamId };
  }

  async endStream(streamId: string) {
    return this.streams.get(streamId) ?? [];
  }

  async processUserAudio(streamId: string) {
    const turn: VoiceAITurn = {
      role: 'agent',
      transcript: 'Vielen Dank für Ihre Antwort. Lassen Sie mich das notieren.',
      confidence: 0.91,
      intent: 'acknowledgement',
      durationMs: 1800,
      latencyMs: 95,
    };
    this.streams.get(streamId)?.push(turn);
    return turn;
  }

  async healthCheck() { return mockHealth(); }
}

// ── Mock Transcription ────────────────────────────────────────────

export class MockTranscriptionAdapter implements TranscriptionAdapterInterface {
  readonly providerType = 'mock';

  async transcribe(request: TranscriptionRequest): Promise<TranscriptionResult> {
    return {
      text: 'Mock-Transkription: Guten Tag, hier spricht der SSM Recruiting-Assistent.',
      segments: [
        { start: 0, end: 2.5, text: 'Guten Tag,', speaker: 'agent' },
        { start: 2.5, end: 6.0, text: 'hier spricht der SSM Recruiting-Assistent.', speaker: 'agent' },
      ],
      language: request.language,
      confidence: 0.94,
      durationMs: 350,
    };
  }

  async healthCheck() { return mockHealth(); }
}

// ── Mock Storage ──────────────────────────────────────────────────

export class MockStorageAdapter implements StorageAdapterInterface {
  readonly providerType = 'mock';

  async upload(params: StorageUploadParams) {
    return { url: `https://mock-storage.local/${params.key}`, key: params.key };
  }

  async getSignedUrl(key: string) {
    return `https://mock-storage.local/${key}?token=mock-signed`;
  }

  async delete() { /* no-op */ }
  async healthCheck() { return mockHealth(); }
}

// ── Mock Webhook ──────────────────────────────────────────────────

export class MockWebhookAdapter implements WebhookAdapterInterface {
  readonly providerType = 'mock';
  private log: WebhookPayload[] = [];

  async dispatch(url: string, payload: WebhookPayload): Promise<WebhookDeliveryResult> {
    this.log.push(payload);
    return { success: true, statusCode: 200, responseTime: 45 };
  }

  validateSignature() { return true; }
  async healthCheck() { return mockHealth(); }

  getDispatchLog() { return [...this.log]; }
}

// ══════════════════════════════════════════════════════════════════
// CUSTOM PLACEHOLDER ADAPTER
// ══════════════════════════════════════════════════════════════════

export class CustomProviderAdapterPlaceholder implements TelephonyAdapterInterface, VoiceAIAdapterInterface {
  readonly providerType = 'custom';

  private notConfigured() {
    return Promise.reject(new Error('Custom provider not configured. Please connect a real provider in Provider Settings.'));
  }

  async initiateCall() { return this.notConfigured() as never; }
  async endCall() { return this.notConfigured() as never; }
  async getCallStatus() { return this.notConfigured() as never; }
  async startStream() { return this.notConfigured() as never; }
  async endStream() { return this.notConfigured() as never; }
  async processUserAudio() { return this.notConfigured() as never; }
  async healthCheck(): Promise<ProviderHealth> {
    return { status: 'offline', latencyMs: 0, lastCheckedAt: new Date().toISOString(), details: { reason: 'not_configured' } };
  }
}

// ══════════════════════════════════════════════════════════════════
// PROVIDER REGISTRY
// ══════════════════════════════════════════════════════════════════

export interface ProviderRegistry {
  telephony: TelephonyAdapterInterface;
  voiceAI: VoiceAIAdapterInterface;
  transcription: TranscriptionAdapterInterface;
  storage: StorageAdapterInterface;
  webhook: WebhookAdapterInterface;
}

let _registry: ProviderRegistry | null = null;

export function getProviderRegistry(): ProviderRegistry {
  if (!_registry) {
    _registry = {
      telephony: new MockTelephonyAdapter(),
      voiceAI: new MockVoiceAIAdapter(),
      transcription: new MockTranscriptionAdapter(),
      storage: new MockStorageAdapter(),
      webhook: new MockWebhookAdapter(),
    };
  }
  return _registry;
}

export function setProviderAdapter<K extends keyof ProviderRegistry>(key: K, adapter: ProviderRegistry[K]) {
  const reg = getProviderRegistry();
  (reg as any)[key] = adapter;
}
