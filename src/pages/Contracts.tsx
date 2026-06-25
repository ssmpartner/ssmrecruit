import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileSignature, FileText, Image } from 'lucide-react';
import ContractsOverviewTab from '@/components/contracts/ContractsOverviewTab';
import ContractTemplatesTab from '@/components/contracts/ContractTemplatesTab';
import ContractLetterheadTab from '@/components/contracts/ContractLetterheadTab';

export default function Contracts() {
  const { isSuperadmin, loading } = useAuth();
  const [tab, setTab] = useState('overview');

  if (loading) return null;
  if (!isSuperadmin) return <Navigate to="/" replace />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileSignature className="h-6 w-6 text-primary" />
          Verträge
        </h1>
        <p className="text-muted-foreground">
          Vertragsvorlagen, generierte Verträge und SSM Briefpapier verwalten.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="gap-1.5">
            <FileSignature className="h-3.5 w-3.5" /> Übersicht
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Vorlagen
          </TabsTrigger>
          <TabsTrigger value="letterhead" className="gap-1.5">
            <Image className="h-3.5 w-3.5" /> Briefpapier
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Berechtigungen
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview"><ContractsOverviewTab /></TabsContent>
        <TabsContent value="templates"><ContractTemplatesTab /></TabsContent>
        <TabsContent value="letterhead"><ContractLetterheadTab /></TabsContent>
        <TabsContent value="permissions"><ContractPermissionsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
