/**
 * Shared Assessment PDF Report Generator
 * Generates a professional, colorful HTML report opened in a new window for print/PDF.
 */

interface LetterheadConfig {
  companyName: string;
  logoUrl: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  primaryColor: string;
}

interface AssessmentPdfData {
  candidateName: string;
  position: string;
  completedAt: string;
  discScores: Record<string, number>;
  motivatorScores: Record<string, number>;
  scores: Record<string, number>;
  matchResult: { score: number; level: string; strengths: string[]; risks: string[] };
  recommendation: string;
  reportSections: {
    disc_analysis?: string;
    motivator_analysis?: string;
    integration?: string;
    strengths_profile?: string[];
    improvement_areas?: string[];
    natural_vs_adapted?: string;
    communication_do?: string[];
    communication_dont?: string[];
    company_value?: string;
  };
  summary: { headline: string; description: string; dominant_disc?: string; dominant_motivator?: string };
  personalityTitle?: string;
  personalityAvatar?: string;
  personalitySummary?: string;
  personalityMeaning?: string;
  personalityTypeCombination?: string;
  topMotivators?: string[];
  personalityStrengthsExtended?: string[];
  personalityRisksExtended?: string[];
  matchInterpretation?: string;
}

const discLabels: Record<string, string> = { D: 'Dominant', I: 'Initiativ', S: 'Stetig', C: 'Gewissenhaft' };
const discColors: Record<string, string> = { D: '#dc2626', I: '#d97706', S: '#059669', C: '#2563eb' };
const motivatorLabels: Record<string, string> = {
  individualistisch: 'Individualistisch', theoretisch: 'Theoretisch',
  oekonomisch: 'Ökonomisch', traditionell: 'Traditionell',
  aesthetisch: 'Ästhetisch', sozial: 'Sozial',
};
const motivatorColors: Record<string, string> = {
  individualistisch: '#8B5CF6', theoretisch: '#3B82F6',
  oekonomisch: '#F59E0B', traditionell: '#6B7280',
  aesthetisch: '#EC4899', sozial: '#10B981',
};
const scoreLabels: Record<string, string> = {
  performance: 'Performance', team_fit: 'Team Fit',
  learning: 'Lernfähigkeit', sales: 'Sales Potential', culture_fit: 'Culture Fit',
};
const scoreColors: Record<string, string> = {
  performance: '#EF4444', team_fit: '#10B981',
  learning: '#3B82F6', sales: '#F59E0B', culture_fit: '#8B5CF6',
};
const matchLevelLabels: Record<string, { label: string; color: string; bg: string }> = {
  perfect: { label: '🔥 Perfekter Match', color: '#059669', bg: '#ecfdf5' },
  very_good: { label: '✅ Sehr guter Match', color: '#2563eb', bg: '#eff6ff' },
  conditional: { label: '⚠️ Bedingt geeignet', color: '#d97706', bg: '#fffbeb' },
  no_match: { label: '❌ Kein Match', color: '#dc2626', bg: '#fef2f2' },
};
const recLabels: Record<string, { label: string; color: string; bg: string }> = {
  einstellen: { label: '✅ Einstellen', color: '#059669', bg: '#ecfdf5' },
  weiter_pruefen: { label: '🔍 Weiter prüfen', color: '#d97706', bg: '#fffbeb' },
  ablehnen: { label: '❌ Ablehnen', color: '#dc2626', bg: '#fef2f2' },
};

const avatarIcons: Record<string, string> = {
  macher: '🔥', inspirator: '⚡', teamplayer: '🤝', analytiker: '🔬',
  challenger: '💪', strategischer_umsetzer: '🎯', beziehungsstarke: '💬',
  verlaesslicher_spezialist: '🛡️',
};

function getAvatarEmoji(avatar: string): string {
  if (!avatar) return '🧠';
  const key = avatar.toLowerCase().replace(/[^a-z_]/g, '');
  return avatarIcons[key] || '🧠';
}

