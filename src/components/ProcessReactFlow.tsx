import { useMemo, useState, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  Position,
  Handle,
  MarkerType,
  useNodesState,
  useEdgesState,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { statusConfig, type LeadStatus, type Lead } from '@/lib/mock-data';

// ── Colors ──
const STATUS_COLORS: Record<string, { bg: string; border: string; accent: string }> = {
  new:         { bg: '#EFF6FF', border: '#60A5FA', accent: '#3B82F6' },
  contacted:   { bg: '#FFFBEB', border: '#FBBF24', accent: '#F59E0B' },
  appointment: { bg: '#ECFDF5', border: '#34D399', accent: '#10B981' },
  follow_up:   { bg: '#F5F3FF', border: '#A78BFA', accent: '#8B5CF6' },
  controlling: { bg: '#FFF7ED', border: '#FB923C', accent: '#F97316' },
  management:  { bg: '#FDF2F8', border: '#F472B6', accent: '#EC4899' },
  hr:          { bg: '#F0F9FF', border: '#38BDF8', accent: '#0EA5E9' },
  hired:       { bg: '#F0FDF4', border: '#4ADE80', accent: '#22C55E' },
  rejected:    { bg: '#FEF2F2', border: '#F87171', accent: '#EF4444' },
  decision:    { bg: '#FEFCE8', border: '#FACC15', accent: '#EAB308' },
};

// ── Node Components ──

interface StatusNodeData {
  status: string;
  label: string;
  count: number;
  emoji: string;
  role?: string;
  actions: { label: string; emoji: string }[];
  escalations: string[];
  total: number;
  [key: string]: unknown;
}

function StatusNode({ data }: { data: StatusNodeData }) {
  const colors = STATUS_COLORS[data.status] || STATUS_COLORS.new;
  const pct = data.total > 0 ? ((data.count / data.total) * 100).toFixed(0) : '0';

  return (
    <div className="rounded-2xl shadow-lg border-2 min-w-[210px] max-w-[250px]" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !border-2" style={{ borderColor: colors.border, backgroundColor: colors.accent }} />
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !border-2" style={{ borderColor: colors.border, backgroundColor: colors.accent }} />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!w-3 !h-3 !border-2" style={{ borderColor: colors.border, backgroundColor: colors.accent }} />

      <div className="flex items-center gap-2 px-3 pt-3 pb-1.5">
        <span className="text-lg">{data.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold truncate" style={{ color: colors.accent }}>{data.label}</p>
          <p className="text-[10px] text-muted-foreground">{data.count} Leads · {pct}%</p>
        </div>
      </div>

      {data.role && (
        <div className="px-3 pb-1">
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold" style={{ backgroundColor: colors.accent + '20', color: colors.accent }}>
            👤 {data.role}
          </span>
        </div>
      )}

      <div className="px-3 pb-1.5">
        <div className="h-1 w-full rounded-full bg-black/5">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: colors.accent }} />
        </div>
      </div>

      {data.actions.length > 0 && (
        <div className="px-3 pb-1.5 space-y-0.5">
          <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">Aktionen</p>
          {data.actions.map((a, i) => (
            <div key={i} className="flex items-center gap-1 text-[10px] text-foreground/80">
              <span className="text-[10px]">{a.emoji}</span> {a.label}
            </div>
          ))}
        </div>
      )}

      {data.escalations.length > 0 && (
        <div className="px-3 pb-2.5 pt-0.5">
          <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Eskalation</p>
          <div className="flex flex-wrap gap-0.5">
            {data.escalations.map((e, i) => (
              <span key={i} className="inline-block rounded-full px-1.5 py-px text-[8px] font-medium bg-destructive/10 text-destructive">{e}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface DecisionNodeData {
  label: string;
  question: string;
  yesLabel: string;
  noLabel: string;
  [key: string]: unknown;
}

function DecisionNode({ data }: { data: DecisionNodeData }) {
  const colors = STATUS_COLORS.decision;
  return (
    <div className="relative" style={{ width: 140, height: 140 }}>
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !border-2" style={{ borderColor: colors.border, backgroundColor: colors.accent }} />
      <Handle type="source" position={Position.Right} id="yes" className="!w-3 !h-3 !border-2" style={{ borderColor: '#22C55E', backgroundColor: '#22C55E' }} />
      <Handle type="source" position={Position.Bottom} id="no" className="!w-3 !h-3 !border-2" style={{ borderColor: '#EF4444', backgroundColor: '#EF4444' }} />

      <svg viewBox="0 0 140 140" className="absolute inset-0 w-full h-full drop-shadow-md">
        <polygon points="70,6 134,70 70,134 6,70" fill={colors.bg} stroke={colors.border} strokeWidth="2.5" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-5">
        <p className="text-[10px] font-bold" style={{ color: colors.accent }}>{data.label}</p>
        <p className="text-[8px] text-muted-foreground mt-0.5 leading-tight">{data.question}</p>
      </div>
      {/* Labels */}
      <span className="absolute -right-2 top-1/2 -translate-y-1/2 translate-x-full text-[8px] font-bold text-green-600">✓ {data.yesLabel}</span>
      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full text-[8px] font-bold text-destructive mt-1">✗ {data.noLabel}</span>
    </div>
  );
}

interface RoleNodeData {
  label: string;
  emoji: string;
  description: string;
  colorKey: string;
  [key: string]: unknown;
}

function RoleNode({ data }: { data: RoleNodeData }) {
  const colors = STATUS_COLORS[data.colorKey] || STATUS_COLORS.new;
  return (
    <div className="rounded-xl shadow-md border-2 min-w-[160px]" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !border-2" style={{ borderColor: colors.border, backgroundColor: colors.accent }} />
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !border-2" style={{ borderColor: colors.border, backgroundColor: colors.accent }} />
      <div className="px-3 py-2.5 text-center">
        <span className="text-lg">{data.emoji}</span>
        <p className="text-[11px] font-bold mt-0.5" style={{ color: colors.accent }}>{data.label}</p>
        <p className="text-[9px] text-muted-foreground leading-tight">{data.description}</p>
      </div>
    </div>
  );
}

function RejectedNode({ data }: { data: StatusNodeData }) {
  const colors = STATUS_COLORS.rejected;
  return (
    <div className="rounded-2xl shadow-lg border-2 min-w-[180px]" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !border-2" style={{ borderColor: colors.border, backgroundColor: colors.accent }} />
      <Handle type="target" position={Position.Left} id="left" className="!w-3 !h-3 !border-2" style={{ borderColor: colors.border, backgroundColor: colors.accent }} />
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span className="text-lg">❌</span>
        <div>
          <p className="text-xs font-bold text-destructive">Abgelehnt</p>
          <p className="text-[10px] text-muted-foreground">{data.count} Leads</p>
        </div>
      </div>
      <div className="px-3 pb-2.5">
        <div className="flex flex-wrap gap-0.5">
          {['Nicht interessiert', 'Kein Bedarf', 'Nicht passend', 'Nicht erreicht'].map((r, i) => (
            <span key={i} className="inline-block rounded-full px-1.5 py-px text-[8px] font-medium bg-destructive/10 text-destructive">{r}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

const nodeTypes = {
  statusNode: StatusNode,
  decisionNode: DecisionNode,
  roleNode: RoleNode,
  rejectedNode: RejectedNode,
};

// ── Main ──
interface ProcessReactFlowProps {
  leads: Lead[];
}

export default function ProcessReactFlow({ leads }: ProcessReactFlowProps) {
  const total = leads.length;

  const countByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    leads.forEach(l => { map[l.status] = (map[l.status] || 0) + 1; });
    return map;
  }, [leads]);

  const initialNodes: Node[] = useMemo(() => {
    const X = 0; const Y = 0;
    const COL = 300; const ROW_MAIN = 0; const ROW_APPROVAL = 260;

    return [
      // ── Row 1: Main recruiting flow ──
      mkStatus('new', 'Neuer Lead', '🆕', X, ROW_MAIN, 'Teamleiter / Backoffice',
        [{ label: 'PLZ-Zuweisung', emoji: '📍' }, { label: 'Duplikatprüfung', emoji: '🔍' }, { label: 'Erstkontakt', emoji: '📞' }],
        ['Rückruf', 'Nicht erreicht', 'Nicht interessiert']),
      mkStatus('contacted', 'Kontaktiert', '📞', COL, ROW_MAIN, 'Teamleiter / Backoffice',
        [{ label: 'Termin erstellen', emoji: '📅' }, { label: 'Insights senden', emoji: '🧠' }, { label: 'E-Mail', emoji: '✉️' }],
        ['Rückruf (Zähler)', 'Nicht erreicht']),
      mkStatus('appointment', 'Terminiert', '📅', COL * 2, ROW_MAIN, 'Teamleiter / Backoffice',
        [{ label: 'Gespräch führen', emoji: '🎥' }, { label: 'Dokumente', emoji: '📄' }, { label: 'Status-Wizard', emoji: '🧙' }],
        ['Nicht passend', 'Kein Bedarf']),
      mkStatus('follow_up', 'Follow-up', '🔄', COL * 3, ROW_MAIN, 'Teamleiter',
        [{ label: 'DISC-Profil', emoji: '🧠' }, { label: 'Dokumente prüfen', emoji: '📋' }, { label: 'Freigabe beantragen', emoji: '📤' }],
        ['Nicht passend', 'Nicht interessiert']),

      // ── Decision: Ready for Approval? ──
      mkDecision('dec_approval', COL * 4 + 30, ROW_MAIN + 20, 'Freigabe?', 'Alle Unterlagen\nvollständig?', 'Ja', 'Zurück'),

      // ── Row 2: Approval chain ──
      mkRole('role_controlling', COL * 5 + 40, ROW_APPROVAL - 30, '💰', 'Controlling', 'Budget & Kosten prüfen', 'controlling'),
      mkDecision('dec_controlling', COL * 6 + 20, ROW_APPROVAL - 10, 'Freigabe?', 'Controlling\ngenehmigt?', 'Weiter', 'Ablehnen'),

      mkRole('role_gl', COL * 7, ROW_APPROVAL - 30, '🏢', 'Geschäftsleitung', 'Strategische Prüfung', 'management'),
      mkDecision('dec_gl', COL * 8 - 20, ROW_APPROVAL - 10, 'Freigabe?', 'GL\ngenehmigt?', 'Weiter', 'Ablehnen'),

      mkRole('role_hr', COL * 9 - 40, ROW_APPROVAL - 30, '👥', 'HR', 'Vertrag & Onboarding', 'hr'),
      mkDecision('dec_hr', COL * 10 - 60, ROW_APPROVAL - 10, 'Abschluss?', 'HR\nabgeschlossen?', 'Einstellen', 'Ablehnen'),

      // ── Final status ──
      mkStatus('hired', 'Eingestellt', '✅', COL * 11 - 80, ROW_APPROVAL - 50, 'HR',
        [{ label: 'Willkommen', emoji: '✉️' }, { label: 'Archivierung', emoji: '📁' }], []),

      // ── Rejected ──
      { id: 'rejected', type: 'rejectedNode', position: { x: COL * 6 + 80, y: ROW_APPROVAL + 200 },
        data: { status: 'rejected', label: 'Abgelehnt', count: countByStatus['rejected'] || 0, emoji: '❌', actions: [], escalations: [], total } as StatusNodeData,
        draggable: true },
    ];

    function mkStatus(id: string, label: string, emoji: string, x: number, y: number, role: string,
      actions: { label: string; emoji: string }[], escalations: string[]): Node {
      return {
        id, type: 'statusNode', position: { x, y }, draggable: true,
        data: { status: id, label, emoji, count: countByStatus[id] || 0, total, role, actions, escalations } as StatusNodeData,
      };
    }
    function mkDecision(id: string, x: number, y: number, label: string, question: string, yesLabel: string, noLabel: string): Node {
      return { id, type: 'decisionNode', position: { x, y }, draggable: true, data: { label, question, yesLabel, noLabel } as DecisionNodeData };
    }
    function mkRole(id: string, x: number, y: number, emoji: string, label: string, description: string, colorKey: string): Node {
      return { id, type: 'roleNode', position: { x, y }, draggable: true, data: { label, emoji, description, colorKey } as RoleNodeData };
    }
  }, [countByStatus, total]);

  const initialEdges: Edge[] = useMemo(() => {
    const e = (id: string, source: string, target: string, opts: Partial<Edge> = {}): Edge => ({
      id, source, target, type: 'smoothstep', animated: true,
      style: { strokeWidth: 2.5, stroke: '#94A3B8' },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#94A3B8' },
      ...opts,
    });

    const green = { style: { strokeWidth: 2.5, stroke: '#22C55E' }, markerEnd: { type: MarkerType.ArrowClosed as const, color: '#22C55E' } };
    const red = { style: { strokeWidth: 1.5, stroke: '#F87171', strokeDasharray: '6 3' }, markerEnd: { type: MarkerType.ArrowClosed as const, color: '#EF4444' }, animated: false };

    return [
      // Main flow
      e('e1', 'new', 'contacted', { style: { strokeWidth: 2.5, stroke: STATUS_COLORS.new.accent } }),
      e('e2', 'contacted', 'appointment', { style: { strokeWidth: 2.5, stroke: STATUS_COLORS.contacted.accent } }),
      e('e3', 'appointment', 'follow_up', { style: { strokeWidth: 2.5, stroke: STATUS_COLORS.appointment.accent } }),
      e('e4', 'follow_up', 'dec_approval', { style: { strokeWidth: 2.5, stroke: STATUS_COLORS.follow_up.accent } }),

      // Approval chain
      e('e5', 'dec_approval', 'role_controlling', { sourceHandle: 'yes', ...green }),
      e('e6', 'role_controlling', 'dec_controlling'),
      e('e7', 'dec_controlling', 'role_gl', { sourceHandle: 'yes', ...green }),
      e('e8', 'role_gl', 'dec_gl'),
      e('e9', 'dec_gl', 'role_hr', { sourceHandle: 'yes', ...green }),
      e('e10', 'role_hr', 'dec_hr'),
      e('e11', 'dec_hr', 'hired', { sourceHandle: 'yes', ...green }),

      // Rejections from decisions
      e('r1', 'dec_controlling', 'rejected', { sourceHandle: 'no', targetHandle: 'left', ...red }),
      e('r2', 'dec_gl', 'rejected', { sourceHandle: 'no', targetHandle: 'left', ...red }),
      e('r3', 'dec_hr', 'rejected', { sourceHandle: 'no', targetHandle: 'left', ...red }),

      // Rejections from main flow
      e('r4', 'new', 'rejected', { sourceHandle: 'bottom', ...red }),
      e('r5', 'contacted', 'rejected', { sourceHandle: 'bottom', ...red }),
      e('r6', 'appointment', 'rejected', { sourceHandle: 'bottom', ...red }),
      e('r7', 'follow_up', 'rejected', { sourceHandle: 'bottom', ...red }),

      // Back from decision to follow_up
      e('back1', 'dec_approval', 'follow_up', { sourceHandle: 'no', animated: false,
        style: { strokeWidth: 1.5, stroke: '#94A3B8', strokeDasharray: '4 4' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#94A3B8' },
      }),
    ];
  }, []);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 px-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="h-2.5 w-6 rounded-full bg-green-500" /> Freigabe
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="h-0.5 w-6 rounded-full bg-destructive" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 3px, hsl(var(--card)) 3px, hsl(var(--card)) 5px)' }} /> Ablehnung
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="h-2.5 w-2.5 rounded-sm bg-yellow-400 rotate-45" /> Entscheidung
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="h-2.5 w-5 rounded border-2 border-orange-400 bg-orange-50" /> Approval-Rolle
        </div>
        <span className="ml-auto text-[10px] text-muted-foreground italic">💡 Nodes verschiebbar · Zoom & Pan möglich</span>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden" style={{ height: 650 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} color="hsl(var(--border))" />
          <Controls className="!bg-card !border !border-border !rounded-lg !shadow-sm" showInteractive={false} />
          <MiniMap
            className="!bg-card !border !border-border !rounded-lg"
            maskColor="hsl(var(--muted) / 0.5)"
            nodeColor={(node) => STATUS_COLORS[node.id]?.accent || STATUS_COLORS[node.data?.colorKey as string]?.accent || '#888'}
          />
          <Panel position="top-right" className="!bg-card/90 !backdrop-blur rounded-lg border px-3 py-2 shadow-sm">
            <p className="text-[10px] font-semibold text-muted-foreground">Recruiting-Prozess mit Approval-Kette</p>
            <p className="text-[9px] text-muted-foreground">Follow-up → Controlling → GL → HR → Eingestellt</p>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}
