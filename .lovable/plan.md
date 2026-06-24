
## Ziel

Neuer "Willkommen-Wizard" für eingehende Leads: automatische/manuelle Willkommen-E-Mail → öffentliche Landing-Page mit Video → "Ablehnen" oder "Nächste Schritte" (Insights-Test). Komplette Pflege durch Superadmin in **Einstellungen → Wizard-Verwaltung**.

---

## 1. Datenbank (neue Tabelle + Storage)

**`welcome_wizard_config`** (singleton, eine Zeile, Superadmin pflegt):
- `enabled` (bool), `video_url`, `thumbnail_url`
- `page_title`, `page_intro` (HTML/Text), `button_proceed_label`, `button_reject_label`, `reject_confirmation_text`, `proceed_confirmation_text`
- `email_subject`, `email_html` (mit Platzhaltern `{{name}}`, `{{cta_url}}`)
- `auto_sources` (text[]) – Quellen mit Auto-Versand; leer = nur manuell
- RLS: lesen authentifiziert + anon (für Landing), schreiben nur superadmin/admin

**`welcome_lead_tokens`**:
- `token` (uuid, pk), `lead_id`, `created_at`, `expires_at`, `used_at`, `action` (null/'reject'/'proceed')
- RLS: anon SELECT/UPDATE per Token (Edge Function nutzt Service Role)

**Storage-Bucket**: `welcome-assets` (öffentlich) für Video + Thumbnail.

## 2. Edge Functions

- **`send-welcome-email`** (intern, via DB-Trigger + manueller Button)
  - Lädt Config, prüft `enabled` + Quelle in `auto_sources` (bei automatischem Versand)
  - Erzeugt Token, baut CTA-URL `https://recruit.ssmpartner.ch/willkommen?token=...`
  - Sendet über `send-email`, loggt in `notification_activity_log`
- **`welcome-public-lookup`** (öffentlich): Token → Config + Lead-Basisdaten (Name)
- **`welcome-public-action`** (öffentlich): `{ token, action }`
  - `reject` → Lead-Status `not_interested` + `archived = true`
  - `proceed` → erzeugt Insights-Token (Wiederverwendung bestehender `insights_requests`/Public-Form Logik) → gibt Redirect-URL zurück
- DB-Trigger `on_lead_insert` ruft `send-welcome-email` per `net.http_post` (analog `notify_new_lead`)

## 3. Frontend

- **Öffentliche Route** `/willkommen` (`WelcomeWizardPage.tsx`): Video, Begrüssung, zwei Buttons; bei "Nächste Schritte" → Redirect `/insights-form?token=...`
- **Manueller Button** im `LeadActionPanel` / `LeadDetailSheet`: "Willkommen-E-Mail senden"
- **Wizard-Verwaltung Tab erweitert** (`WizardsTab.tsx`): neuer Reiter "Willkommen-Wizard" mit Formular (Video-Upload via Storage, Thumbnail-Upload, alle Texte, HTML-Editor für E-Mail, Quellen-Multiselect aus `lead_sources`, Master-Switch)
- Sichtbar nur für Superadmin

## 4. Trigger-Logik

- DB AFTER INSERT auf `leads`: ruft `send-welcome-email`. Function entscheidet selbst, ob gesendet wird (enabled + Quelle in `auto_sources`).
- Manueller Button ruft dieselbe Function mit `{ lead_id, force: true }`.

---

## Technische Details

```text
[Lead Insert] ──trigger──▶ send-welcome-email ──▶ send-email ──▶ Kandidat
                                  │
                                  └── insert welcome_lead_tokens

Kandidat klickt CTA
        │
        ▼
/willkommen?token=…  ──▶ welcome-public-lookup (Video + Texte)
        │
        ├── "Ablehnen"      ──▶ welcome-public-action(reject)  ──▶ status=not_interested + archived
        └── "Nächste Schritte" ──▶ welcome-public-action(proceed) ──▶ /insights-form?token=…
```

- E-Mail-Body: gespeichertes HTML mit `{{name}}`, `{{cta_url}}`, `{{video_thumbnail}}` Platzhaltern (server-seitig ersetzt, kein dangerouslySetInnerHTML im Frontend).
- Video wird über `<video src>` aus dem öffentlichen Bucket gestreamt.
- Insights-Weiterleitung nutzt vorhandenes `insights_requests`-System; Function erzeugt Eintrag und liefert dessen Token an die Landing zurück.
- Idempotenz: pro Lead nur ein aktiver, ungenutzter Token – bei erneutem Send wird alter Token invalidiert.

## Out of Scope (kann später erweitert werden)

- A/B-Varianten der Landing
- Mehrere Sprachen
- Erinnerungs-Mails wenn Token nicht angeklickt
