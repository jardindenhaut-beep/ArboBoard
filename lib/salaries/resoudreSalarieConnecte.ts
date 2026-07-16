import { supabase } from "@/lib/supabaseClient";

export type SalarieConnecte = {
  id: string;
  entreprise_id: string;
  nom?: string | null;
  prenom?: string | null;
  email?: string | null;
  telephone?: string | null;
  user_id?: string | null;
  profil_id?: string | null;
  statut?: string | null;
};

type IdentiteCompte = {
  profilId?: string | null;
  utilisateurId?: string | null;
  email?: string | null;
};

function salarieActif(salarie: SalarieConnecte | null) {
  if (!salarie) return false;

  const statut = String(salarie.statut || "actif")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  return ![
    "archive",
    "archivee",
    "archive",
    "inactif",
    "supprime",
    "supprimee",
  ].includes(statut);
}

export async function resoudreSalarieConnecte(
  entrepriseId: string,
  identite: IdentiteCompte
): Promise<SalarieConnecte | null> {
  if (!entrepriseId) return null;

  const identifiants = Array.from(
    new Set(
      [identite.utilisateurId, identite.profilId]
        .map((valeur) => String(valeur || "").trim())
        .filter(Boolean)
    )
  );

  for (const identifiant of identifiants) {
    const { data, error } = await supabase
      .from("salaries")
      .select(
        "id, entreprise_id, nom, prenom, email, telephone, user_id, profil_id, statut"
      )
      .eq("entreprise_id", entrepriseId)
      .or(
        `user_id.eq.${identifiant},profil_id.eq.${identifiant}`
      )
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      const salarie = data as SalarieConnecte;
      return salarieActif(salarie) ? salarie : null;
    }
  }

  const email = String(identite.email || "")
    .trim()
    .toLowerCase();

  if (!email) return null;

  const { data, error } = await supabase
    .from("salaries")
    .select(
      "id, entreprise_id, nom, prenom, email, telephone, user_id, profil_id, statut"
    )
    .eq("entreprise_id", entrepriseId)
    .ilike("email", email)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const salarie = data as SalarieConnecte;
  return salarieActif(salarie) ? salarie : null;
}