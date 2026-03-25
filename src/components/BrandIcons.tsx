export function TikTokIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path d="M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 19.5 3h-3.03v12.4a2.592 2.592 0 0 1-2.592 2.592c-1.432 0-2.592-1.16-2.592-2.592 0-1.432 1.16-2.592 2.592-2.592.282 0 .554.045.81.129V9.87a5.648 5.648 0 0 0-.81-.059C10.534 9.811 8 12.345 8 15.4A5.407 5.407 0 0 0 13.378 21c3.055 0 5.222-2.534 5.222-5.589V9.156a7.227 7.227 0 0 0 4.4 1.483V7.586a4.278 4.278 0 0 1-6.4-1.766Z"
        fill="currentColor" />
    </svg>
  );
}

export function MetaIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path d="M6.915 4.03c-1.968 0-3.412 1.3-4.295 3.016C1.652 8.733 1.2 10.653 1.2 12c0 1.347.452 3.267 1.42 4.954.883 1.716 2.327 3.016 4.295 3.016 1.398 0 2.464-.56 3.353-1.346.449-.397.857-.863 1.232-1.374l.375-.524.375.524c.375.51.783.977 1.232 1.374.889.786 1.955 1.346 3.353 1.346 1.968 0 3.412-1.3 4.295-3.016.968-1.687 1.42-3.607 1.42-4.954 0-1.347-.452-3.267-1.42-4.954C20.247 5.33 18.803 4.03 16.835 4.03c-1.398 0-2.464.56-3.353 1.346a8.3 8.3 0 0 0-1.232 1.374L11.875 7.274l-.375-.524a8.3 8.3 0 0 0-1.232-1.374C9.379 4.59 8.313 4.03 6.915 4.03ZM6.915 5.73c1.147 0 1.839.443 2.574 1.094.37.328.72.724 1.065 1.178l1.321 1.848 1.321-1.848c.345-.454.695-.85 1.065-1.178.735-.651 1.427-1.094 2.574-1.094 1.36 0 2.32.878 3.037 2.27.717 1.393 1.078 3.06 1.078 4 0 .94-.361 2.607-1.078 4-.717 1.392-1.677 2.27-3.037 2.27-1.147 0-1.839-.443-2.574-1.094a7.3 7.3 0 0 1-1.065-1.178L11.875 14.15l-1.321 1.848a7.3 7.3 0 0 1-1.065 1.178c-.735.651-1.427 1.094-2.574 1.094-1.36 0-2.32-.878-3.037-2.27C3.161 14.607 2.8 12.94 2.8 12c0-.94.361-2.607 1.078-4 .717-1.392 1.677-2.27 3.037-2.27Z"
        fill="#0081FB" />
    </svg>
  );
}

export function LinkedInIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286ZM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124ZM6.613 20.452H4.06V9h2.553v11.452ZM21.5 1H2.5C1.672 1 1 1.672 1 2.5v19c0 .828.672 1.5 1.5 1.5h19c.828 0 1.5-.672 1.5-1.5v-19c0-.828-.672-1.5-1.5-1.5Z"
        fill="#0A66C2" />
    </svg>
  );
}

export function MicrosoftIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <rect x="1" y="1" width="10" height="10" fill="#F25022" rx="1" />
      <rect x="13" y="1" width="10" height="10" fill="#7FBA00" rx="1" />
      <rect x="1" y="13" width="10" height="10" fill="#00A4EF" rx="1" />
      <rect x="13" y="13" width="10" height="10" fill="#FFB900" rx="1" />
    </svg>
  );
}

export function WebsiteIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

export const BRAND_ICONS: Record<string, React.FC<{ className?: string }>> = {
  tiktok: TikTokIcon,
  meta: MetaIcon,
  linkedin: LinkedInIcon,
  microsoft365: MicrosoftIcon,
  website: WebsiteIcon,
};