export async function loadLetterhead(): Promise<LetterheadConfig> {
  const { supabase } = await import('@/integrations/supabase/client');
  const { data } = await supabase.from('app_settings').select('value').eq('key', 'report_letterhead').single();
  if (data?.value && typeof data.value === 'object') {
    const v = data.value as any;
    return {
      companyName: v.companyName || 'SSM Partner AG',
      logoUrl: v.logoUrl || '',
      address: v.address || '',
      phone: v.phone || '',
      email: v.email || '',
      website: v.website || '',
      primaryColor: v.primaryColor || '#2563eb',
    };
  }
  return { companyName: 'SSM Partner AG', logoUrl: '', address: '', phone: '', email: '', website: '', primaryColor: '#2563eb' };
}

function buildHeaderHtml(lh: LetterheadConfig): string {
  const logo = lh.logoUrl ? `<img src="${lh.logoUrl}" alt="${lh.companyName}" style="height:40px;object-fit:contain;" />` : '';
  const contactParts = [lh.address, lh.phone, lh.email, lh.website].filter(Boolean);
  return `
    <div class="header">
      <div class="header-left">${logo}<span class="company-name">${lh.companyName}</span></div>
      ${contactParts.length ? `<div class="header-right">${contactParts.join(' · ')}</div>` : ''}
    </div>
  `;
}

