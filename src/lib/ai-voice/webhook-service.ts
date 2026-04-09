/**
 * AI Voice Agent – Webhook Infrastructure
 * 
 * Generic webhook dispatch, subscription management, event logging,
 * retry logic, and signature validation placeholders.
 */

import { supabase } from '@/integrations/supabase/client';
import type { WebhookEventType, WebhookEvent, WebhookSubscription } from './api-types';
import { getProviderRegistry } from './adapters';

const db = { from: (t: string) => supabase.from(t as any) };

// ── In-memory subscription store (until DB table exists) ──────────

let _subscriptions: WebhookSubscription[] = [
  {
    id: 'ws-demo-001',
    url: 'https://mock-webhook.local/events',
    events: ['session.started', 'session.ended', 'escalation.created'],
    secret: 'whsec_mock_demo_secret',
    isActive: true,
    createdAt: new Date().toISOString(),
    failureCount: 0,
  },
];

let _eventLog: (WebhookEvent & { deliveryStatus: string; deliveredAt?: string })[] = [];

// ── Subscription Management ──────────────────────────────────────

export const WebhookSubscriptionService = {
  list(): WebhookSubscription[] {
    return [..._subscriptions];
  },

  getById(id: string): WebhookSubscription | undefined {
    return _subscriptions.find(s => s.id === id);
  },

  create(url: string, events: WebhookEventType[], secret?: string): WebhookSubscription {
    const sub: WebhookSubscription = {
      id: `ws-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      url,
      events,
      secret: secret || `whsec_${crypto.randomUUID().replace(/-/g, '')}`,
      isActive: true,
      createdAt: new Date().toISOString(),
      failureCount: 0,
    };
    _subscriptions.push(sub);
    return sub;
  },

  update(id: string, updates: Partial<Pick<WebhookSubscription, 'url' | 'events' | 'isActive'>>): WebhookSubscription | null {
    const idx = _subscriptions.findIndex(s => s.id === id);
    if (idx === -1) return null;
    _subscriptions[idx] = { ..._subscriptions[idx], ...updates };
    return _subscriptions[idx];
  },

  delete(id: string): boolean {
    const len = _subscriptions.length;
    _subscriptions = _subscriptions.filter(s => s.id !== id);
    return _subscriptions.length < len;
  },
};

// ── Event Dispatch ────────────────────────────────────────────────

export const WebhookDispatcher = {
  async emit(type: WebhookEventType, data: Record<string, unknown>): Promise<void> {
    const event: WebhookEvent = {
      id: crypto.randomUUID(),
      type,
      timestamp: new Date().toISOString(),
      data,
      source: 'ai_voice_agent',
    };

    // Log event
    _eventLog.push({ ...event, deliveryStatus: 'pending' });

    // Find matching subscriptions
    const matching = _subscriptions.filter(s => s.isActive && s.events.includes(type));

    const registry = getProviderRegistry();

    for (const sub of matching) {
      try {
        const result = await registry.webhook.dispatch(sub.url, {
          event: type,
          timestamp: event.timestamp,
          data,
          signature: `sha256=${sub.secret}`, // Placeholder signature
        });

        const logEntry = _eventLog.find(e => e.id === event.id);
        if (logEntry) {
          logEntry.deliveryStatus = result.success ? 'delivered' : 'failed';
          logEntry.deliveredAt = new Date().toISOString();
        }

        // Update subscription status
        const subIdx = _subscriptions.findIndex(s => s.id === sub.id);
        if (subIdx !== -1) {
          _subscriptions[subIdx].lastDeliveryAt = new Date().toISOString();
          _subscriptions[subIdx].lastDeliveryStatus = result.success ? 'success' : 'failed';
          if (!result.success) {
            _subscriptions[subIdx].failureCount++;
          } else {
            _subscriptions[subIdx].failureCount = 0;
          }
        }
      } catch {
        // Retry logic placeholder – would implement exponential backoff here
        const subIdx = _subscriptions.findIndex(s => s.id === sub.id);
        if (subIdx !== -1) {
          _subscriptions[subIdx].failureCount++;
          _subscriptions[subIdx].lastDeliveryStatus = 'failed';
        }
      }
    }
  },

  getEventLog(limit = 50) {
    return _eventLog.slice(-limit).reverse();
  },

  clearLog() {
    _eventLog = [];
  },
};

// ── Inbound Webhook Handler ───────────────────────────────────────

export interface InboundWebhookPayload {
  provider: string;
  event: string;
  data: Record<string, unknown>;
  signature?: string;
}

export const InboundWebhookHandler = {
  /**
   * Process inbound webhook from external provider (e.g., Twilio status callback).
   * Currently a placeholder that logs the event.
   */
  async process(payload: InboundWebhookPayload): Promise<{ accepted: boolean; message: string }> {
    // Validate signature placeholder
    if (payload.signature) {
      const valid = getProviderRegistry().webhook.validateSignature(
        JSON.stringify(payload.data),
        payload.signature,
        'placeholder-secret'
      );
      if (!valid) {
        return { accepted: false, message: 'Invalid signature' };
      }
    }

    // Route event
    switch (payload.event) {
      case 'call.status':
      case 'call.completed':
      case 'call.failed':
        // Would update session status here
        break;
      case 'recording.available':
        // Would store recording URL here
        break;
      case 'transcription.completed':
        // Would update transcript here
        break;
      default:
        break;
    }

    // Log to audit
    _eventLog.push({
      id: crypto.randomUUID(),
      type: 'session.ended' as WebhookEventType,
      timestamp: new Date().toISOString(),
      data: { ...payload.data, _inbound: true, _provider: payload.provider },
      source: 'ai_voice_agent',
      deliveryStatus: 'received',
    });

    return { accepted: true, message: 'Webhook processed' };
  },
};
