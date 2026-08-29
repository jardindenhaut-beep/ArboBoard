export function texte(...valeurs: unknown[]) {
  for (const valeur of valeurs) {
    if (typeof valeur === "string" && valeur.trim()) return valeur.trim();
    if (typeof valeur === "number" && Number.isFinite(valeur)) return String(valeur);
  }
  return "";
}
export function nombre(valeur: unknown, defaut = 0) { const n = Number(valeur); return Number.isFinite(n) ? n : defaut; }
export function argent(valeur: unknown) { return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(nombre(valeur)); }
export const monnaie = argent;
export function dateFr(valeur?: string | null) { if (!valeur) return "—"; const d = new Date(`${valeur.slice(0,10)}T12:00:00`); return Number.isNaN(d.getTime()) ? valeur : d.toLocaleDateString("fr-FR"); }
export function heureMaintenant() { const d = new Date(); return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; }
export function isoAujourdHui() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
export function ajouterJours(dateIso: string, jours: number) { const d = new Date(`${dateIso}T12:00:00`); d.setDate(d.getDate()+jours); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
export function normaliser(v: unknown) { return String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase(); }
