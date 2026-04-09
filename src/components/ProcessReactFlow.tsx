import { useMemo, useCallback } from 'react';
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { statusConfig, type LeadStatus, type Lead } from '@/lib/mock-data';
import { AlertTriangle, Users, Phone, Video, Brain, Upload, Mail, Check, FileText, Sparkles, MapPin } from 'lucide-react';

// ── Custom Node ──
const STATUS_COLORS: Record<string, { bg: string; border: string; accent: string }> = {
  new:         { bg: '#EFF6FF', border: '#60A5FA', accent: '#3B82F6' },
  contacted:   { bg: '#FFFBEB', border: '#FBBF24', accent: '#F59E0B' },
  appointment: { bg: '#ECFDF5', border: '#34D399', accent: '#10B981' },
  follow_up:   { bg: '#F5F3FF', border: '#A78BFA', accent: '#8B5CF6' },
  hired:       { bg: '#F0FDF4', border: '#4ADE80', accent: '#22C55E' },
  rejected:    { bg: '#FEF2F2', border: '#F87171', accent: '#EF4444' },
};

const EMOJI: Record<string, string> = {
  new: '🆕', contacted: '📞', appointment: '📅', follow_up: '🔄', hired: '✅', rejected: '❌',
};

const ESCALATION_STATUSES: Record<string, string[]> = {
  new: ['Rückruf', 'Nicht erreicht', 'Nicht interessiert', 'Kein Bedarf', 'Nicht passend', 'Interne Stelle'],
  contacted: ['Rückruf (Zähler)', 'Nicht erreicht'],
  appointment: ['Nicht passend', 'Kein Bedarf'],
  follow_up: ['Nicht passend', 'Kein Bedarf', 'Nicht interessiert'],
};

const ACTIONS: Record<string, { label: string; emoji: string }[]> = {
  new: [
    { label: 'PLZ-Zuweisung', emoji: '📍' },
    { label: 'Duplikatprüfung', emoji: '🔍' },
    { label: 'Erstkontakt', emoji: '📞' },
  ],
  contacted: [
    { label: 'Termin erstellen', emoji: '📅' },
    { label: 'Insights senden', emoji: '🧠' },
    { label: 'E-Mail senden', emoji: '✉️' },
  ],
  appointment: [
    { label: 'Gespräch führen', emoji: '🎥' },
    { label: 'Dokumente anfordern', emoji: '📄' },
    { label: 'KI-Aufgaben', emoji: '✨' },
  ],
  follow_up: [
    { label: 'DISC-Profil', emoji: '🧠' },
    { label: 'Dokumente prüfen', emoji: '📋' },
    { label: 'Entscheidung', emoji: '✅' },
  ],
  hired: [
    { label: 'Willkommen', emoji: '✉️' },
    { label: 'Archivierung', emoji: '📁' },
  ],
};

interface StatusNodeData {
  status: string;
  label: string;
  count: number;
  emoji: string;
  actions: { label: string; emoji: string }[];
  escalations: string[];
  total: number;
  [key: string]: unknown;
}

