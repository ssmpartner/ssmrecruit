import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Phone, PhoneIncoming, PhoneOutgoing, Mic, Building2, Bot } from 'lucide-react';

const MOCK_NUMBERS = [
  { id: '1', label: 'SSM Hauptnummer Zürich', number: '+41 44 123 45 67', country: 'CH', region: 'Zürich', type: 'local', agency: 'SSM Zürich', agent: 'SSM Recruiting Bot', inbound: true, outbound: true, recording: true, status: 'active', provider: 'Twilio (vorbereitet)', providerStatus: 'prepared' as const },
  { id: '2', label: 'SSM Bern Inbound', number: '+41 31 234 56 78', country: 'CH', region: 'Bern', type: 'local', agency: 'SSM Bern', agent: 'SSM Inbound Assistent', inbound: true, outbound: false, recording: false, status: 'active', provider: 'Twilio (vorbereitet)', providerStatus: 'prepared' as const },
  { id: '3', label: 'SSM Testnummer', number: '+41 44 999 00 01', country: 'CH', region: 'Zürich', type: 'test', agency: '–', agent: '–', inbound: true, outbound: true, recording: true, status: 'inactive', provider: 'Mock', providerStatus: 'mock' as const },
];

export default function NumbersTab() {
  const [showCreate, setShowCreate] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h3 className="text-lg font-semibold">Voice Numbers</h3><p className="text-sm text-muted-foreground">Telefonnummern für KI-Agenten</p></div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nummer hinzufügen</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Rufnummer hinzufügen</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5"><Label>Label</Label><Input placeholder="z.B. SSM Hauptnummer" /></div>
              <div className="space-y-1.5"><Label>Nummer</Label><Input placeholder="+41 44 ..." /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Land</Label><Input defaultValue="CH" /></div>
                <div className="space-y-1.5"><Label>Region</Label><Input placeholder="Zürich" /></div>
              </div>
              <div className="space-y-1.5"><Label>Typ</Label>
                <Select defaultValue="local"><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="local">Lokal</SelectItem><SelectItem value="toll_free">Gratisnummer</SelectItem><SelectItem value="mobile">Mobil</SelectItem><SelectItem value="test">Test</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2"><Switch defaultChecked id="n-in" /><Label htmlFor="n-in">Inbound</Label></div>
                <div className="flex items-center gap-2"><Switch defaultChecked id="n-out" /><Label htmlFor="n-out">Outbound</Label></div>
                <div className="flex items-center gap-2"><Switch id="n-rec" /><Label htmlFor="n-rec">Recording</Label></div>
              </div>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowCreate(false)}>Abbrechen</Button>
                <Button onClick={() => { toast.success('Nummer hinzugefügt (Mock)'); setShowCreate(false); }}>Hinzufügen</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Label</TableHead><TableHead>Nummer</TableHead><TableHead>Region</TableHead><TableHead>Typ</TableHead>
              <TableHead>Provider</TableHead><TableHead>Agentur</TableHead><TableHead>Agent</TableHead><TableHead>In</TableHead><TableHead>Out</TableHead><TableHead>Rec</TableHead><TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_NUMBERS.map(n => (
              <TableRow key={n.id}>
                <TableCell className="font-medium text-sm">{n.label}</TableCell>
                <TableCell className="font-mono text-sm">{n.number}</TableCell>
                <TableCell className="text-sm">{n.region}, {n.country}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{n.type}</Badge></TableCell>
                <TableCell>
                  <Badge variant={n.providerStatus === 'prepared' ? 'secondary' : 'outline'} className="text-[10px]">
                    {n.provider}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{n.agency}</TableCell>
                <TableCell className="text-sm">{n.agent}</TableCell>
                <TableCell>{n.inbound ? <PhoneIncoming className="h-3.5 w-3.5 text-green-600" /> : <span className="text-muted-foreground">–</span>}</TableCell>
                <TableCell>{n.outbound ? <PhoneOutgoing className="h-3.5 w-3.5 text-blue-600" /> : <span className="text-muted-foreground">–</span>}</TableCell>
                <TableCell>{n.recording ? <Mic className="h-3.5 w-3.5 text-orange-500" /> : <span className="text-muted-foreground">–</span>}</TableCell>
                <TableCell><Badge variant={n.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">{n.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
