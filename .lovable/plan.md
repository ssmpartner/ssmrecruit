# Assessment-Report auf TTI-Niveau (SSM-Eigenmarke)

## Ausgangslage – was wir heute haben

| Bereich | Heute | TTI-Standard |
|---|---|---|
| DISC | 12 Fragen, nur **natürlicher** Stil | Natürlicher **+ adaptierter** Stil (2 Profile) |
| Motivatoren | 6 Dimensionen, je 2 Fragen | **12** Driving Forces (6 × primär/situativ) |
| Visualisierungen | Balken | Balken + DISC-Rad + Motivatoren-Rad + Hierarchie |
| Texte | 9 AI-Abschnitte (~1-2 Seiten je) | ~25 Abschnitte, je tief und personalisiert |
| Norm-Vergleich | Keiner | "68 % der Bevölkerung liegen im Bereich …" |
| PDF | HTML → Browser-Download (html2pdf.js) | Identisch (passt für SSM) |

## Lücken-Liste – das wird ergänzt

1. **Adaptierter DISC-Stil** – zusätzlicher Fragebogen-Schritt
2. **12 Driving Forces** – 6 bestehende Dimensionen je in primär/situativ aufteilen, 12 zusätzliche Items
3. **Norm-Vergleich** – Mittelwerte + Standardabweichung pro Dimension (Bevölkerungs-Referenz)
4. **DISC-Rad** und **Motivatoren-Rad** als SVG
5. **Verhaltens-Hierarchie** (12 Faktoren wie Konkurrenzdenken, Diplomatie, …)
6. **Zeitfresser + Lösungsvorschläge**, **Verbesserungsbereiche**
7. **Integration Verhalten ↔ Motivatoren** (Stärken, Konflikte)
8. **Ideales Umfeld**, **Schlüssel zur Motivation**, **Schlüssel zum Management**, **Aktionsplan**
9. **Inhaltsverzeichnis** und durchnummerierte Seiten
10. **Personalisierte Wert-für-das-Unternehmen** Sektion (vorhanden, aber dünn)

## Umsetzung in 4 Etappen

### Etappe 1 – Fragebogen erweitern (Daten-Fundament)
- **DB-Migration**: `assessment_results` um `disc_scores_adapted (jsonb)`, `driving_forces_scores (jsonb)`, `behavioral_hierarchy (jsonb)`, `norm_reference (jsonb)` erweitern.
- **Neue Settings**: `app_settings` Keys `disc_adapted_questions` (12 Items) und `driving_forces_questions` (12 Items je 5er-Skala) — admin-editierbar.
- **InsightsFormPage**: zwei neue Schritte einfügen ("Wie verhalten Sie sich bei der Arbeit?" → adaptiert, "Was treibt Sie an?" → Driving Forces).
- **Scoring-Funktionen**: `computeAdaptedDiscScores`, `computeDrivingForces` (mappt 6 → 12 mit primär/situativ-Logik).

### Etappe 2 – AI-Texte ausbauen
- **`analyze-candidate` Edge Function**: Tool-Schema um neue Abschnitte erweitern:
  - `behavioral_traits` (Liste mit je: Trait, Wert 0-100, Beschreibung)
  - `time_wasters` (je: Schwäche + Lösungsvorschlag)
  - `ideal_environment`, `keys_to_motivation`, `keys_to_management`
  - `action_plan` (3-5 konkrete Schritte)
  - `value_to_company` (5-8 Sätze, personalisiert)
  - `behavior_motivator_synergies`, `behavior_motivator_conflicts`
  - `adapted_style_analysis` (Vergleich natürlich vs. adaptiert)
  - `driving_forces_primary`, `driving_forces_situational`, `driving_forces_indifferent` (Beschreibungstexte)
- **Norm-Referenz**: deterministisch in der Edge Function gesetzt (deutschsprachige Referenzwerte, einmalig kalibrierbar).

### Etappe 3 – Visualisierungen
- **DISC-Rad**: SVG-Komponente, 8 Sektoren, Punkt für natürlichen + adaptierten Stil platziert nach D/I/S/C-Verteilung.
- **Motivatoren-Rad**: 12 Sektoren, Punkt nach Top-2-Driving-Forces.
- **Hierarchie-Balken**: 12 horizontale Balken, sortiert nach Stärke, mit "Bereich der Bevölkerung" als Hintergrund-Band.
- **Natürlich-vs-Adaptiert-Doppelgrafik**: zwei DISC-Balken nebeneinander pro Dimension.

### Etappe 4 – PDF-Reorganisation
- **`assessment-pdf.ts`** in Module aufteilen: pro Sektion eine `buildSectionXxxHtml()`-Funktion (sonst wird die Datei unleserlich).
- **Inhaltsverzeichnis** mit Seitennummern (Anchor-basiert, html2pdf rendert Seitenumbrüche via `page-break-before: always`).
- **Letterhead-Footer** pro Seite (Name, Seitenzahl, Copyright SSM).
- **Reihenfolge** angelehnt an TTI: Cover → TOC → Verhalten → Motivatoren → Integration → Aktionsplan.
- **Wasserzeichen "SSM Insights"** dezent als Footer.

## Reihenfolge / Reviews

Ich liefere **Etappe 1 zuerst** (Migration + Fragebogen), du testest, dass die neuen Daten korrekt erhoben werden. Dann Etappe 2 (AI-Texte) — du prüfst Qualität an einem echten Lead. Erst danach Etappe 3+4 (Visuals + PDF-Layout), weil das auf den neuen Daten aufbaut.

## Technische Details

- **Stack**: html2pdf.js (bereits installiert), SVG inline für Räder, Tailwind für PDF-CSS via `@media print`.
- **AI-Modell**: Gemini 2.5 Flash via Lovable AI Gateway (bestehend). Tool-Schema wächst um ~12 neue Felder — Tokens steigen, aber im Free-Tier-Limit.
- **Backward-Compat**: Bestehende Reports ohne adaptierten Stil rendern weiterhin (Felder optional). Alte `assessment_results`-Rows werden im PDF mit "Adaptierter Stil nicht erhoben" vermerkt.
- **Migration-Sicherheit**: Alle neuen Spalten `nullable`, keine Default-Werte, kein Backfill.
- **Norm-Daten**: Schweizer/DACH-Referenz hardcoded in einer Konstante in der Edge Function (Mittelwert 50 ±15 als pragmatischer Start, später kalibrierbar mit echten SSM-Daten).

## Was bewusst NICHT enthalten ist

- **Keine TTI-API-Anbindung** (Eigenmarke laut deiner Entscheidung).
- **Keine psychometrische Validierung** auf wissenschaftlichem Niveau — wir bauen die Struktur und Visualisierung; die Tiefe der Texte kommt aus AI + Norm-Referenz. Eine echte Validierungs-Studie wäre ein separates Projekt.
- **Keine Sprachvarianten** (bleibt Deutsch).

---

Wenn du grünes Licht gibst, starte ich mit **Etappe 1** (Migration + 2 neue Fragebogen-Schritte). Soll ich loslegen?