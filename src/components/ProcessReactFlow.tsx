import { useMemo, useState, useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type Connection,
  Position,
  Handle,
  MarkerType,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  reconnectEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { statusConfig, type LeadStatus, type Lead } from '@/lib/mock-data';
import { Plus, Trash2, Edit3, Save, X, Diamond, CircleDot, ShieldCheck, Undo2, Download, Lock, Unlock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
  custom:      { bg: '#F8FAFC', border: '#94A3B8', accent: '#64748B' },
};

const COLOR_OPTIONS = Object.entries(STATUS_COLORS).map(([key, val]) => ({ key, ...val }));

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
  editable?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  nodeId?: string;
  [key: string]: unknown;
}

function StatusNode({ data, id }: { data: StatusNodeData; id: string }) {
  const colors = STATUS_COLORS[data.status] || STATUS_COLORS.custom;
  const pct = data.total > 0 ? ((data.count / data.total) * 100).toFixed(0) : '0';

  return (
    <div className="rounded-2xl shadow-lg border-2 min-w-[210px] max-w-[250px] group relative" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !border-2" style={{ borderColor: colors.border, backgroundColor: colors.accent }} />
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !border-2" style={{ borderColor: colors.border, backgroundColor: colors.accent }} />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!w-3 !h-3 !border-2" style={{ borderColor: colors.border, backgroundColor: colors.accent }} />
      <Handle type="target" position={Position.Top} id="top" className="!w-3 !h-3 !border-2" style={{ borderColor: colors.border, backgroundColor: colors.accent }} />

      {/* Edit/Delete buttons */}
      {data.editable && (
        <div className="absolute -top-3 -right-3 hidden group-hover:flex gap-1 z-50">
          <button onClick={(e) => { e.stopPropagation(); data.onEdit?.(id); }}
            className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:scale-110 transition-transform">
            <Edit3 className="h-3 w-3" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); data.onDelete?.(id); }}
            className="h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md hover:scale-110 transition-transform">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 px-3 pt-3 pb-1.5">
        <span className="text-lg">{data.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold truncate" style={{ color: colors.accent }}>{data.label}</p>
          {data.count > 0 && <p className="text-[10px] text-muted-foreground">{data.count} Leads · {pct}%</p>}
        </div>
      </div>

      {data.role && (
        <div className="px-3 pb-1">
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold" style={{ backgroundColor: colors.accent + '20', color: colors.accent }}>
            👤 {data.role}
          </span>
        </div>
      )}

      {data.count > 0 && (
        <div className="px-3 pb-1.5">
          <div className="h-1 w-full rounded-full bg-black/5">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: colors.accent }} />
          </div>
        </div>
      )}

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
  editable?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  [key: string]: unknown;
}

function DecisionNode({ data, id }: { data: DecisionNodeData; id: string }) {
  const colors = STATUS_COLORS.decision;
  return (
    <div className="relative group" style={{ width: 140, height: 140 }}>
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !border-2" style={{ borderColor: colors.border, backgroundColor: colors.accent }} />
      <Handle type="source" position={Position.Right} id="yes" className="!w-3 !h-3 !border-2" style={{ borderColor: '#22C55E', backgroundColor: '#22C55E' }} />
      <Handle type="source" position={Position.Bottom} id="no" className="!w-3 !h-3 !border-2" style={{ borderColor: '#EF4444', backgroundColor: '#EF4444' }} />
      <Handle type="target" position={Position.Top} id="top" className="!w-3 !h-3 !border-2" style={{ borderColor: colors.border, backgroundColor: colors.accent }} />

      {data.editable && (
        <div className="absolute -top-3 -right-3 hidden group-hover:flex gap-1 z-50">
          <button onClick={(e) => { e.stopPropagation(); data.onEdit?.(id); }}
            className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:scale-110 transition-transform">
            <Edit3 className="h-3 w-3" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); data.onDelete?.(id); }}
            className="h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md hover:scale-110 transition-transform">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}

      <svg viewBox="0 0 140 140" className="absolute inset-0 w-full h-full drop-shadow-md">
        <polygon points="70,6 134,70 70,134 6,70" fill={colors.bg} stroke={colors.border} strokeWidth="2.5" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-5">
        <p className="text-[10px] font-bold" style={{ color: colors.accent }}>{data.label}</p>
        <p className="text-[8px] text-muted-foreground mt-0.5 leading-tight whitespace-pre-line">{data.question}</p>
      </div>
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
  editable?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  [key: string]: unknown;
}

