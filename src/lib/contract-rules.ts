/**
 * Vertragsset-Regel-Engine (clientseitig).
 * Wertet die in `contract_set_rules` gespeicherten Regeln gegen einen
 * Kontext aus (Vertragsart / Zielgruppe / Bereich / Position) und liefert
 * eine effektive Sicht zurück.
 *
 * Bedingungen:
 *   { kind_code?, target_group_code?, area?, position_in?: string[] }
 *
 * Aktionen:
 *   { hide_fields?: string[], hide_categories?: string[],
 *     show_categories?: string[], require_categories?: string[],
 *     optional_categories?: string[], allow_partner_fields?: boolean }
 */

export interface RuleContext {
  kind_code?: string | null;
  target_group_code?: string | null;
  area?: 'sales' | 'office' | null;
  position?: string | null;
}

export interface RuleRow {
  id: string;
  code: string;
  name: string;
  conditions: any;
  actions: any;
  is_active: boolean;
}

export interface EffectiveRules {
  hiddenFields: Set<string>;
  hiddenCategories: Set<string>;
  shownCategories: Set<string>;
  requiredCategories: Set<string>;
  optionalCategories: Set<string>;
  allowPartnerFields: boolean;
  matched: string[]; // rule codes
}

function matches(ctx: RuleContext, cond: any): boolean {
  if (!cond || typeof cond !== 'object') return true;
  if (cond.kind_code && cond.kind_code !== ctx.kind_code) return false;
  if (cond.target_group_code && cond.target_group_code !== ctx.target_group_code) return false;
  if (cond.area && cond.area !== ctx.area) return false;
  if (Array.isArray(cond.position_in) && cond.position_in.length > 0) {
    if (!ctx.position || !cond.position_in.includes(ctx.position)) return false;
  }
  return true;
}

export function evaluateRules(rules: RuleRow[], ctx: RuleContext): EffectiveRules {
  const eff: EffectiveRules = {
    hiddenFields: new Set(),
    hiddenCategories: new Set(),
    shownCategories: new Set(),
    requiredCategories: new Set(),
    optionalCategories: new Set(),
    allowPartnerFields: false,
    matched: [],
  };
  for (const r of rules) {
    if (!r.is_active) continue;
    if (!matches(ctx, r.conditions)) continue;
    eff.matched.push(r.code);
    const a = r.actions || {};
    (a.hide_fields || []).forEach((f: string) => eff.hiddenFields.add(f));
    (a.hide_categories || []).forEach((c: string) => eff.hiddenCategories.add(c));
    (a.show_categories || []).forEach((c: string) => eff.shownCategories.add(c));
    (a.require_categories || []).forEach((c: string) => eff.requiredCategories.add(c));
    (a.optional_categories || []).forEach((c: string) => eff.optionalCategories.add(c));
    if (a.allow_partner_fields) eff.allowPartnerFields = true;
  }
  // Hidden gewinnt: required/optional, die zugleich hidden sind, werden entfernt.
  for (const c of eff.hiddenCategories) {
    eff.requiredCategories.delete(c);
    eff.optionalCategories.delete(c);
    eff.shownCategories.delete(c);
  }
  return eff;
}

/** Filtert Set-Items anhand der effektiven Regeln. */
export function applyRulesToItems<T extends { category_code: string; role: string; is_mandatory: boolean }>(
  items: T[],
  eff: EffectiveRules
): T[] {
  return items
    .filter(it => !eff.hiddenCategories.has(it.category_code))
    .map(it => {
      if (eff.requiredCategories.has(it.category_code)) return { ...it, is_mandatory: true };
      if (eff.optionalCategories.has(it.category_code)) return { ...it, is_mandatory: false };
      return it;
    });
}
