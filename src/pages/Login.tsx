import { ExternalLink } from 'lucide-react';

const SSM_PORTAL_URL = 'https://ssmpartner.lovable.app/portal';

export default function Login() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            SSM Recruit
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Bitte melden Sie sich über das zentrale SSM Portal an
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-8 shadow-lg space-y-5 text-center">
          <p className="text-sm text-muted-foreground">
            Die Anmeldung erfolgt zentral über das SSM Partner Portal. Klicken Sie auf den Button, um sich anzumelden.
          </p>

          <a
            href={SSM_PORTAL_URL}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <ExternalLink className="h-4 w-4" />
            Zum SSM Portal
          </a>
        </div>
      </div>
    </div>
  );
}