function RoleNode({ data, id }: { data: RoleNodeData; id: string }) {
  const colors = STATUS_COLORS[data.colorKey] || STATUS_COLORS.custom;
  return (
    <div className="rounded-xl shadow-md border-2 min-w-[160px] group relative" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !border-2" style={{ borderColor: colors.border, backgroundColor: colors.accent }} />
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !border-2" style={{ borderColor: colors.border, backgroundColor: colors.accent }} />
      <Handle type="target" position={Position.Top} id="top" className="!w-3 !h-3 !border-2" style={{ borderColor: colors.border, backgroundColor: colors.accent }} />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!w-3 !h-3 !border-2" style={{ borderColor: colors.border, backgroundColor: colors.accent }} />

      {data.editable && (
        <div className="absolute -top-3 -right-3 hidden group-hover:flex gap-1 z-50">
          <button onClick={(e) => { e.stopPropagation(); data.onEdit?.(id); }}
            className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:scale-110 transition-transform">
            <Edit3 className="h-3 w-3" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); data.onDelete?.(id); }}
            className="h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md hover:scale-110 transition-transform">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}

      <div className="px-3 py-2.5 text-center">
        <span className="text-lg">{data.emoji}</span>
        <p className="text-[11px] font-bold mt-0.5" style={{ color: colors.accent }}>{data.label}</p>
        <p className="text-[9px] text-muted-foreground leading-tight">{data.description}</p>
      </div>
    </div>
  );
}