function StatusNode({ data }: { data: StatusNodeData }) {
  const colors = STATUS_COLORS[data.status] || STATUS_COLORS.new;
  const pct = data.total > 0 ? ((data.count / data.total) * 100).toFixed(0) : '0';

  return (
    <div
      className="rounded-2xl shadow-lg border-2 min-w-[220px] max-w-[260px]"
      style={{ backgroundColor: colors.bg, borderColor: colors.border }}
    >
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !border-2" style={{ borderColor: colors.border, backgroundColor: colors.accent }} />
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !border-2" style={{ borderColor: colors.border, backgroundColor: colors.accent }} />

      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <span className="text-xl">{data.emoji}</span>
        <div className="flex-1">
          <p className="text-sm font-bold" style={{ color: colors.accent }}>{data.label}</p>
          <p className="text-xs text-muted-foreground">{data.count} Leads · {pct}%</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-2">
        <div className="h-1.5 w-full rounded-full bg-black/5">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: colors.accent }}
          />
        </div>
      </div>

      {/* Actions */}
      {data.actions.length > 0 && (
        <div className="px-4 pb-2 space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Aktionen</p>
          {data.actions.map((a, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[11px] text-foreground/80">
              <span className="text-xs">{a.emoji}</span> {a.label}
            </div>
          ))}
        </div>
      )}

      {/* Escalations */}
      {data.escalations.length > 0 && (
        <div className="px-4 pb-3 pt-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Eskalation</p>
          <div className="flex flex-wrap gap-1">
            {data.escalations.map((e, i) => (
              <span key={i} className="inline-block rounded-full px-2 py-0.5 text-[9px] font-medium bg-destructive/10 text-destructive">
                {e}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Rejected Node ──
function RejectedNode({ data }: { data: StatusNodeData }) {
  const colors = STATUS_COLORS.rejected;
  return (
    <div
      className="rounded-2xl shadow-lg border-2 min-w-[200px]"
      style={{ backgroundColor: colors.bg, borderColor: colors.border }}
    >
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !border-2" style={{ borderColor: colors.border, backgroundColor: colors.accent }} />
      <div className="flex items-center gap-2 px-4 py-3">
        <span className="text-xl">❌</span>
        <div>
          <p className="text-sm font-bold text-destructive">Abgelehnt</p>
          <p className="text-xs text-muted-foreground">{data.count} Leads</p>
        </div>
      </div>
      <div className="px-4 pb-3">
        <div className="flex flex-wrap gap-1">
          {['Nicht interessiert', 'Kein Bedarf', 'Nicht passend', 'Nicht erreicht'].map((r, i) => (
            <span key={i} className="inline-block rounded-full px-2 py-0.5 text-[9px] font-medium bg-destructive/10 text-destructive">{r}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

const nodeTypes = {
  statusNode: StatusNode,
  rejectedNode: RejectedNode,
};

// ── Main Component ──
interface ProcessReactFlowProps {
  leads: Lead[];
}

export default function ProcessReactFlow({ leads }: ProcessReactFlowProps) {
  const mainFlow: LeadStatus[] = ['new', 'contacted', 'appointment', 'follow_up', 'hired'];
  const total = leads.length;

  const nodes: Node[] = useMemo(() => {
    const statusNodes: Node[] = mainFlow.map((status, idx) => ({
      id: status,
      type: 'statusNode',
      position: { x: idx * 320, y: 100 },
      data: {
        status,
        label: statusConfig[status].label,
        count: leads.filter(l => l.status === status).length,
        emoji: EMOJI[status],
        actions: ACTIONS[status] || [],
        escalations: ESCALATION_STATUSES[status] || [],
        total,
      },
      draggable: true,
    }));

    // Rejected node below center
    statusNodes.push({
      id: 'rejected',
      type: 'rejectedNode',
      position: { x: 480, y: 380 },
      data: {
        status: 'rejected',
        label: 'Abgelehnt',
        count: leads.filter(l => l.status === 'rejected').length,
        emoji: '❌',
        actions: [],
        escalations: [],
        total,
      },
      draggable: true,
    });

    return statusNodes;
  }, [leads, total]);

  const edges: Edge[] = useMemo(() => {
    const mainEdges: Edge[] = mainFlow.slice(0, -1).map((status, idx) => ({
      id: `${status}-${mainFlow[idx + 1]}`,
      source: status,
      target: mainFlow[idx + 1],
      type: 'smoothstep',
      animated: true,
      style: { stroke: STATUS_COLORS[status]?.accent || '#888', strokeWidth: 2.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: STATUS_COLORS[mainFlow[idx + 1]]?.accent || '#888' },
    }));

    // Rejection edges from key statuses
    const rejectionSources: LeadStatus[] = ['new', 'contacted', 'appointment', 'follow_up'];
    const rejEdges: Edge[] = rejectionSources.map(status => ({
      id: `${status}-rejected`,
      source: status,
      target: 'rejected',
      type: 'smoothstep',
      animated: false,
      style: { stroke: '#F87171', strokeWidth: 1.5, strokeDasharray: '6 3' },
      sourceHandle: undefined,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#EF4444' },
    }));

    return [...mainEdges, ...rejEdges];
  }, []);

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden" style={{ height: 600 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} size={1} color="hsl(var(--border))" />
        <Controls
          className="!bg-card !border !border-border !rounded-lg !shadow-sm"
          showInteractive={false}
        />
        <MiniMap
          className="!bg-card !border !border-border !rounded-lg"
          maskColor="hsl(var(--muted) / 0.5)"
          nodeColor={(node) => STATUS_COLORS[node.id]?.accent || '#888'}
        />
      </ReactFlow>
    </div>
  );
}
