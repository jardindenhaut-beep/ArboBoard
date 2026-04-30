import { supabase } from "@/lib/supabaseClient";

export type RoleUtilisateur = "chef" | "salarie";

export type ProfilUtilisateur = {
  id: string;
  email: string;
  role: RoleUtilisateur;
  nom: string;
  prenom: string;
  statut: string;
  entreprise_id: string | null;
};

export type EntrepriseAbonnee = {
  id: string;
  nom_entreprise: string;
  slug: string;
  email_contact: string;
  telephone: string;
  statut_abonnement: string;
  plan_abonnement: string;
  plan_souhaite: string;
  demande_abonnement_at: string | null;
  date_debut_essai: string | null;
  date_fin_essai: string | null;
  date_activation_abonnement: string | null;
  date_fin_abonnement: string | null;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  stripe_price_id: string;
  stripe_checkout_session_id: string;
};

export type ContexteEntreprise = {
  profil: ProfilUtilisateur;
  entreprise: EntrepriseAbonnee;
};

export async function chargerContexteEntreprise(): Promise<{
  contexte: ContexteEntreprise | null;
  erreur: string | null;
}> {
  const {
    data: { user },
    error: erreurUser,
  } = await supabase.auth.getUser();

  if (erreurUser || !user) {
    return {
      contexte: null,
      erreur: "Utilisateur non connecté.",
    };
  }

  const { data: profil, error: erreurProfil } = await supabase
    .from("profils_utilisateurs")
    .select("id, email, role, nom, prenom, statut, entreprise_id")
    .eq("id", user.id)
    .maybeSingle();

  if (erreurProfil || !profil) {
    return {
      contexte: null,
      erreur: "Aucun profil utilisateur trouvé pour ce compte.",
    };
  }

  const profilUtilisateur = profil as ProfilUtilisateur;

  if (!profilUtilisateur.entreprise_id) {
    return {
      contexte: null,
      erreur: "Ce compte n'est rattaché à aucune entreprise.",
    };
  }

  if (profilUtilisateur.statut && profilUtilisateur.statut !== "actif") {
    return {
      contexte: null,
      erreur: "Ce compte utilisateur est désactivé.",
    };
  }

  const { data: entreprise, error: erreurEntreprise } = await supabase
    .from("entreprises_abonnees")
    .select(
      "id, nom_entreprise, slug, email_contact, telephone, statut_abonnement, plan_abonnement, plan_souhaite, demande_abonnement_at, date_debut_essai, date_fin_essai, date_activation_abonnement, date_fin_abonnement, stripe_customer_id, stripe_subscription_id, stripe_price_id, stripe_checkout_session_id"
    )
    .eq("id", profilUtilisateur.entreprise_id)
    .maybeSingle();

  if (erreurEntreprise || !entreprise) {
    return {
      contexte: null,
      erreur: "Impossible de charger l'entreprise associée.",
    };
  }

  return {
    contexte: {
      profil: profilUtilisateur,
      entreprise: entreprise as EntrepriseAbonnee,
    },
    erreur: null,
  };
}

export function abonnementEstBloque(entreprise: EntrepriseAbonnee) {
  const statut = entreprise.statut_abonnement || "essai";

  if (statut === "dev") {
    return false;
  }

  if (statut === "actif") {
    return false;
  }

  if (statut === "suspendu" || statut === "annule" || statut === "annulé") {
    return true;
  }

  if (statut === "essai" && entreprise.date_fin_essai) {
    const maintenant = new Date();
    const finEssai = new Date(entreprise.date_fin_essai);

    return finEssai.getTime() < maintenant.getTime();
  }

  return false;
}

export function joursRestantsEssai(dateFinEssai: string | null) {
  if (!dateFinEssai) {
    return null;
  }

  const maintenant = new Date();
  const fin = new Date(dateFinEssai);

  const difference = fin.getTime() - maintenant.getTime();
  const jours = Math.ceil(difference / (1000 * 60 * 60 * 24));

  return Math.max(jours, 0);
}