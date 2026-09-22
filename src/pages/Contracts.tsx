import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { FileSignature, FileText, Image, Plus, Settings2, ArrowLeft } from 'lucide-react';
import ContractsOverviewTab from '@/components/contracts/ContractsOverviewTab';
import ContractTemplatesTab from '@/components/contracts/ContractTemplatesTab';
import ContractLetterheadTab from '@/components/contracts/ContractLetterheadTab';
import ContractSimpleWizard from '@/components/contracts/ContractSimpleWizard';
import { useContractPermissions } from '@/hooks/useContractPermissions';

export default function Contracts() {
  const { loading, isSuperadmin } = useAuth();
  const { has, loading: permLoading } = useContractPermissions();
  const [view, setView] = useState<'list' | 'setup'>('list');
  const [tab, setTab] = useState('templates');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editTemplateId, setEditTemplateId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const openTemplateEditor = (templateId: string) => {
    setEditTemplateId(templateId);
    setTab('templates');
  };

  if (loading || permLoading) return null;
  if (!has('can_view')) return <Navigate to="/" replace />;

  const header = (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileSignature className="h-6 w-6 text-primary" />
          Verträge
        </h1>
        <p className="text-muted-foreground">
          {view === 'list'
            ? 'Verträge erstellen, prüfen und herunterladen.'
            : 'Einrichtung: Vorlagen und Briefpapier verwalten.'}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {view === 'list' && has('can_generate') && (
          <Button onClick={() => setWizardOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />Neuer Vertrag
          </Button>
        )}
        {isSuperadmin && view === 'list' && (
          <Button variant="outline" size="sm" onClick={() => setView('setup')} className="gap-1.5 text-muted-foreground">
            <Settings2 className="h-3.5 w-3.5" />Einrichtung
          </Button>
        )}
        {isSuperadmin && view === 'setup' && (
          <Button variant="outline" size="sm" onClick={() => setView('list')} className="gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" />Zurück zur Übersicht
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {header}

      {view === 'list' && (
        <ContractsOverviewTab key={reloadKey} onNewContract={() => setWizardOpen(true)} />
      )}

      {view === 'setup' && isSuperadmin && (
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="templates" className="gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Vorlagen
            </TabsTrigger>
            <TabsTrigger value="letterhead" className="gap-1.5">
              <Image className="h-3.5 w-3.5" /> Briefpapier
            </TabsTrigger>
          </TabsList>
          <TabsContent value="templates">
            <ContractTemplatesTab editTemplateId={editTemplateId} onEditHandled={() => setEditTemplateId(null)} />
          </TabsContent>
          <TabsContent value="letterhead"><ContractLetterheadTab /></TabsContent>
        </Tabs>
      )}

      {wizardOpen && (
        <ContractSimpleWizard
          open={wizardOpen}
          onClose={() => { setWizardOpen(false); setReloadKey(k => k + 1); }}
        />
      )}
    </div>
  );
}
