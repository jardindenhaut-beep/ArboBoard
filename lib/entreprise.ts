import { supabase } from "@/lib/supabaseClient";

export type ProfilUtilisateur = {
  id: string;
  email: string | null;
  role: "chef" | "salarie" | string | null;
  nom: string | null;
  prenom: string | null;
  statut: string | null;
  entreprise_id: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type EntrepriseAbonnee = {
  id: string;

  nom_entreprise: string | null;
  slug: string | null;
  email_contact: string | null;
  telephone: string | null;

  adresse?: string | null;
  code_postal?: string | null;
  ville?: string | null;
  siret?: string | null;
  numero_tva?: string | null;
  forme_juridique?: string | null;

  assurance_nom?: string | null;
  assurance_numero_contrat?: string | null;
  assurance_zone_couverture?: string | null;

  mentions_legales_documents?: string | null;

  statut_abonnement: string | null;
  plan_abonnement: string | null;
  plan_souhaite?: string | null;

  date_debut_essai?: string | null;
  date_fin_essai?: string | null;
  date_activation_abonnement?: string | null;
  date_fin_abonnement?: string | null;

  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_checkout_session_id?: string | null;
  stripe_price_id?: string | null;

  demande_abonnement_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ContexteEntreprise = {
  profil: ProfilUtilisateur;
  entreprise: EntrepriseAbonnee;
};

export type ResultatContexteEntreprise = {
  contexte: ContexteEntreprise | null;
  erreur: string | null;
};

function normaliserStatut(statut: string | null | undefined) {
  return String(statut || "")
    .toLowerCase()
    .trim();
}

function dateDepassee(date: string | null | undefined) {
  if (!date) return false;

  const maintenant = new Date();
  const dateLimite = new Date(date);

  if (Number.isNaN(dateLimite.getTime())) {
    return false;
  }

  return dateLimite.getTime() < maintenant.getTime();
}

export async function chargerContexteEntreprise(): Promise<ResultatContexteEntreprise> {
  try {
    const {
      data: { user },
      error: erreurUtilisateur,
    } = await supabase.auth.getUser();

    if (erreurUtilisateur) {
      return {
        contexte: null,
        erreur: erreurUtilisateur.message || "Utilisateur introuvable.",
      };
    }

    if (!user?.id) {
      return {
        contexte: null,
        erreur: "Utilisateur non connecté.",
      };
    }

    const { data: profil, error: erreurProfil } = await supabase
      .from("profils_utilisateurs")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (erreurProfil) {
      return {
        contexte: null,
        erreur:
          erreurProfil.message ||
          "Impossible de récupérer le profil utilisateur.",
      };
    }

    if (!profil) {
      return {
        contexte: null,
        erreur: "Profil utilisateur introuvable.",
      };
    }

    const profilUtilisateur = profil as ProfilUtilisateur;

    if (profilUtilisateur.statut !== "actif") {
      return {
        contexte: null,
        erreur: "Votre accès utilisateur n’est pas actif.",
      };
    }

    if (!profilUtilisateur.entreprise_id) {
      return {
        contexte: null,
        erreur: "Aucune entreprise n’est associée à ce profil.",
      };
    }

    const { data: entreprise, error: erreurEntreprise } = await supabase
      .from("entreprises_abonnees")
      .select("*")
      .eq("id", profilUtilisateur.entreprise_id)
      .maybeSingle();

    if (erreurEntreprise) {
      return {
        contexte: null,
        erreur:
          erreurEntreprise.message ||
          "Impossible de récupérer l’entreprise associée.",
      };
    }

    if (!entreprise) {
      return {
        contexte: null,
        erreur: "Entreprise introuvable.",
      };
    }

    return {
      contexte: {
        profil: profilUtilisateur,
        entreprise: entreprise as EntrepriseAbonnee,
      },
      erreur: null,
    };
  } catch (error: any) {
    console.error("Erreur chargerContexteEntreprise :", error);

    return {
      contexte: null,
      erreur:
        error?.message ||
        "Une erreur est survenue pendant le chargement de l’entreprise.",
    };
  }
}

export function abonnementEstBloque(
  entreprise: EntrepriseAbonnee | null | undefined
) {
  if (!entreprise) return true;

  const statut = normaliserStatut(entreprise.statut_abonnement);
  const plan = normaliserStatut(entreprise.plan_abonnement);

  if (statut === "dev" || plan === "dev") {
    return false;
  }

  if (statut === "actif") {
    if (!entreprise.date_fin_abonnement) return false;
    return dateDepassee(entreprise.date_fin_abonnement);
  }

  if (statut === "essai") {
    if (!entreprise.date_fin_essai) return false;
    return dateDepassee(entreprise.date_fin_essai);
  }

  if (statut === "suspendu") {
    return true;
  }

  if (statut === "annule" || statut === "annulé") {
    return true;
  }

  return false;
}

export function joursRestantsEssai(
  entreprise: EntrepriseAbonnee | null | undefined
) {
  if (!entreprise?.date_fin_essai) return null;

  const maintenant = new Date();
  const fin = new Date(entreprise.date_fin_essai);

  if (Number.isNaN(fin.getTime())) return null;

  const difference = fin.getTime() - maintenant.getTime();
  return Math.ceil(difference / (1000 * 60 * 60 * 24));
}

export function joursRestantsAbonnement(
  entreprise: EntrepriseAbonnee | null | undefined
) {
  if (!entreprise?.date_fin_abonnement) return null;

  const maintenant = new Date();
  const fin = new Date(entreprise.date_fin_abonnement);

  if (Number.isNaN(fin.getTime())) return null;

  const difference = fin.getTime() - maintenant.getTime();
  return Math.ceil(difference / (1000 * 60 * 60 * 24));
}