import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAIVoicePermissions } from '@/hooks/useAIVoicePermissions';
import { Badge } from '@/components/ui/badge';
import { Navigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function AIVoiceAgent() {
  const perms = useAIVoicePermissions();
  const location = useLocation();
  const navigate = useNavigate();

  // Redirect to dashboard if at the root /ai-voice path
  useEffect(() => {
    if (location.pathname === '/ai-voice') {
      navigate('/ai-voice/dashboard', { replace: true });
    }
  }, [location.pathname, navigate]);

  if (!perms.canAccessModule) {
    return <Navigate to="/" replace />;
  }

  const scopeLabel = perms.agencyScoped ? 'Agentur-Ansicht' : perms.userScoped ? 'Persönliche Ansicht' : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Voice Agent</h1>
          <p className="text-muted-foreground">KI-gestützte Telefonie und Voice-Agents verwalten</p>
        </div>
        {scopeLabel && (
          <Badge variant="outline" className="text-xs">{scopeLabel}</Badge>
        )}
      </div>
      <Outlet />
    </div>
  );
}
