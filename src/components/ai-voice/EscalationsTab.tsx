import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Clock, User, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

const MOCK_ESCALATIONS = [
  { id: '1', session: 'MOCK-005', type: 'human_handover', reason: 'Kandidat wünscht persönlichen Ansprechpartner', agent: 'SSM Recruiting Bot', lead: 'Lisa Weber', assigned_to: 'M. Bauer (Berater)', assigned_role: 'teamleiter', priority: 'high', status: 'open', due: '2026-04-09T16:00:00Z', created: '2026-04-08T11:20:00Z' },
  { id: '2', session: 'MOCK-003', type: 'no_answer_limit', reason: '3 Anrufversuche ohne Antwort', agent: 'SSM Recruiting Bot', lead: 'Anna Keller', assigned_to: '–', assigned_role: 'backoffice', priority: 'medium', status: 'open', due: '2026-04-10T12:00:00Z', created: '2026-04-08T16:30:00Z' },
  { id: '3', session: 'MOCK-001', type: 'compliance_warning', reason: 'Möglicher Verstoss gegen Gehaltsregel', agent: 'SSM Recruiting Bot', lead: 'Max Mustermann', assigned_to: 'B. Chagra (Admin)', assigned_role: 'superadmin', priority: 'critical', status: 'resolved', due: '2026-04-09T10:00:00Z', created: '2026-04-09T09:15:00Z' },
];

const PRIORITY_CONFIG: Record<string, { color: string; label: string }> = {
  low: { color: 'bg-gray-100 text-gray-800', label: 'Niedrig' },
  medium: { color: 'bg-yellow-100 text-yellow-800', label: 'Mittel' },
  high: { color: 'bg-orange-100 text-orange-800', label: 'Hoch' },
  critical: { color: 'bg-red-100 text-red-800', label: 'Kritisch' },
};

export default function EscalationsTab() {
  const [statusFilter, setStatusFilter] = useState('all');
  const filtered = MOCK_ESCALATIONS.filter(e => statusFilter === 'all' || e.status === statusFilter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h3 className="text-lg font-semibold">Eskalationen</h3><p className="text-sm text-muted-foreground">Offene und bearbeitete Eskalationen</p></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Alle</SelectItem><SelectItem value="open">Offen</SelectItem><SelectItem value="resolved">Gelöst</SelectItem></SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3 text-center"><AlertTriangle className="h-4 w-4 mx-auto mb-1 text-orange-500" /><p className="text-xl font-bold">{MOCK_ESCALATIONS.filter(e => e.status === 'open').length}</p><p className="text-[10px] text-muted-foreground">Offen</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><Clock className="h-4 w-4 mx-auto mb-1 text-yellow-500" /><p className="text-xl font-bold">{MOCK_ESCALATIONS.filter(e => e.priority === 'critical' && e.status === 'open').length}</p><p className="text-[10px] text-muted-foreground">Kritisch</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><CheckCircle2 className="h-4 w-4 mx-auto mb-1 text-green-600" /><p className="text-xl font-bold">{MOCK_ESCALATIONS.filter(e => e.status === 'resolved').length}</p><p className="text-[10px] text-muted-foreground">Gelöst</p></CardContent></Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Session</TableHead><TableHead>Typ</TableHead><TableHead>Grund</TableHead><TableHead>Lead</TableHead>
              <TableHead>Zugewiesen an</TableHead><TableHead>Priorität</TableHead><TableHead>Status</TableHead><TableHead>Frist</TableHead><TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(e => {
              const prio = PRIORITY_CONFIG[e.priority] || PRIORITY_CONFIG.medium;
              return (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs">{e.session}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{e.type.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{e.reason}</TableCell>
                  <TableCell className="text-sm font-medium">{e.lead}</TableCell>
                  <TableCell className="text-sm">{e.assigned_to}</TableCell>
                  <TableCell><Badge className={`text-[10px] ${prio.color} hover:${prio.color}`}>{prio.label}</Badge></TableCell>
                  <TableCell><Badge variant={e.status === 'resolved' ? 'default' : 'secondary'} className="text-[10px]">{e.status === 'resolved' ? 'Gelöst' : 'Offen'}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(e.due).toLocaleDateString('de-CH')}</TableCell>
                  <TableCell>
                    {e.status === 'open' && <Button size="sm" variant="outline" onClick={() => toast.success('Eskalation gelöst (Mock)')}>Lösen</Button>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
