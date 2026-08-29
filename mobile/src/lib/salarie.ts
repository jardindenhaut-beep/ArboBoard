import { supabase } from "./supabase";
import type { ProfilUtilisateur } from "../context/AuthContext";

export async function trouverSalarie(profil: ProfilUtilisateur) {
  let query = supabase.from("salaries").select("*").limit(50);

  if (profil.entreprise_id) {
    query = query.eq("entreprise_id", profil.entreprise_id);
  }

  const { data, error } = await query;
  if (error) throw error;

  const email = String(profil.email || "").trim().toLowerCase();

  return (
    (data || []).find(
      (s: any) =>
        s.user_id === profil.id ||
        s.profil_id === profil.id ||
        String(s.email || "").trim().toLowerCase() === email
    ) || null
  );
}

export async function fichesDuSalarie(
  entrepriseId: string,
  salarieId: string
) {
  const { data: affectations, error: affError } = await supabase
    .from("fiches_intervention_salaries")
    .select("fiche_id")
    .eq("entreprise_id", entrepriseId)
    .eq("salarie_id", salarieId);

  if (affError) throw affError;

  const ids = (affectations || []).map((x: any) => x.fiche_id).filter(Boolean);

  const { data: legacy, error: legacyError } = await supabase
    .from("fiches_intervention")
    .select("*")
    .eq("entreprise_id", entrepriseId)
    .eq("salarie_id", salarieId);

  if (legacyError) throw legacyError;

  let multi: any[] = [];
  if (ids.length) {
    const { data, error } = await supabase
      .from("fiches_intervention")
      .select("*")
      .eq("entreprise_id", entrepriseId)
      .in("id", ids);
    if (error) throw error;
    multi = data || [];
  }

  const map = new Map<string, any>();
  for (const f of [...(legacy || []), ...multi]) map.set(f.id, f);

  return Array.from(map.values()).sort((a,b) =>
    String(a.date_prevue || a.date_intervention || "9999").localeCompare(
      String(b.date_prevue || b.date_intervention || "9999")
    )
  );
}