function RejectedNode({ data, id }: { data: StatusNodeData; id: string }) {
  const colors = STATUS_COLORS.rejected;
  return (
    <div className="rounded-2xl shadow-lg border-2 min-w-[180px] group relative" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !border-2" style={{ borderColor: colors.border, backgroundColor: colors.accent }} />
      <Handle type="target" position={Position.Left} id="left" className="!w-3 !h-3 !border-2" style={{ borderColor: colors.border, backgroundColor: colors.accent }} />
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !border-2" style={{ borderColor: colors.border, backgroundColor: colors.accent }} />

      {data.editable && (
        <div className="absolute -top-3 -right-3 hidden group-hover:flex gap-1 z-50">
          <button onClick={(e) => { e.stopPropagation(); data.onEdit?.(id); }}
            className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:scale-110 transition-transform">
            <Edit3 className="h-3 w-3" />
          </button>
        </div>
      )}

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

// ── Edit Dialog ──
type EditNodeType = 'statusNode' | 'decisionNode' | 'roleNode';

interface EditForm {
  nodeType: EditNodeType;
  label: string;
  emoji: string;
  role: string;
  colorKey: string;
  question: string;
  yesLabel: string;
  noLabel: string;
  description: string;
  actions: string; // comma separated
  escalations: string; // comma separated
}

const defaultEditForm: EditForm = {
  nodeType: 'statusNode', label: '', emoji: '📋', role: '', colorKey: 'custom',
  question: '', yesLabel: 'Ja', noLabel: 'Nein', description: '', actions: '', escalations: '',
};

const inputCls = "h-8 w-full rounded-lg border bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring";

// ── Main ──
interface ProcessReactFlowProps {
  leads: Lead[];
}

export default function ProcessReactFlow({ leads }: ProcessReactFlowProps) {
  const { toast } = useToast();
  const total = leads.length;
  const [editMode, setEditMode] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(defaultEditForm);
  const [history, setHistory] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);

  const countByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    leads.forEach(l => { map[l.status] = (map[l.status] || 0) + 1; });
    return map;
  }, [leads]);

  // Callbacks for node edit/delete
  const handleEditNode = useCallback((nodeId: string) => {
    setNodes(prev => {
      const node = prev.find(n => n.id === nodeId);
      if (!node) return prev;
      const d = node.data as any;
      setEditForm({
        nodeType: (node.type as EditNodeType) || 'statusNode',
        label: d.label || '',
        emoji: d.emoji || '📋',
        role: d.role || '',
        colorKey: d.colorKey || d.status || 'custom',
        question: d.question || '',
        yesLabel: d.yesLabel || 'Ja',
        noLabel: d.noLabel || 'Nein',
        description: d.description || '',
        actions: (d.actions || []).map((a: any) => `${a.emoji} ${a.label}`).join(', '),
        escalations: (d.escalations || []).join(', '),
      });
      setEditingNodeId(nodeId);
      setEditDialogOpen(true);
      return prev;
    });
  }, []);

  const handleDeleteNode = useCallback((nodeId: string) => {
    saveHistory();
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
    toast({ title: 'Node entfernt' });
  }, []);

  // Inject edit callbacks into node data
  const injectEditCallbacks = useCallback((nodeList: Node[]): Node[] => {
    return nodeList.map(n => ({
      ...n,
      data: { ...n.data, editable: editMode, onEdit: handleEditNode, onDelete: handleDeleteNode },
    }));
  }, [editMode, handleEditNode, handleDeleteNode]);

  const buildInitialNodes = useCallback((): Node[] => {
    const COL = 300; const ROW_MAIN = 0; const ROW_APPROVAL = 260;

    const mkStatus = (id: string, label: string, emoji: string, x: number, y: number, role: string,
      actions: { label: string; emoji: string }[], escalations: string[]): Node => ({
      id, type: 'statusNode', position: { x, y }, draggable: true,
      data: { status: id, label, emoji, count: countByStatus[id] || 0, total, role, actions, escalations } as StatusNodeData,
    });
    const mkDecision = (id: string, x: number, y: number, label: string, question: string, yesLabel: string, noLabel: string): Node => ({
      id, type: 'decisionNode', position: { x, y }, draggable: true,
      data: { label, question, yesLabel, noLabel } as DecisionNodeData,
    });
    const mkRole = (id: string, x: number, y: number, emoji: string, label: string, description: string, colorKey: string): Node => ({
      id, type: 'roleNode', position: { x, y }, draggable: true,
      data: { label, emoji, description, colorKey } as RoleNodeData,
    });

    return [
      mkStatus('new', 'Neuer Lead', '🆕', 0, ROW_MAIN, 'Teamleiter / Backoffice',
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
      mkDecision('dec_approval', COL * 4 + 30, ROW_MAIN + 20, 'Freigabe?', 'Alle Unterlagen\nvollständig?', 'Ja', 'Zurück'),
      mkRole('role_controlling', COL * 5 + 40, ROW_APPROVAL - 30, '💰', 'Controlling', 'Budget & Kosten prüfen', 'controlling'),
      mkDecision('dec_controlling', COL * 6 + 20, ROW_APPROVAL - 10, 'Freigabe?', 'Controlling\ngenehmigt?', 'Weiter', 'Ablehnen'),
      mkRole('role_gl', COL * 7, ROW_APPROVAL - 30, '🏢', 'Geschäftsleitung', 'Strategische Prüfung', 'management'),
      mkDecision('dec_gl', COL * 8 - 20, ROW_APPROVAL - 10, 'Freigabe?', 'GL\ngenehmigt?', 'Weiter', 'Ablehnen'),
      mkRole('role_hr', COL * 9 - 40, ROW_APPROVAL - 30, '👥', 'HR', 'Vertrag & Onboarding', 'hr'),
      mkDecision('dec_hr', COL * 10 - 60, ROW_APPROVAL - 10, 'Abschluss?', 'HR\nabgeschlossen?', 'Einstellen', 'Ablehnen'),
      mkStatus('hired', 'Eingestellt', '✅', COL * 11 - 80, ROW_APPROVAL - 50, 'HR',
        [{ label: 'Willkommen', emoji: '✉️' }, { label: 'Archivierung', emoji: '📁' }], []),
      { id: 'rejected', type: 'rejectedNode', position: { x: COL * 6 + 80, y: ROW_APPROVAL + 200 },
        data: { status: 'rejected', label: 'Abgelehnt', count: countByStatus['rejected'] || 0, emoji: '❌', actions: [], escalations: [], total } as StatusNodeData,
        draggable: true },
    ];
  }, [countByStatus, total]);

  const buildInitialEdges = useCallback((): Edge[] => {
    const e = (id: string, source: string, target: string, opts: Partial<Edge> = {}): Edge => ({
      id, source, target, type: 'smoothstep', animated: true,
      style: { strokeWidth: 2.5, stroke: '#94A3B8' },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#94A3B8' },
      ...opts,
    });
    const green = { style: { strokeWidth: 2.5, stroke: '#22C55E' }, markerEnd: { type: MarkerType.ArrowClosed as const, color: '#22C55E' } };
    const red = { style: { strokeWidth: 1.5, stroke: '#F87171', strokeDasharray: '6 3' }, markerEnd: { type: MarkerType.ArrowClosed as const, color: '#EF4444' }, animated: false };

    return [
      e('e1', 'new', 'contacted', { style: { strokeWidth: 2.5, stroke: STATUS_COLORS.new.accent } }),
      e('e2', 'contacted', 'appointment', { style: { strokeWidth: 2.5, stroke: STATUS_COLORS.contacted.accent } }),
      e('e3', 'appointment', 'follow_up', { style: { strokeWidth: 2.5, stroke: STATUS_COLORS.appointment.accent } }),
      e('e4', 'follow_up', 'dec_approval', { style: { strokeWidth: 2.5, stroke: STATUS_COLORS.follow_up.accent } }),
      e('e5', 'dec_approval', 'role_controlling', { sourceHandle: 'yes', ...green }),
      e('e6', 'role_controlling', 'dec_controlling'),
      e('e7', 'dec_controlling', 'role_gl', { sourceHandle: 'yes', ...green }),
      e('e8', 'role_gl', 'dec_gl'),
      e('e9', 'dec_gl', 'role_hr', { sourceHandle: 'yes', ...green }),
      e('e10', 'role_hr', 'dec_hr'),
      e('e11', 'dec_hr', 'hired', { sourceHandle: 'yes', ...green }),
      e('r1', 'dec_controlling', 'rejected', { sourceHandle: 'no', targetHandle: 'left', ...red }),
      e('r2', 'dec_gl', 'rejected', { sourceHandle: 'no', targetHandle: 'left', ...red }),
      e('r3', 'dec_hr', 'rejected', { sourceHandle: 'no', targetHandle: 'left', ...red }),
      e('r4', 'new', 'rejected', { sourceHandle: 'bottom', ...red }),
      e('r5', 'contacted', 'rejected', { sourceHandle: 'bottom', ...red }),
      e('r6', 'appointment', 'rejected', { sourceHandle: 'bottom', ...red }),
      e('r7', 'follow_up', 'rejected', { sourceHandle: 'bottom', ...red }),
      e('back1', 'dec_approval', 'follow_up', { sourceHandle: 'no', animated: false,
        style: { strokeWidth: 1.5, stroke: '#94A3B8', strokeDasharray: '4 4' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#94A3B8' },
      }),
    ];
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState(injectEditCallbacks(buildInitialNodes()));
  const [edges, setEdges, onEdgesChange] = useEdgesState(buildInitialEdges());

  // Update edit callbacks when editMode changes
  const prevEditModeRef = useRef(editMode);
  if (prevEditModeRef.current !== editMode) {
    prevEditModeRef.current = editMode;
    setNodes(prev => prev.map(n => ({
      ...n,
      data: { ...n.data, editable: editMode, onEdit: handleEditNode, onDelete: handleDeleteNode },
    })));
  }

  const saveHistory = useCallback(() => {
    setHistory(prev => [...prev.slice(-19), { nodes: nodes.map(n => ({ ...n })), edges: edges.map(e => ({ ...e })) }]);
  }, [nodes, edges]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setNodes(injectEditCallbacks(last.nodes));
    setEdges(last.edges);
    setHistory(prev => prev.slice(0, -1));
    toast({ title: 'Rückgängig gemacht' });
  }, [history, injectEditCallbacks]);

  // Connect handler
  const onConnect = useCallback((connection: Connection) => {
    if (!editMode) return;
    saveHistory();
    setEdges(prev => addEdge({
      ...connection,
      type: 'smoothstep',
      animated: true,
      style: { strokeWidth: 2, stroke: '#94A3B8' },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#94A3B8' },
    }, prev));
  }, [editMode, saveHistory]);

  // Delete edge
  const onEdgesDelete = useCallback((deletedEdges: Edge[]) => {
    if (!editMode) return;
    saveHistory();
  }, [editMode, saveHistory]);

  // Add new node
  const addNode = useCallback((type: EditNodeType) => {
    const id = `node-${Date.now()}`;
    setEditForm({ ...defaultEditForm, nodeType: type });
    setEditingNodeId(id);
    setEditDialogOpen(true);
  }, []);

  // Save edit
  const saveNodeEdit = useCallback(() => {
    if (!editingNodeId) return;
    saveHistory();

    const existing = nodes.find(n => n.id === editingNodeId);

    if (existing) {
      // Update existing node
      setNodes(prev => prev.map(n => {
        if (n.id !== editingNodeId) return n;
        const base = { editable: editMode, onEdit: handleEditNode, onDelete: handleDeleteNode };

        if (editForm.nodeType === 'decisionNode') {
          return { ...n, type: 'decisionNode', data: { ...base, label: editForm.label, question: editForm.question, yesLabel: editForm.yesLabel, noLabel: editForm.noLabel } as any };
        } else if (editForm.nodeType === 'roleNode') {
          return { ...n, type: 'roleNode', data: { ...base, label: editForm.label, emoji: editForm.emoji, description: editForm.description, colorKey: editForm.colorKey } as any };
        } else {
          const actions = editForm.actions.split(',').filter(Boolean).map(a => {
            const trimmed = a.trim();
            const emoji = trimmed.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)/u)?.[0] || '📋';
            const label = trimmed.replace(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s*/u, '');
            return { emoji, label: label || trimmed };
          });
          const escalations = editForm.escalations.split(',').map(s => s.trim()).filter(Boolean);
          return { ...n, type: 'statusNode', data: { ...base, status: editForm.colorKey, label: editForm.label, emoji: editForm.emoji, role: editForm.role, count: (n.data as any).count || 0, total, actions, escalations } as any };
        }
      }));
    } else {
      // Create new node
      const base: any = { editable: editMode, onEdit: handleEditNode, onDelete: handleDeleteNode };
      let newNode: Node;

      // Position in viewport center area
      const x = 200 + Math.random() * 400;
      const y = 100 + Math.random() * 200;

      if (editForm.nodeType === 'decisionNode') {
        newNode = { id: editingNodeId, type: 'decisionNode', position: { x, y }, draggable: true,
          data: { ...base, label: editForm.label || 'Entscheidung', question: editForm.question || 'Bedingung?', yesLabel: editForm.yesLabel, noLabel: editForm.noLabel } as DecisionNodeData };
      } else if (editForm.nodeType === 'roleNode') {
        newNode = { id: editingNodeId, type: 'roleNode', position: { x, y }, draggable: true,
          data: { ...base, label: editForm.label || 'Rolle', emoji: editForm.emoji, description: editForm.description, colorKey: editForm.colorKey } as RoleNodeData };
      } else {
        const actions = editForm.actions.split(',').filter(Boolean).map(a => {
          const trimmed = a.trim();
          return { emoji: '📋', label: trimmed };
        });
        const escalations = editForm.escalations.split(',').map(s => s.trim()).filter(Boolean);
        newNode = { id: editingNodeId, type: 'statusNode', position: { x, y }, draggable: true,
          data: { ...base, status: editForm.colorKey, label: editForm.label || 'Neuer Schritt', emoji: editForm.emoji, role: editForm.role, count: 0, total, actions, escalations } as StatusNodeData };
      }
      setNodes(prev => [...prev, newNode]);
    }

    setEditDialogOpen(false);
    setEditingNodeId(null);
    toast({ title: existing ? 'Node aktualisiert' : 'Node hinzugefügt' });
  }, [editingNodeId, editForm, editMode, handleEditNode, handleDeleteNode, nodes, total, saveHistory]);

  // Edge click to delete
  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    if (!editMode) return;
    saveHistory();
    setEdges(prev => prev.filter(e => e.id !== edge.id));
    toast({ title: 'Verbindung entfernt' });
  }, [editMode, saveHistory]);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        <button
          onClick={() => setEditMode(!editMode)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${editMode ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted'}`}
        >
          {editMode ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
          {editMode ? 'Bearbeitung aktiv' : 'Bearbeiten'}
        </button>

        {editMode && (
          <>
            <div className="h-5 w-px bg-border" />
            <button onClick={() => addNode('statusNode')} className="inline-flex items-center gap-1.5 rounded-lg border bg-card hover:bg-muted px-3 py-1.5 text-xs font-medium transition-colors">
              <CircleDot className="h-3.5 w-3.5 text-primary" /> Status-Node
            </button>
            <button onClick={() => addNode('decisionNode')} className="inline-flex items-center gap-1.5 rounded-lg border bg-card hover:bg-muted px-3 py-1.5 text-xs font-medium transition-colors">
              <Diamond className="h-3.5 w-3.5 text-yellow-500" /> Entscheidung
            </button>
            <button onClick={() => addNode('roleNode')} className="inline-flex items-center gap-1.5 rounded-lg border bg-card hover:bg-muted px-3 py-1.5 text-xs font-medium transition-colors">
              <ShieldCheck className="h-3.5 w-3.5 text-orange-500" /> Rolle
            </button>
            <div className="h-5 w-px bg-border" />
            <button onClick={undo} disabled={history.length === 0} className="inline-flex items-center gap-1.5 rounded-lg border bg-card hover:bg-muted px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40">
              <Undo2 className="h-3.5 w-3.5" /> Rückgängig
            </button>
          </>
        )}

        {/* Legend */}
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <div className="h-2 w-5 rounded-full bg-green-500" /> Freigabe
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <div className="h-px w-5 border-t-2 border-dashed border-destructive" /> Ablehnung
          </div>
          {editMode && (
            <span className="text-[10px] text-primary font-medium">💡 Handles ziehen = verbinden · Edge klicken = löschen · Hover = bearbeiten</span>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden" style={{ height: 650 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={editMode ? onNodesChange : undefined}
          onEdgesChange={editMode ? onEdgesChange : undefined}
          onConnect={onConnect}
          onEdgeClick={onEdgeClick}
          nodeTypes={nodeTypes}
          nodesDraggable={editMode}
          nodesConnectable={editMode}
          elementsSelectable={editMode}
          deleteKeyCode={editMode ? 'Delete' : null}
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
            nodeColor={(node) => STATUS_COLORS[node.id]?.accent || STATUS_COLORS[(node.data as any)?.colorKey]?.accent || '#888'}
          />
          <Panel position="top-right" className="!bg-card/90 !backdrop-blur rounded-lg border px-3 py-2 shadow-sm">
            <p className="text-[10px] font-semibold text-muted-foreground">Recruiting-Prozess mit Approval-Kette</p>
            <p className="text-[9px] text-muted-foreground">Follow-up → Controlling → GL → HR → Eingestellt</p>
          </Panel>
        </ReactFlow>
      </div>

      {/* ── Edit Dialog ── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-primary" />
              {nodes.find(n => n.id === editingNodeId) ? 'Node bearbeiten' : 'Neuen Node erstellen'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Node type (only for new) */}
            {!nodes.find(n => n.id === editingNodeId) && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Node-Typ</label>
                <div className="flex gap-2 mt-1">
                  {(['statusNode', 'decisionNode', 'roleNode'] as EditNodeType[]).map(t => (
                    <button key={t} onClick={() => setEditForm(f => ({ ...f, nodeType: t }))}
                      className={`flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${editForm.nodeType === t ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}>
                      {t === 'statusNode' ? '📋 Status' : t === 'decisionNode' ? '💎 Entscheidung' : '🛡️ Rolle'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Common fields */}
            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-1">
                <label className="text-xs font-medium text-muted-foreground">Emoji</label>
                <input className={inputCls} value={editForm.emoji} onChange={e => setEditForm(f => ({ ...f, emoji: e.target.value }))} />
              </div>
              <div className="col-span-3">
                <label className="text-xs font-medium text-muted-foreground">Bezeichnung</label>
                <input className={inputCls} value={editForm.label} onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))} placeholder="z.B. Neuer Schritt" />
              </div>
            </div>

            {/* Color / theme */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Farbe</label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {COLOR_OPTIONS.map(c => (
                  <button key={c.key} onClick={() => setEditForm(f => ({ ...f, colorKey: c.key }))}
                    className={`h-7 w-7 rounded-full border-2 transition-transform ${editForm.colorKey === c.key ? 'scale-125 ring-2 ring-ring' : 'hover:scale-110'}`}
                    style={{ backgroundColor: c.bg, borderColor: c.border }}
                    title={c.key} />
                ))}
              </div>
            </div>

            {/* Type-specific fields */}
            {editForm.nodeType === 'statusNode' && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Zuständige Rolle</label>
                  <input className={inputCls} value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))} placeholder="z.B. Teamleiter" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Aktionen <span className="text-muted-foreground/50">(kommagetrennt)</span></label>
                  <input className={inputCls} value={editForm.actions} onChange={e => setEditForm(f => ({ ...f, actions: e.target.value }))} placeholder="📞 Anrufen, 📧 E-Mail senden" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Eskalations-Status <span className="text-muted-foreground/50">(kommagetrennt)</span></label>
                  <input className={inputCls} value={editForm.escalations} onChange={e => setEditForm(f => ({ ...f, escalations: e.target.value }))} placeholder="Nicht erreicht, Kein Bedarf" />
                </div>
              </>
            )}

            {editForm.nodeType === 'decisionNode' && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Frage / Bedingung</label>
                  <input className={inputCls} value={editForm.question} onChange={e => setEditForm(f => ({ ...f, question: e.target.value }))} placeholder="Alle Dokumente vorhanden?" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Ja-Label</label>
                    <input className={inputCls} value={editForm.yesLabel} onChange={e => setEditForm(f => ({ ...f, yesLabel: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Nein-Label</label>
                    <input className={inputCls} value={editForm.noLabel} onChange={e => setEditForm(f => ({ ...f, noLabel: e.target.value }))} />
                  </div>
                </div>
              </>
            )}

            {editForm.nodeType === 'roleNode' && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Beschreibung</label>
                <input className={inputCls} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="Was prüft diese Rolle?" />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => { setEditDialogOpen(false); setEditingNodeId(null); }}
              className="inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm hover:bg-muted transition-colors">
              <X className="h-3.5 w-3.5" /> Abbrechen
            </button>
            <button onClick={saveNodeEdit}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm hover:bg-primary/90 transition-colors">
              <Save className="h-3.5 w-3.5" /> Speichern
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
