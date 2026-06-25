import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileSignature, FileText, History, Image, Library, PackageOpen, ScrollText } from 'lucide-react';
import ContractsOverviewTab from '@/components/contracts/ContractsOverviewTab';
import ContractTemplatesTab from '@/components/contracts/ContractTemplatesTab';
import ContractLetterheadTab from '@/components/contracts/ContractLetterheadTab';
import ContractLibraryTab from '@/components/contracts/ContractLibraryTab';
import ContractSetsTab from '@/components/contracts/ContractSetsTab';
import ContractRulesTab from '@/components/contracts/ContractRulesTab';
import ContractAuditLogTab from '@/components/contracts/ContractAuditLogTab';
import { useContractPermissions } from '@/hooks/useContractPermissions';

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
          <TabsTrigger value="library" className="gap-1.5">
            <Library className="h-3.5 w-3.5" /> Bibliothek
          </TabsTrigger>
          <TabsTrigger value="sets" className="gap-1.5">
            <PackageOpen className="h-3.5 w-3.5" /> Vertragssets
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-1.5">
            <ScrollText className="h-3.5 w-3.5" /> Regeln
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Vorlagen
          </TabsTrigger>
          <TabsTrigger value="letterhead" className="gap-1.5">
            <Image className="h-3.5 w-3.5" /> Briefpapier
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview"><ContractsOverviewTab /></TabsContent>
        <TabsContent value="library"><ContractLibraryTab /></TabsContent>
        <TabsContent value="sets"><ContractSetsTab /></TabsContent>
        <TabsContent value="rules"><ContractRulesTab /></TabsContent>
        <TabsContent value="templates"><ContractTemplatesTab /></TabsContent>
        <TabsContent value="letterhead"><ContractLetterheadTab /></TabsContent>
      </Tabs>
    </div>
  );
}