export async function generateAssessmentPdf(data: AssessmentPdfData, letterhead: LetterheadConfig): Promise<void> {

  const pc = letterhead.primaryColor || '#2563eb';
  const ml = matchLevelLabels[data.matchResult.level] || matchLevelLabels.conditional;
  const rec = recLabels[data.recommendation] || recLabels.weiter_pruefen;
  const dateStr = new Date(data.completedAt).toLocaleDateString('de-CH', { day: '2-digit', month: 'long', year: 'numeric' });
  const avatarEmoji = getAvatarEmoji(data.personalityAvatar || '');

  // Build DISC bars
  const discHtml = Object.entries(data.discScores).map(([k, v]) => `
    <div class="disc-card" style="border-left:4px solid ${discColors[k] || '#666'}">
      <div class="disc-label">${k} – ${discLabels[k] || k}</div>
      <div class="disc-val" style="color:${discColors[k]}">${v}%</div>
      <div class="bar-bg"><div class="bar-fill" style="width:${v}%;background:${discColors[k]}"></div></div>
    </div>
  `).join('');

  // Motivator bars
  const motivatorHtml = Object.entries(data.motivatorScores)
    .sort(([, a], [, b]) => b - a)
    .map(([k, v]) => `
      <div class="mot-row">
        <span class="mot-label">${motivatorLabels[k] || k}</span>
        <div class="bar-bg flex1"><div class="bar-fill" style="width:${v}%;background:${motivatorColors[k] || pc}"></div></div>
        <span class="mot-val">${v}%</span>
      </div>
    `).join('');

  // Performance scores
  const perfHtml = Object.entries(data.scores).map(([k, v]) => `
    <div class="perf-row">
      <span class="perf-label">${scoreLabels[k] || k}</span>
      <div class="bar-bg flex1"><div class="bar-fill" style="width:${v}%;background:${scoreColors[k] || pc}"></div></div>
      <span class="perf-val">${v}%</span>
    </div>
  `).join('');

  // Strengths & risks
  const strengthsHtml = (data.matchResult.strengths || []).map(s => `<li>✅ ${s}</li>`).join('');
  const risksHtml = (data.matchResult.risks || []).map(r => `<li>⚠️ ${r}</li>`).join('');

  // Communication
  const commDoHtml = (data.reportSections.communication_do || []).map(s => `<li class="comm-do">✅ ${s}</li>`).join('');
  const commDontHtml = (data.reportSections.communication_dont || []).map(s => `<li class="comm-dont">❌ ${s}</li>`).join('');

  // Extended personality
  const extStrengths = (data.personalityStrengthsExtended || []).map(s => `<li>💪 ${s}</li>`).join('');
  const extRisks = (data.personalityRisksExtended || []).map(r => `<li>⚡ ${r}</li>`).join('');

  const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>Assessment Report – ${data.candidateName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; font-size: 12px; line-height: 1.6; }
  .page { max-width: 800px; margin: 0 auto; padding: 32px 40px; }
  
  /* Header / Letterhead */
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid ${pc}; padding-bottom: 12px; margin-bottom: 24px; }
  .header-left { display: flex; align-items: center; gap: 12px; }
  .company-name { font-size: 18px; font-weight: 700; color: ${pc}; }
  .header-right { font-size: 10px; color: #6b7280; text-align: right; max-width: 250px; }
  
  /* Title */
  .report-title { font-size: 22px; font-weight: 800; color: #111; margin-bottom: 4px; }
  .report-meta { font-size: 11px; color: #6b7280; margin-bottom: 24px; }
  
  /* Sections */
  h2 { font-size: 15px; font-weight: 700; color: ${pc}; margin: 24px 0 12px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; gap: 8px; }
  h3 { font-size: 13px; font-weight: 600; color: #374151; margin: 16px 0 8px; }
  
  /* Personality card */
  .personality-card { background: linear-gradient(135deg, ${pc}10, ${pc}05); border: 1px solid ${pc}30; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
  .personality-header { display: flex; align-items: center; gap: 16px; margin-bottom: 12px; }
  .personality-avatar { width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, ${pc}, ${pc}bb); display: flex; align-items: center; justify-content: center; font-size: 28px; }
  .personality-title { font-size: 18px; font-weight: 800; color: ${pc}; }
  .personality-type { font-size: 11px; color: #6b7280; }
  .personality-summary { font-size: 12px; line-height: 1.7; color: #374151; }
  
  /* Match score card */
  .match-card { display: flex; gap: 16px; margin-bottom: 16px; }
  .score-circle { width: 100px; height: 100px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: ${ml.bg}; border: 3px solid ${ml.color}; }
  .score-num { font-size: 28px; font-weight: 800; color: ${ml.color}; }
  .score-label { font-size: 9px; color: ${ml.color}; }
  .match-info { flex: 1; }
  .match-level { font-size: 14px; font-weight: 700; color: ${ml.color}; margin-bottom: 4px; }
  .rec-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; background: ${rec.bg}; color: ${rec.color}; border: 1px solid ${rec.color}22; }
  
  /* DISC cards */
  .disc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .disc-card { background: #fafafa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 14px; }
  .disc-label { font-size: 11px; font-weight: 600; color: #374151; }
  .disc-val { font-size: 22px; font-weight: 800; margin: 2px 0; }
  
  /* Bars */
  .bar-bg { height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
  .flex1 { flex: 1; }
  
  /* Motivator rows */
  .mot-row, .perf-row { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
  .mot-label, .perf-label { width: 110px; font-size: 11px; font-weight: 500; }
  .mot-val, .perf-val { width: 40px; text-align: right; font-size: 11px; font-weight: 700; }
  
  /* Lists */
  .sr-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .sr-box { background: #fafafa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
  .sr-box h4 { font-size: 12px; font-weight: 700; margin-bottom: 6px; }
  .sr-box ul { list-style: none; padding: 0; }
  .sr-box li { font-size: 11px; margin-bottom: 4px; line-height: 1.5; }
  
  /* Communication */
  .comm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .comm-box { border-radius: 8px; padding: 12px; }
  .comm-box-do { background: #ecfdf5; border: 1px solid #a7f3d0; }
  .comm-box-dont { background: #fef2f2; border: 1px solid #fecaca; }
  .comm-box h4 { font-size: 12px; font-weight: 700; margin-bottom: 6px; }
  .comm-box ul { list-style: none; padding: 0; }
  .comm-box li { font-size: 11px; margin-bottom: 3px; }
  
  /* Section card */
  .section-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; margin-bottom: 10px; }
  .section-card p { font-size: 11px; line-height: 1.7; color: #374151; }
  
  /* Footer */
  .footer { margin-top: 32px; padding-top: 12px; border-top: 2px solid ${pc}; text-align: center; font-size: 10px; color: #9ca3af; }
  
  /* Print */
  @media print { 
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 20px 30px; }
    .personality-card, .disc-card, .sr-box, .comm-box, .section-card, .match-card { break-inside: avoid; }
  }
</style></head><body><div class="page">

${buildHeaderHtml(letterhead)}

<div class="report-title">Assessment-Report</div>
<div class="report-meta">
  <strong>${data.candidateName}</strong> · Position: ${data.position || '—'} · Erstellt: ${dateStr}
</div>

${data.summary.headline ? `
<div class="section-card" style="border-left:4px solid ${pc}">
  <h3>${data.summary.headline}</h3>
  <p>${data.summary.description || ''}</p>
</div>
` : ''}

${data.personalityTitle ? `
<div class="personality-card">
  <div class="personality-header">
    <div class="personality-avatar">${avatarEmoji}</div>
    <div>
      <div class="personality-title">${data.personalityTitle}</div>
      <div class="personality-type">${data.personalityTypeCombination || ''} ${data.topMotivators?.length ? '· Top: ' + data.topMotivators.join(', ') : ''}</div>
    </div>
  </div>
  <div class="personality-summary">${data.personalitySummary || ''}</div>
</div>
` : ''}

<h2>📊 Match Score & Empfehlung</h2>
<div class="match-card">
  <div class="score-circle">
    <div class="score-num">${data.matchResult.score}</div>
    <div class="score-label">/100</div>
  </div>
  <div class="match-info">
    <div class="match-level">${ml.label}</div>
    <div class="rec-badge">${rec.label}</div>
    ${data.matchInterpretation ? `<p style="margin-top:8px;font-size:11px;color:#374151">${data.matchInterpretation}</p>` : ''}
  </div>
</div>

<div class="sr-grid">
  <div class="sr-box"><h4>💪 Stärken</h4><ul>${strengthsHtml || '<li>—</li>'}</ul></div>
  <div class="sr-box"><h4>⚠️ Risiken</h4><ul>${risksHtml || '<li>—</li>'}</ul></div>
</div>

<h2>🧠 DISC-Persönlichkeitsprofil</h2>
<div class="disc-grid">${discHtml}</div>
${data.reportSections.disc_analysis ? `<div class="section-card"><p>${data.reportSections.disc_analysis}</p></div>` : ''}

<h2>🎯 Motivatoren</h2>
${motivatorHtml}
${data.reportSections.motivator_analysis ? `<div class="section-card"><p>${data.reportSections.motivator_analysis}</p></div>` : ''}

<h2>📈 Performance Scores</h2>
${perfHtml}

${(commDoHtml || commDontHtml) ? `
<h2>💬 Kommunikations-Leitfaden</h2>
<div class="comm-grid">
  <div class="comm-box comm-box-do"><h4>✅ DO</h4><ul>${commDoHtml}</ul></div>
  <div class="comm-box comm-box-dont"><h4>❌ DON'T</h4><ul>${commDontHtml}</ul></div>
</div>
` : ''}

${data.reportSections.strengths_profile?.length ? `
<h2>🏆 Stärkenprofil</h2>
<ul class="sr-box" style="list-style:none">${data.reportSections.strengths_profile.map(s => `<li>🌟 ${s}</li>`).join('')}</ul>
` : ''}

${data.reportSections.improvement_areas?.length ? `
<h2>📋 Verbesserungsbereiche</h2>
<ul class="sr-box" style="list-style:none">${data.reportSections.improvement_areas.map(s => `<li>📌 ${s}</li>`).join('')}</ul>
` : ''}

${data.personalityMeaning ? `
<h2>🔍 Was dieses Profil bedeutet</h2>
<div class="section-card"><p>${data.personalityMeaning}</p></div>
` : ''}

${extStrengths ? `
<h2>💎 Erweiterte Stärken</h2>
<ul class="sr-box" style="list-style:none">${extStrengths}</ul>
` : ''}

${extRisks ? `
<h2>⚡ Mögliche Risiken</h2>
<ul class="sr-box" style="list-style:none">${extRisks}</ul>
` : ''}

${data.reportSections.integration ? `
<h2>🔗 Integration Verhalten + Motivatoren</h2>
<div class="section-card"><p>${data.reportSections.integration}</p></div>
` : ''}

${data.reportSections.natural_vs_adapted ? `
<h2>🔄 Natürlicher vs. Adaptierter Stil</h2>
<div class="section-card"><p>${data.reportSections.natural_vs_adapted}</p></div>
` : ''}

${data.reportSections.company_value ? `
<h2>🏢 Wert für das Unternehmen</h2>
<div class="section-card"><p>${data.reportSections.company_value}</p></div>
` : ''}

<div class="footer">
  ${letterhead.companyName} · Assessment-Report · Vertraulich · ${new Date().toLocaleDateString('de-CH')}
</div>

</div></body></html>`;

  const html2pdf = (await import('html2pdf.js')).default;
  const container = document.createElement('div');
  container.innerHTML = html;
  const safeName = (data.candidateName || 'Assessment').replace(/[^\w.-]+/g, '_');
  await html2pdf()
    .set({
      margin: 0,
      filename: `Assessment_${safeName}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] },
    })
    .from(container)
    .save();
}

/** Helper to map DB assessment row to PdfData */
export function assessmentToPdfData(assessment: any, candidateName: string, position: string): AssessmentPdfData {
  return {
    candidateName,
    position,
    completedAt: assessment.completed_at,
    discScores: assessment.disc_scores || {},
    motivatorScores: assessment.motivator_scores || {},
    scores: assessment.scores || {},
    matchResult: assessment.match_result || { score: 0, level: 'conditional', strengths: [], risks: [] },
    recommendation: assessment.recommendation || '',
    reportSections: assessment.report_sections || {},
    summary: assessment.summary || { headline: '', description: '' },
    personalityTitle: assessment.personality_title || '',
    personalityAvatar: assessment.personality_avatar || '',
    personalitySummary: assessment.personality_summary || '',
    personalityMeaning: assessment.personality_meaning || '',
    personalityTypeCombination: assessment.personality_type_combination || '',
    topMotivators: assessment.top_motivators || [],
    personalityStrengthsExtended: assessment.personality_strengths_extended || [],
    personalityRisksExtended: assessment.personality_risks_extended || [],
    matchInterpretation: assessment.raw_ai_response?.match_interpretation || assessment.match_interpretation || '',
  };
}

/** Generate sample/example data for preview in Settings */
export function getSampleAssessmentData(): AssessmentPdfData {
  return {
    candidateName: 'Max Mustermann',
    position: 'Senior Financial Planner',
    completedAt: new Date().toISOString(),
    discScores: { D: 72, I: 65, S: 45, C: 58 },
    motivatorScores: { individualistisch: 78, oekonomisch: 85, theoretisch: 62, sozial: 55, aesthetisch: 48, traditionell: 40 },
    scores: { performance: 82, team_fit: 74, learning: 79, sales: 88, culture_fit: 76 },
    matchResult: {
      score: 82,
      level: 'very_good',
      strengths: [
        'Starke Eigeninitiative und Durchsetzungsvermögen',
        'Ausgeprägte Vertriebsorientierung mit hohem Umsatzpotenzial',
        'Schnelle Auffassungsgabe und hohes Lernpotenzial',
        'Natürliche Führungsqualitäten und Entscheidungsfreude',
      ],
      risks: [
        'Kann bei Routineaufgaben schnell die Motivation verlieren',
        'Tendenz zu impulsiven Entscheidungen unter Druck',
        'Geduld mit langsamen Prozessen könnte herausfordernd sein',
      ],
    },
    recommendation: 'einstellen',
    reportSections: {
      disc_analysis: 'Max zeigt ein ausgeprägtes D/I-Profil mit hoher Durchsetzungskraft (D=72%) kombiniert mit starker Kontaktfreude (I=65%). Diese Kombination macht ihn ideal für kundenorientierte Vertriebspositionen, in denen sowohl Initiative als auch zwischenmenschliche Kompetenz gefragt sind.',
      motivator_analysis: 'Die dominanten Motivatoren Ökonomisch (85%) und Individualistisch (78%) weisen auf eine stark leistungs- und karriereorientierte Persönlichkeit hin. Max wird durch finanzielle Anreize und persönliche Anerkennung am stärksten motiviert.',
      integration: 'Die Kombination aus D/I-Verhalten und ökonomisch-individualistischer Motivation ergibt ein äusserst wettbewerbsfähiges Profil. Max wird in einem Umfeld mit klaren Zielvorgaben und Provisionsmodellen seine beste Leistung erbringen.',
      strengths_profile: [
        'Überzeugungskraft in Kundengesprächen',
        'Strategisches Denken bei Finanzplanung',
        'Fähigkeit, unter Druck zu performen',
        'Netzwerk- und Beziehungsaufbau',
      ],
      improvement_areas: [
        'Detailorientierung in administrativen Aufgaben',
        'Geduld bei langfristigen Prozessen',
        'Teamarbeit bei wenig direkter Führungsrolle',
      ],
      natural_vs_adapted: 'Im natürlichen Stil ist Max direkt, ergebnisorientiert und kontaktfreudig. Im adaptierten Stil kann er geduldiger und strukturierter auftreten, was jedoch Energie kostet. Am produktivsten ist er, wenn er seinen natürlichen Stil ausleben kann.',
      communication_do: [
        'Klar und direkt kommunizieren',
        'Ergebnisorientiert Ziele definieren',
        'Freiraum für eigenständiges Arbeiten geben',
        'Anerkennung für Leistungen aussprechen',
      ],
      communication_dont: [
        'Zu viele Detailanweisungen geben',
        'Langwierige Meetings ohne klare Agenda',
        'Mikromanagement betreiben',
        'Erfolge nicht würdigen',
      ],
      company_value: 'Max bringt als leistungsstarker D/I-Typ erheblichen Mehrwert für den Vertrieb. Seine natürliche Überzeugungskraft und sein ökonomischer Antrieb machen ihn zu einem potenziellen Top-Performer im Bereich Financial Planning.',
    },
    summary: {
      headline: 'Leistungsorientierter Vertriebsprofi mit starker Durchsetzungskraft',
      description: 'Max Mustermann zeigt ein ausgeprägtes Challenger-Profil mit hohem Vertriebspotenzial. Seine Kombination aus Durchsetzungskraft und Kontaktfreude, gepaart mit starker ökonomischer Motivation, macht ihn zu einem idealen Kandidaten für kundenorientierte Positionen.',
      dominant_disc: 'D',
      dominant_motivator: 'oekonomisch',
    },
    personalityTitle: 'Der Challenger – Performance Leader',
    personalityAvatar: 'challenger',
    personalitySummary: 'Max ist ein leistungsorientierter Macher mit hoher Eigenmotivation. Er agiert entschlossen, kommuniziert direkt und strebt konsequent nach messbaren Ergebnissen. In Teams übernimmt er natürlich die Führung und treibt Projekte mit Energie voran.',
    personalityMeaning: 'Im beruflichen Kontext bedeutet dieses Profil, dass Max in einem dynamischen, wettbewerbsorientierten Umfeld aufblüht. Er benötigt klare Ziele, Handlungsfreiheit und schnelle Entscheidungswege. In Rollen mit Kundenkontakt, Verantwortung und Ergebnisorientierung kann er sein volles Potenzial entfalten.',
    personalityTypeCombination: 'D+I (Challenger)',
    topMotivators: ['Ökonomisch', 'Individualistisch', 'Theoretisch'],
    personalityStrengthsExtended: [
      'Natürliche Überzeugungskraft und charismatische Ausstrahlung',
      'Schnelle Entscheidungsfindung auch unter Unsicherheit',
      'Hohe Resilienz und Belastbarkeit bei Rückschlägen',
      'Ausgeprägte Zielorientierung und Ergebnisfokus',
    ],
    personalityRisksExtended: [
      'Kann bei Widerstand zu dominant auftreten',
      'Tendenz, Details zu übersehen bei schnellem Arbeitstempo',
      'Ungeduld mit langsamen Entscheidungsprozessen',
    ],
    matchInterpretation: 'Max passt mit seinem D/I-Profil und ökonomischer Motivation sehr gut zur SSM Partner AG. Seine Vertriebsstärke und Eigeninitiative decken sich mit den Anforderungen der Position. Das Risiko impulsiver Entscheidungen kann durch strukturierte Onboarding-Prozesse abgefedert werden.',
  };
}
