
# Modul „Verträge" – Implementierungsplan

Rein additiv. Keine bestehende Tabelle, kein Status, keine Rolle, keine Komponente wird verändert. Karriereplan wird nur lesend referenziert.

## 1. Sichtbarkeit
- Sidebar: neuer Menüpunkt „Verträge" (Icon: FileSignature)
- Route `/contracts` – nur Superadmin (analog `/ai-voice` via `SUPERADMIN_ONLY_PREFIXES`)
- Kandidaten-Detail: zusätzlicher Button „Vertrag generieren" nur sichtbar bei Status `hired`, ebenfalls vorerst nur Superadmin

## 2. Datenbank (neue Tabellen)

```text
contract_templates             Vorlagen (Vertrieb/Innendienst)
contract_template_versions     Versionierung jeder Vorlage
contract_template_attachments  Anhänge zu Vorlagen
contracts                      Generierte Verträge (Instanzen pro Kandidat)
contract_versions              Snapshots jeder Bearbeitung
contract_attachments           Anhänge pro generiertem Vertrag
contract_letterhead            Singleton: PDF-Briefpapier
contract_permissions           7 neue Berechtigungen pro user_id
```

Felder Vorlagen: title, contract_type, area (`sales`|`office`), position, level, language, careerplan_linked (bool), careerplan_level (nullable, nur sales), status (`draft`|`active`|`archived`), body_html, version, created_by, updated_by.

Felder generierte Verträge: candidate_lead_id, template_id, area, language, position, level, careerplan_level (nullable), start_date, workload, salary, commission_model, location, manager_name, body_html (gerendert + editierbar), status (`draft`|`in_review`|`finalized`|`sent`|`signed`|`archived`), pdf_path, created_by.

Neuer Storage-Bucket: `contracts` (privat) – Briefpapier, Anhänge, finale PDFs.

RLS: alle Tabellen nur für Superadmin (und später erweiterbar via `contract_permissions`). GRANTs auf authenticated + service_role.

## 3. Karriereplan-Integration (read-only)
- Liest `career_plans` Stufen (bestehende Tabelle) nur lesend
- Stufen-Liste: Junior Versicherungsberater → General Agent (statisch, falls in DB nicht vorhanden)
- Bei `area = office` wird die ganze Karriereplan-UI ausgeblendet, Filter blockiert

## 4. UI – `/contracts`
4 Tabs:
1. **Übersicht** – Tabelle aller generierten Verträge (Kandidat, Bereich, Vorlage, Position, Stufe, Karriereplan-Stufe nur bei Vertrieb, Sprache, Status, Erstelldatum, Erstellt von, Aktionen: Download, Bearbeiten, Versionen)
2. **Vorlagen** – CRUD für `contract_templates` inkl. Anhänge, Aktivieren/Archivieren, Versionshistorie
3. **Briefpapier** – Upload PDF (Singleton), Vorschau, ersetzen
4. **Berechtigungen** – Matrix der 7 neuen Rechte pro User (vorerst nur Superadmin sichtbar)

## 5. Vertrag generieren – Wizard (Dialog)
Schritte:
1. Bereich (Vertrieb/Innendienst)
2. Vorlage (gefiltert nach Bereich + Sprache + Position; bei Vertrieb zusätzlich Karriereplan-Stufe)
3. Eckdaten: Sprache, Position, Stufe, Karriereplan-Stufe (nur Vertrieb), Eintrittsdatum, Pensum, Vergütung, Standort, Vorgesetzter
4. Anhänge wählen
5. Vorschau mit aufgelösten Platzhaltern → Editor (TipTap, bereits im Projekt? sonst `@tiptap/react`)
6. Speichern als `draft`

## 6. Platzhalter-Engine
- `src/lib/contract-placeholders.ts`
- Resolver baut Map aus Lead (`candidate.*`), eingegebenen Wizard-Werten (`employment.*`), Karriereplan (`careerplan.*` nur sales, sonst entfernt), Firmenkonstanten (`company.*`), Wizard-Werten (`manager.*`, `contract.date`)
- Ersetzt `{{...}}` in `body_html`; unbekannte Platzhalter bleiben sichtbar markiert

## 7. PDF-Export
- Edge Function `generate-contract-pdf`
- Rendert HTML → PDF (via `pdf-lib` + HTML-to-PDF schon vorhanden in `assessment-pdf.ts` Pattern wiederverwenden) und legt es auf Briefpapier (pdf-lib `PDFDocument.copyPages`)
- Speichert in Storage `contracts/{contract_id}/v{n}.pdf`, aktualisiert `contracts.pdf_path`, schreibt Snapshot in `contract_versions`

## 8. Berechtigungen (neue Tabelle, keine Änderung an `user_roles`)
- `contracts.view`, `contracts.generate`, `contracts.edit`, `templates.manage`, `letterhead.manage`, `contracts.finalize`, `contracts.archive`
- Default: Superadmin hat alles. Tabelle leer = nur Superadmin. Spätere Vergabe via UI.

## 9. Kandidaten-Integration
- `LeadActionPanel.tsx`: rein additiver Block „Vertragsgenerierung" – sichtbar wenn `status === 'hired'` UND `isSuperadmin`
- Öffnet den Vertrag-Wizard mit `lead_id` vorbefüllt
- Generierte Verträge erscheinen zusätzlich in einem neuen kleinen Panel im Lead-Detail (additiv, kein bestehender Tab geändert)

## 10. Sicherheit / Garantien
- Keine Migration auf bestehenden Tabellen
- Keine Änderung an `career_plans`, `leads`, `user_roles`, `app_settings`
- Keine Änderung an Status-Workflow oder Notification-Logik
- Originalvorlagen werden nie überschrieben – Bearbeitung schreibt neue Reihe in `contract_template_versions`

## 11. Out of scope (Phase 2)
- Digitale Signatur (vorbereitet via Status `sent`/`signed` + `signature_provider` Spalte reserviert)
- Erweiterte Rollenfreigabe (Tabelle existiert, UI vorerst nur Superadmin)

---

Reihenfolge der Umsetzung:
1. Migration (Tabellen, Bucket, RLS, Grants)
2. Sidebar + Route + leere `/contracts`-Seite mit Tabs
3. Vorlagen-CRUD + Briefpapier-Upload
4. Platzhalter-Engine + Wizard
5. Edge Function PDF-Export mit Briefpapier
6. Lead-Integration „Vertrag generieren"
7. Übersicht + Versionen + Download
