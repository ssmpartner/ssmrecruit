/**
 * Mock Seed Data for AI Voice Agent module.
 * Call seedAiVoiceData() to populate the DB with test records.
 */
import { supabase } from '@/integrations/supabase/client';

export async function seedAiVoiceData() {
  const results: string[] = [];

  // 1. Provider Configs
  const providers = [
    {
      name: 'Mock Telephony Provider',
      provider_category: 'telephony',
      provider_type: 'mock',
      provider_code: 'mock_tel',
      endpoint_url: 'https://mock.provider.local/telephony',
      sandbox_mode: true,
      production_mode: false,
      status: 'active',
      is_default: true,
      auth_type: 'api_key',
      region: 'eu',
    },
    {
      name: 'Mock Voice AI Provider',
      provider_category: 'voice_ai',
      provider_type: 'mock',
      provider_code: 'mock_vai',
      endpoint_url: 'https://mock.provider.local/voice-ai',
      sandbox_mode: true,
      production_mode: false,
      status: 'active',
      is_default: true,
      auth_type: 'api_key',
      region: 'eu',
    },
    {
      name: 'Mock Transcription Provider',
      provider_category: 'transcription',
      provider_type: 'mock',
      provider_code: 'mock_stt',
      endpoint_url: 'https://mock.provider.local/transcription',
      sandbox_mode: true,
      production_mode: false,
      status: 'active',
      is_default: true,
      auth_type: 'api_key',
      region: 'eu',
    },
  ];

  const { data: providerData, error: pe } = await supabase.from('ai_provider_configs').insert(providers as any).select();
  if (pe) results.push(`Provider error: ${pe.message}`);
  else results.push(`${providerData?.length} Provider angelegt`);

  const telProvider = providerData?.[0];
  const voiceProvider = providerData?.[1];

  // 2. Agents
  const agents = [
    {
      name: 'SSM Recruiting Bot',
      slug: 'ssm-recruiting-bot',
      description: 'Outbound-Agent für Erstgespräche mit Kandidaten',
      agent_type: 'outbound',
      status: 'testing',
      identity_mode: 'digital_assistant',
      display_name: 'SSM Recruiting Assistent',
      greeting_text: 'Guten Tag, hier spricht der SSM Recruiting-Assistent.',
      language: 'de',
      language_supported: ['de', 'fr'],
      tone_style: 'professional',
      objective: 'Terminvereinbarung mit qualifizierten Kandidaten',
      max_call_duration_seconds: 300,
      allow_human_handover: true,
      allow_auto_actions: false,
      require_approval_mode: true,
      knowledge_mode: 'curated',
      is_active: true,
      test_only: true,
      telephony_provider_id: telProvider?.id,
      voice_ai_provider_id: voiceProvider?.id,
      system_prompt: 'Du bist ein professioneller Recruiting-Assistent der SSM Partner AG...',
      greeting_message: 'Guten Tag, hier spricht der SSM Recruiting-Assistent.',
      fallback_message: 'Entschuldigung, ich habe Sie nicht verstanden. Können Sie das bitte wiederholen?',
      created_by: 'system-seed',
      updated_by: 'system-seed',
    },
    {
      name: 'SSM Inbound Assistent',
      slug: 'ssm-inbound-assistent',
      description: 'Nimmt eingehende Anrufe entgegen und qualifiziert Interessenten',
      agent_type: 'inbound',
      status: 'draft',
      identity_mode: 'named_agent',
      display_name: 'SSM Empfang',
      greeting_text: 'SSM Partner, guten Tag. Wie kann ich Ihnen helfen?',
      language: 'de',
      language_supported: ['de'],
      tone_style: 'friendly',
      objective: 'Qualifizierung eingehender Interessenten',
      max_call_duration_seconds: 600,
      allow_human_handover: true,
      allow_auto_actions: false,
      require_approval_mode: true,
      knowledge_mode: 'curated',
      is_active: false,
      test_only: true,
      telephony_provider_id: telProvider?.id,
      voice_ai_provider_id: voiceProvider?.id,
      system_prompt: 'Du bist der freundliche Empfangsassistent der SSM Partner AG...',
      greeting_message: 'SSM Partner, guten Tag.',
      fallback_message: 'Einen Moment bitte, ich verbinde Sie mit einem Mitarbeiter.',
      created_by: 'system-seed',
      updated_by: 'system-seed',
    },
  ];

  const { data: agentData, error: ae } = await supabase.from('ai_agents').insert(agents as any).select();
  if (ae) results.push(`Agent error: ${ae.message}`);
  else results.push(`${agentData?.length} Agents angelegt`);

  const agent1 = agentData?.[0];
  const agent2 = agentData?.[1];

  if (!agent1) return results;

  // 3. Agent Versions
  const versions = [
    {
      agent_id: agent1.id,
      version: '1.0.0',
      version_number: 1,
      system_prompt: agent1.system_prompt,
      greeting_message: agent1.greeting_message,
      prompt_system: agent1.system_prompt,
      conversation_rules: JSON.stringify(['Immer siezen', 'Maximal 3 Fragen pro Turn', 'Bei Ablehnung höflich verabschieden']),
      forbidden_statements: JSON.stringify(['Keine Gehaltsversprechen', 'Keine persönlichen Meinungen']),
      required_disclosures: JSON.stringify(['KI-Assistent-Hinweis am Anfang', 'Aufnahme-Hinweis bei Recording']),
      status: 'published',
      is_published: true,
      created_by: 'system-seed',
    },
  ];

  const { data: versionData, error: ve } = await supabase.from('ai_agent_versions').insert(versions as any).select();
  if (ve) results.push(`Version error: ${ve.message}`);
  else results.push(`${versionData?.length} Versions angelegt`);

  // 4. Deployments
  const deployments = [
    {
      agent_id: agent1.id,
      deployment_scope: 'global',
      is_enabled: true,
      rollout_mode: 'shadow',
      priority: 10,
      status: 'deployed',
      deployed_by: 'system-seed',
      deployed_at: new Date().toISOString(),
      created_by_user: 'system-seed',
    },
  ];

  const { error: de } = await supabase.from('ai_agent_deployments').insert(deployments as any);
  if (de) results.push(`Deployment error: ${de.message}`);
  else results.push('1 Deployment angelegt');

  // 5. Knowledge Items
  const knowledge = [
    {
      title: 'SSM Partner AG – Unternehmensinfo',
      category: 'company',
      language: 'de',
      scope_type: 'global',
      content: 'Die SSM Partner AG ist ein führendes Finanzberatungsunternehmen in der Schweiz...',
      content_type: 'text',
      risk_class: 'low',
      approved_for_live_calls: true,
      version: 1,
      approval_status: 'approved',
      is_active: true,
      agent_id: agent1.id,
    },
    {
      title: 'Gehaltsrahmen Finanzberater',
      category: 'hr',
      language: 'de',
      scope_type: 'agent',
      content: 'Fixlohn: CHF 4000-6000. Variable: abhängig von Leistung. Spesen: CHF 500/Monat.',
      content_type: 'text',
      risk_class: 'high',
      approved_for_live_calls: false,
      version: 1,
      approval_status: 'pending',
      is_active: true,
      agent_id: agent1.id,
    },
  ];

  const { error: ke } = await supabase.from('ai_voice_knowledge_items').insert(knowledge as any);
  if (ke) results.push(`Knowledge error: ${ke.message}`);
  else results.push('2 Knowledge Items angelegt');

  // 6. Compliance Rules
  const compliance = [
    {
      name: 'Aufnahme-Einwilligung',
      description: 'Kandidat muss der Aufnahme zustimmen bevor Recording startet',
      rule_type: 'recording_consent',
      applies_to: 'all',
      rule_json: JSON.stringify({ require_explicit_consent: true, consent_phrase: 'Sind Sie damit einverstanden, dass dieses Gespräch aufgezeichnet wird?' }),
      severity: 'critical',
      is_active: true,
    },
    {
      name: 'KI-Offenlegung',
      description: 'Der Agent muss sich als KI-Assistent identifizieren',
      rule_type: 'disclosure',
      applies_to: 'all',
      rule_json: JSON.stringify({ disclosure_text: 'Ich bin ein KI-gestützter Assistent der SSM Partner AG.', timing: 'greeting' }),
      severity: 'high',
      is_active: true,
    },
    {
      name: 'DSGVO Datenhaltung',
      description: 'Aufnahmen müssen nach 90 Tagen gelöscht werden',
      rule_type: 'data_retention',
      applies_to: 'recordings',
      rule_json: JSON.stringify({ retention_days: 90, auto_delete: true }),
      severity: 'high',
      is_active: true,
    },
  ];

  const { error: ce } = await supabase.from('ai_compliance_rules').insert(compliance as any);
  if (ce) results.push(`Compliance error: ${ce.message}`);
  else results.push('3 Compliance Rules angelegt');

  // 7. Campaign
  const campaigns = [
    {
      name: 'Frühlings-Recruiting 2026',
      description: 'Outbound-Kampagne für neue Finanzberater',
      campaign_type: 'outbound',
      agent_id: agent1.id,
      status: 'running',
      timezone: 'Europe/Zurich',
      max_calls_per_day: 50,
      cost_limit_daily: 100,
      cost_limit_total: 2000,
      target_scope_json: JSON.stringify({ positions: ['Finanzberater'], regions: ['Zürich', 'Bern'] }),
      scheduling_rules_json: JSON.stringify({ weekdays: [1, 2, 3, 4, 5], hours: { start: '09:00', end: '18:00' } }),
      retry_rules_json: JSON.stringify({ max_retries: 3, retry_interval_hours: 24 }),
      created_by: 'system-seed',
    },
  ];

  const { error: cae } = await supabase.from('ai_voice_campaigns').insert(campaigns as any);
  if (cae) results.push(`Campaign error: ${cae.message}`);
  else results.push('1 Campaign angelegt');

  // 8. Voice Numbers
  const numbers = [
    {
      phone_number: '+41 44 123 45 67',
      label: 'SSM Hauptnummer Zürich',
      display_name: 'SSM Zürich',
      country: 'CH',
      region: 'Zürich',
      number_type: 'local',
      supports_inbound: true,
      supports_outbound: true,
      supports_recording: true,
      status: 'active',
      direction: 'both',
      agent_id: agent1.id,
    },
  ];

  const { error: ne } = await supabase.from('ai_voice_numbers').insert(numbers as any);
  if (ne) results.push(`Number error: ${ne.message}`);
  else results.push('1 Voice Number angelegt');

  // 9. Mock Session with Turns
  const { data: sessionData, error: se } = await supabase.from('ai_voice_sessions').insert({
    agent_id: agent1.id,
    session_uid: 'MOCK-SESSION-001',
    direction: 'outbound',
    status: 'completed',
    is_test: true,
    duration_seconds: 28,
    sentiment: 'positive',
    outcome: 'appointment_scheduled',
    summary: 'Terminvereinbarung erfolgreich. Kandidat ist interessiert.',
    phone_number_from: '+41 44 123 45 67',
    phone_number_to: '+41 79 987 65 43',
    transcript_status: 'completed',
    summary_status: 'completed',
    cost_total: 0.85,
    cost_ai: 0.45,
    cost_telephony: 0.40,
    result_type: 'success',
    result_reason: 'Termin vereinbart',
    started_at: new Date(Date.now() - 30000).toISOString(),
    ended_at: new Date().toISOString(),
  } as any).select().single();

  if (se) results.push(`Session error: ${se.message}`);
  else {
    results.push('1 Mock Session angelegt');

    // Turns
    const turns = [
      { session_id: sessionData!.id, turn_index: 0, role: 'system', speaker: 'system', transcript: 'Anruf wird verbunden...', confidence: 1, interpreted_intent: 'system_event', latency_ms: 0 },
      { session_id: sessionData!.id, turn_index: 1, role: 'agent', speaker: 'assistant', transcript: 'Guten Tag, hier spricht der SSM Recruiting-Assistent. Ich rufe Sie an bezüglich Ihrer Bewerbung als Finanzberater.', confidence: 0.97, interpreted_intent: 'greeting', latency_ms: 120 },
      { session_id: sessionData!.id, turn_index: 2, role: 'user', speaker: 'candidate', transcript: 'Ja, hallo. Worum geht es genau?', confidence: 0.92, interpreted_intent: 'inquiry', latency_ms: 0 },
      { session_id: sessionData!.id, turn_index: 3, role: 'agent', speaker: 'assistant', transcript: 'Wir möchten gerne einen persönlichen Termin mit Ihnen vereinbaren. Wann passt es Ihnen?', confidence: 0.95, interpreted_intent: 'schedule_request', latency_ms: 180 },
      { session_id: sessionData!.id, turn_index: 4, role: 'user', speaker: 'candidate', transcript: 'Nächste Woche Dienstag Nachmittag wäre gut.', confidence: 0.89, interpreted_intent: 'time_proposal', latency_ms: 0 },
      { session_id: sessionData!.id, turn_index: 5, role: 'agent', speaker: 'assistant', transcript: 'Perfekt, Dienstag 14:00 Uhr ist eingetragen. Vielen Dank und bis dann!', confidence: 0.96, interpreted_intent: 'confirmation', latency_ms: 150 },
    ];

    const { error: te } = await supabase.from('ai_voice_turns').insert(turns as any);
    if (te) results.push(`Turns error: ${te.message}`);
    else results.push('6 Turns angelegt');

    // Action Log
    const { error: ale } = await supabase.from('ai_voice_action_logs').insert({
      session_id: sessionData!.id,
      ai_agent_id: agent1.id,
      action_type: 'create_appointment',
      target_type: 'lead',
      target_id: 'test-lead-dummy-001',
      execution_mode: 'suggested',
      payload_json: JSON.stringify({ date: '2026-04-15', time: '14:00', type: 'video' }),
      result_json: JSON.stringify({ status: 'pending_approval' }),
      reason: 'Kandidat hat Dienstag 14:00 vorgeschlagen',
      executed_by: 'ai-agent',
    } as any);
    if (ale) results.push(`Action log error: ${ale.message}`);
    else results.push('1 Action Log angelegt');

    // Cost Log
    const { error: cle } = await supabase.from('ai_voice_cost_logs').insert([
      { session_id: sessionData!.id, agent_id: agent1.id, cost_type: 'call', provider_name: 'Mock Telephony', units: 28, unit_price: 0.014, total_cost: 0.40, currency: 'CHF', description: 'Outbound Call 28s' },
      { session_id: sessionData!.id, agent_id: agent1.id, cost_type: 'ai_inference', provider_name: 'Mock Voice AI', units: 6, unit_price: 0.075, total_cost: 0.45, currency: 'CHF', description: '6 AI Turns' },
    ] as any);
    if (cle) results.push(`Cost log error: ${cle.message}`);
    else results.push('2 Cost Logs angelegt');
  }

  // 10. Test Run
  if (agent1) {
    const { error: tre } = await supabase.from('ai_voice_test_runs').insert({
      agent_id: agent1.id,
      scenario_name: 'Outbound Recruiting Basisszenario',
      test_name: 'Outbound Recruiting Basisszenario',
      test_mode: 'simulation',
      test_target_type: 'agent',
      target_id: agent1.id,
      status: 'passed',
      pass_fail_status: 'passed',
      duration_ms: 2800,
      run_by: 'system-seed',
      expected_result_json: JSON.stringify({ outcome: 'appointment_scheduled' }),
      actual_result_json: JSON.stringify({ outcome: 'appointment_scheduled', sentiment: 'positive' }),
      result: JSON.stringify({ outcome: 'appointment_scheduled', sentiment: 'positive' }),
      notes: 'Alle Kriterien erfüllt. Agent hat korrekt reagiert.',
    } as any);
    if (tre) results.push(`Test run error: ${tre.message}`);
    else results.push('1 Test Run angelegt');
  }

  return results;
}
