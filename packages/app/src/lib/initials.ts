/* Initialen afgeleid van de account-naam (val terug op het e-mailadres).
 * Gedeeld door de sidebar-footer en de mobiele header-avatar. */
export function initialsFrom(name?: string, email?: string): string {
  const n = (name ?? "").trim();
  if (n) {
    const parts = n.split(/\s+/);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
    return (first + last).toUpperCase() || "?";
  }
  const local = (email ?? "").split("@")[0].replace(/[^a-zA-Z]/g, "");
  return (local.slice(0, 2) || "?").toUpperCase();
}
