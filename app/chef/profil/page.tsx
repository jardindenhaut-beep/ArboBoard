"use client";

import { useEffect, useState } from "react";
import { chargerContexteEntreprise } from "@/lib/entreprise";
import { supabase } from "@/lib/supabaseClient";

type ProfilUtilisateur = {
  id: string;
  email?: string | null;
  role?: string | null;
  statut?: string | null;
  nom?: string | null;
  prenom?: string | null;
  entreprise_id?: string | null;
};

type Entreprise = {
  id: string;
  nom_entreprise?: string | null;
  slug?: string | null;
  email_contact?: string | null;
  telephone?: string | null;
  statut_abonnement?: string | null;
  plan_abonnement?: string | null;
};

type FormulaireProfil = {
  nom: string;
  prenom: string;
};

type FormulaireEntreprise = {
  nom_entreprise: string;
  email_contact: string;
  telephone: string;
};

function valeurTexte(valeur: string | null | undefined) {
  return valeur || "";
}

function nettoyerTexte(valeur: string) {
  const texte = valeur.trim();
  return texte.length > 0 ? texte : null;
}

function libellePlan(plan: string | null | undefined) {
  if (plan === "essentiel") return "Essentiel";
  if (plan === "pro") return "Pro";
  if (plan === "expert") return "Expert";
  if (plan === "dev") return "Développement";
  if (plan === "essai") return "Essai";
  return plan || "Non défini";
}

function libelleStatutAbonnement(statut: string | null | undefined) {
  if (statut === "actif") return "Actif";
  if (statut === "essai") return "Essai";
  if (statut === "suspendu") return "Suspendu";
  if (statut === "annule" || statut === "annulé") return "Annulé";
  if (statut === "dev") return "Développement";
  return statut || "Non défini";
}

function badgeStatut(statut: string | null | undefined) {
  if (statut === "actif" || statut === "dev") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (statut === "essai") {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }

  if (statut === "suspendu") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  if (statut === "annule" || statut === "annulé") {
    return "bg-red-50 text-red-700 border-red-200";
  }

  return "bg-slate-50 text-slate-700 border-slate-200";
}

