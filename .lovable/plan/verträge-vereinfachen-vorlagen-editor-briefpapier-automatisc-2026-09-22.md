# Verträge vereinfachen: Vorlagen-Editor, Briefpapier, automatische Daten

## Ziel
Das Verträge-Modul wird auf das Nötige reduziert: Vorlagen hochladen und bearbeiten, Briefpapier auswählen, Vertrag erstellen. Beim Erstellen füllt das System die Daten selbst: Personalien aus dem Kandidatenprofil, Lohnangaben aus der Karrierestufe (Einstellungen › Karriereplan).

## 1. Aufgeräumte Oberfläche
- Einrichtung zeigt nur noch zwei Bereiche: **Vorlagen** und **Briefpapier**.
- Bibliothek, Vertragssets, Regeln und Audit-Log werden ausgeblendet (bleiben technisch erhalten, gehen also nicht verloren).
- Vorlagen-Liste kompakt: Titel, Bereich, Sprache, Status, Bearbeiten, Aktivieren. Upload-Knopf «Vertrag hochladen (.docx)» bleibt.

## 2. Echter Text-Editor für Vorlagen
- Neuer Editor mit Formatierungsleiste: Überschriften, fett/kursiv/unterstrichen, Listen, Tabellen, Absatz-Ausrichtung, Rückgängig/Wiederholen.
- Der hochgeladene Word-Vertrag wird direkt im Editor geöffnet und lässt sich frei überarbeiten.
- Drei Ansichten im Editor:
  - **Bearbeiten** – schreiben und Platzhalter setzen
  - **Vorschau** – Seitenansicht mit gewähltem Briefpapier und Beispielwerten
  - **PDF-Vorschau** – echtes PDF im Fenster (Briefpapier inklusive)

## 3. Platzhalter mit echten Namen
- Platzhalter erscheinen im Text als farbige Chips mit Klarnamen: «Kandidat-Vorname», «Kandidat-Geburtsdatum», «Führungskraft-Vorname», «Karrierestufe-Fixlohn» usw. Keine Codes mehr sichtbar.
- Einsetzen per Klick an der Cursorposition aus einer durchsuchbaren Liste, gruppiert nach: Kandidat, Führungskraft / Zuständige Person, Anstellung, Karrierestufe (Lohn), Firma, Vertrag.
- Neue Platzhalter-Gruppen:
  - **Führungskraft**: Vorname, Nachname, Voller Name, Funktion, E-Mail, Telefon, Agentur (aus dem zuständigen Mitarbeiter des Kandidaten)
  - **Karrierestufe**: Stufenname, Fixlohn, Spesen, Score-Punkte, Wert pro Score-Punkt (aus Karriereplan)

## 4. Vertrag erstellen – automatisch befüllt
Verkürzter Ablauf in drei Schritten:
1. **Person wählen** (Kandidaten in HR-Bearbeitung) – Personalien werden automatisch übernommen und nur angezeigt: Name, Geburtsdatum, Adresse, PLZ/Ort, E-Mail, Telefon. Zuständige Führungskraft wird mitgeladen.
2. **Stufe & Vorlage** – Position und Karrierestufe wählen; Fixlohn, Spesen und Score-Punkte werden aus dem Karriereplan gefüllt (überschreibbar). Vorlage und Briefpapier auswählen.
3. **Vorschau & Erstellen** – fertiger Vertrag mit allen eingesetzten Werten, danach speichern/PDF.

Fehlt ein Wert (z. B. Geburtsdatum), wird er deutlich als fehlend markiert mit Hinweis, wo er nachgetragen wird.

## Technische Umsetzung
- Editor: `@tiptap/react` + StarterKit + Table/Underline/TextAlign; eigener Inline-Node `placeholder`, der als Chip mit Label rendert und beim Speichern/Rendern als `{{key}}` serialisiert wird — bestehende Vorlagen und die Render-Engine bleiben kompatibel.
- PDF-Vorschau über das vorhandene `html2pdf.js` (Blob → iframe), Briefpapier aus `contract_letterhead`.
- `src/lib/contract-placeholders.ts`: Labels auf Klarnamen (`Kandidat-Vorname` …), neue Gruppen `manager` und `careerlevel`; `renderPlaceholders` um diese Gruppen erweitert.
- `useCareerLevels`: Stufen inkl. `fixSalary`, `expenses`, `scorePoints` zurückgeben (aus `career_plans.levels`), damit der Wizard sie automatisch einsetzen kann.
- `ContractGenerationWizard.tsx`: Schritte von 5 auf 3 reduziert, Personalien read-only aus `leads`, Führungskraft über `leads.assigned_to` → `employees`, Lohnfelder vorbelegt aus der gewählten Stufe.
- `Contracts.tsx`: Einrichtung nur mit Tabs Vorlagen/Briefpapier.
