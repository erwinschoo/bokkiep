import type { CategoryType, RuleRow } from "../db/types";

/* Gedeelde categorie-/regel-metadata, los van de view-laag zodat zowel de desktop-
 * beheerschermen als de mobiele bottom-sheets dezelfde labels en palet gebruiken. */

/* Palet-suggesties die "luisteren" met de huisstijl-tokens (passen automatisch mee in
 * dark mode). Daarnaast kan de gebruiker een eigen kleur kiezen via de color picker. */
export const CAT_COLORS = [
  "var(--blue)", "var(--orange)", "var(--pos)", "var(--cat-5)", "var(--cat-4)", "var(--cat-6)",
  "var(--warn)", "var(--over)", "#7A6FA8", "#5AA0A8", "#8A9A5B", "var(--cat-8)",
];

export const TYPE_LABEL: Record<CategoryType, string> = {
  uitgave: "Uitgave", inkomen: "Inkomen", sparen: "Sparen", overboeking: "Overboeking",
};
export const TYPE_ORDER: CategoryType[] = ["uitgave", "inkomen", "sparen", "overboeking"];

export const FIELD_LABEL: Record<RuleRow["field"], string> = {
  rawDescription: "Omschrijving", merchant: "Naam (merchant)",
};
export const MATCH_LABEL: Record<RuleRow["matchType"], string> = {
  contains: "bevat", regex: "regex",
};