export default function ProfilChefPage() {
  const [profil, setProfil] = useState<ProfilUtilisateur | null>(null);
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null);

  const [formulaireProfil, setFormulaireProfil] = useState<FormulaireProfil>({
    nom: "",
    prenom: "",
  });

  const [formulaireEntreprise, setFormulaireEntreprise] =
    useState<FormulaireEntreprise>({
      nom_entreprise: "",
      email_contact: "",
      telephone: "",
    });

  const [chargement, setChargement] = useState(true);
  const [enregistrementProfil, setEnregistrementProfil] = useState(false);
  const [enregistrementEntreprise, setEnregistrementEntreprise] =
    useState(false);

  const [messageErreur, setMessageErreur] = useState("");
  const [messageSucces, setMessageSucces] = useState("");

  useEffect(() => {
    initialiserPage();
  }, []);

  async function initialiserPage() {
    try {
      setChargement(true);
      setMessageErreur("");

      const resultat = await chargerContexteEntreprise();

      if (resultat.erreur || !resultat.contexte?.profil || !resultat.contexte?.entreprise) {
        setMessageErreur(
          "Impossible de charger votre profil. Veuillez vous reconnecter."
        );
        setChargement(false);
        return;
      }

      const profilCharge = resultat.contexte.profil as ProfilUtilisateur;
      const entrepriseChargee = resultat.contexte.entreprise as Entreprise;

      if (profilCharge.role !== "chef") {
        setMessageErreur("Cette page est réservée au chef d’entreprise.");
        setChargement(false);
        return;
      }

      setProfil(profilCharge);
      setEntreprise(entrepriseChargee);

      setFormulaireProfil({
        nom: valeurTexte(profilCharge.nom),
        prenom: valeurTexte(profilCharge.prenom),
      });

      setFormulaireEntreprise({
        nom_entreprise: valeurTexte(entrepriseChargee.nom_entreprise),
        email_contact: valeurTexte(entrepriseChargee.email_contact),
        telephone: valeurTexte(entrepriseChargee.telephone),
      });
    } catch (error) {
      console.error("Erreur chargement profil chef :", error);
      setMessageErreur("Une erreur est survenue pendant le chargement.");
    } finally {
      setChargement(false);
    }
  }

  function modifierProfil(champ: keyof FormulaireProfil, valeur: string) {
    setFormulaireProfil((ancien) => ({
      ...ancien,
      [champ]: valeur,
    }));
  }

  function modifierEntreprise(champ: keyof FormulaireEntreprise, valeur: string) {
    setFormulaireEntreprise((ancien) => ({
      ...ancien,
      [champ]: valeur,
    }));
  }

  async function enregistrerProfil() {
    if (!profil?.id) {
      setMessageErreur("Profil introuvable. Veuillez vous reconnecter.");
      return;
    }

    try {
      setEnregistrementProfil(true);
      setMessageErreur("");
      setMessageSucces("");

      const payload = {
        nom: nettoyerTexte(formulaireProfil.nom),
        prenom: nettoyerTexte(formulaireProfil.prenom),
      };

      const { error } = await supabase
        .from("profils_utilisateurs")
        .update(payload)
        .eq("id", profil.id);

      if (error) throw error;

      setProfil((ancien) =>
        ancien
          ? {
              ...ancien,
              ...payload,
            }
          : ancien
      );

      setMessageSucces("Profil mis à jour avec succès.");
    } catch (error: any) {
      console.error("Erreur mise à jour profil chef :", error);
      setMessageErreur(
        error?.message || "Impossible de mettre à jour votre profil."
      );
    } finally {
      setEnregistrementProfil(false);
    }
  }

  async function enregistrerEntreprise() {
    if (!entreprise?.id) {
      setMessageErreur("Entreprise introuvable. Veuillez vous reconnecter.");
      return;
    }

    try {
      setEnregistrementEntreprise(true);
      setMessageErreur("");
      setMessageSucces("");

      const payload = {
        nom_entreprise: nettoyerTexte(formulaireEntreprise.nom_entreprise),
        email_contact: nettoyerTexte(formulaireEntreprise.email_contact),
        telephone: nettoyerTexte(formulaireEntreprise.telephone),
      };

      const { error } = await supabase
        .from("entreprises_abonnees")
        .update(payload)
        .eq("id", entreprise.id);

      if (error) throw error;

      setEntreprise((ancien) =>
        ancien
          ? {
              ...ancien,
              ...payload,
            }
          : ancien
      );

      setMessageSucces("Informations entreprise mises à jour avec succès.");
    } catch (error: any) {
      console.error("Erreur mise à jour entreprise :", error);
      setMessageErreur(
        error?.message || "Impossible de mettre à jour l’entreprise."
      );
    } finally {
      setEnregistrementEntreprise(false);
    }
  }

  if (chargement) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-50 text-3xl">
            👤
          </div>
          <p className="text-lg font-bold text-slate-950">
            Chargement du profil...
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Récupération de vos informations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-emerald-700">Arboboard</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">Mon profil</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Gérez vos informations personnelles et les informations principales de
          votre entreprise.
        </p>
      </section>

      {messageErreur && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {messageErreur}
        </div>
      )}

      {messageSucces && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {messageSucces}
        </div>
      )}

      <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-lg font-bold text-slate-950">
                Informations personnelles
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Ces informations servent à identifier votre compte chef.
              </p>
            </div>

            <div className="space-y-5 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Prénom
                  </label>
                  <input
                    value={formulaireProfil.prenom}
                    onChange={(event) =>
                      modifierProfil("prenom", event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    placeholder="Votre prénom"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Nom
                  </label>
                  <input
                    value={formulaireProfil.nom}
                    onChange={(event) =>
                      modifierProfil("nom", event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    placeholder="Votre nom"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Email de connexion
                </label>
                <input
                  value={profil?.email || ""}
                  disabled
                  className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500"
                />
                <p className="mt-1 text-xs text-slate-500">
                  L’email de connexion n’est pas modifiable ici.
                </p>
              </div>

              <button
                onClick={enregistrerProfil}
                disabled={enregistrementProfil}
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {enregistrementProfil
                  ? "Enregistrement..."
                  : "Enregistrer mon profil"}
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-lg font-bold text-slate-950">
                Informations entreprise
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Ces informations seront utilisées dans les prochains documents :
                devis, factures, emails et paramètres.
              </p>
            </div>

            <div className="space-y-5 p-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Nom de l’entreprise
                </label>
                <input
                  value={formulaireEntreprise.nom_entreprise}
                  onChange={(event) =>
                    modifierEntreprise("nom_entreprise", event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  placeholder="Ex : Jardin d’en Haut"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Email de contact
                  </label>
                  <input
                    value={formulaireEntreprise.email_contact}
                    onChange={(event) =>
                      modifierEntreprise("email_contact", event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    placeholder="contact@entreprise.fr"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Téléphone
                  </label>
                  <input
                    value={formulaireEntreprise.telephone}
                    onChange={(event) =>
                      modifierEntreprise("telephone", event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    placeholder="06..."
                  />
                </div>
              </div>

              <button
                onClick={enregistrerEntreprise}
                disabled={enregistrementEntreprise}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {enregistrementEntreprise
                  ? "Enregistrement..."
                  : "Enregistrer l’entreprise"}
              </button>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-950">Compte</h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Rôle</span>
                <span className="font-semibold text-slate-950">Chef</span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Statut utilisateur</span>
                <span className="font-semibold text-slate-950">
                  {profil?.statut || "—"}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Slug entreprise</span>
                <span className="font-semibold text-slate-950">
                  {entreprise?.slug || "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-950">Abonnement</h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Plan</span>
                <span className="font-semibold text-slate-950">
                  {libellePlan(entreprise?.plan_abonnement)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500">Statut</span>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeStatut(
                    entreprise?.statut_abonnement
                  )}`}
                >
                  {libelleStatutAbonnement(entreprise?.statut_abonnement)}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="font-bold text-emerald-900">Conseil</p>
            <p className="mt-2 text-sm text-emerald-800">
              Garde ces informations propres : elles serviront ensuite pour les
              devis PDF, factures PDF, emails clients et documents officiels.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}