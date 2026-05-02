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

  adresse: string;
  code_postal: string;
  ville: string;
  siret: string;
  numero_tva: string;
  forme_juridique: string;

  assurance_nom: string;
  assurance_numero_contrat: string;
  assurance_zone_couverture: string;

  mentions_legales_documents: string;
};

const MENTIONS_LEGALES_DEFAUT =
  "Entreprise assurée pour les travaux réalisés selon les garanties du contrat d’assurance en vigueur. Les travaux seront exécutés conformément au devis accepté et aux règles professionnelles applicables.";

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

function adresseComplete(entreprise: Entreprise | null) {
  if (!entreprise) return "—";

  const ligne = [
    entreprise.adresse,
    entreprise.code_postal,
    entreprise.ville,
  ]
    .filter(Boolean)
    .join(", ");

  return ligne || "—";
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

      adresse: "",
      code_postal: "",
      ville: "",
      siret: "",
      numero_tva: "",
      forme_juridique: "",

      assurance_nom: "",
      assurance_numero_contrat: "",
      assurance_zone_couverture: "",

      mentions_legales_documents: MENTIONS_LEGALES_DEFAUT,
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
      setMessageSucces("");

      const resultat = await chargerContexteEntreprise();

      if (
        resultat.erreur ||
        !resultat.contexte?.profil ||
        !resultat.contexte?.entreprise
      ) {
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

        adresse: valeurTexte(entrepriseChargee.adresse),
        code_postal: valeurTexte(entrepriseChargee.code_postal),
        ville: valeurTexte(entrepriseChargee.ville),
        siret: valeurTexte(entrepriseChargee.siret),
        numero_tva: valeurTexte(entrepriseChargee.numero_tva),
        forme_juridique: valeurTexte(entrepriseChargee.forme_juridique),

        assurance_nom: valeurTexte(entrepriseChargee.assurance_nom),
        assurance_numero_contrat: valeurTexte(
          entrepriseChargee.assurance_numero_contrat
        ),
        assurance_zone_couverture: valeurTexte(
          entrepriseChargee.assurance_zone_couverture
        ),

        mentions_legales_documents:
          valeurTexte(entrepriseChargee.mentions_legales_documents) ||
          MENTIONS_LEGALES_DEFAUT,
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

        adresse: nettoyerTexte(formulaireEntreprise.adresse),
        code_postal: nettoyerTexte(formulaireEntreprise.code_postal),
        ville: nettoyerTexte(formulaireEntreprise.ville),
        siret: nettoyerTexte(formulaireEntreprise.siret),
        numero_tva: nettoyerTexte(formulaireEntreprise.numero_tva),
        forme_juridique: nettoyerTexte(formulaireEntreprise.forme_juridique),

        assurance_nom: nettoyerTexte(formulaireEntreprise.assurance_nom),
        assurance_numero_contrat: nettoyerTexte(
          formulaireEntreprise.assurance_numero_contrat
        ),
        assurance_zone_couverture: nettoyerTexte(
          formulaireEntreprise.assurance_zone_couverture
        ),

        mentions_legales_documents: nettoyerTexte(
          formulaireEntreprise.mentions_legales_documents
        ),
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

  function restaurerMentionsLegales() {
    setFormulaireEntreprise((ancien) => ({
      ...ancien,
      mentions_legales_documents: MENTIONS_LEGALES_DEFAUT,
    }));

    setMessageSucces(
      "Mentions légales par défaut restaurées. Pensez à enregistrer."
    );
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
          Gérez vos informations personnelles, votre entreprise et les mentions
          qui seront utilisées dans les devis PDF et factures PDF.
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
                devis, factures et emails clients.
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

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Adresse
                </label>
                <input
                  value={formulaireEntreprise.adresse}
                  onChange={(event) =>
                    modifierEntreprise("adresse", event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  placeholder="Adresse de l’entreprise"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Code postal
                  </label>
                  <input
                    value={formulaireEntreprise.code_postal}
                    onChange={(event) =>
                      modifierEntreprise("code_postal", event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    placeholder="03500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Ville
                  </label>
                  <input
                    value={formulaireEntreprise.ville}
                    onChange={(event) =>
                      modifierEntreprise("ville", event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    placeholder="Châtel-de-Neuvre"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-lg font-bold text-slate-950">
                Informations légales
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Ces informations apparaîtront dans les devis et factures PDF.
              </p>
            </div>

            <div className="space-y-5 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    SIRET
                  </label>
                  <input
                    value={formulaireEntreprise.siret}
                    onChange={(event) =>
                      modifierEntreprise("siret", event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    placeholder="Numéro SIRET"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    TVA intracommunautaire
                  </label>
                  <input
                    value={formulaireEntreprise.numero_tva}
                    onChange={(event) =>
                      modifierEntreprise("numero_tva", event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    placeholder="FR..."
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Forme juridique
                </label>
                <input
                  value={formulaireEntreprise.forme_juridique}
                  onChange={(event) =>
                    modifierEntreprise("forme_juridique", event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  placeholder="Ex : Entreprise individuelle, SASU, EURL..."
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-lg font-bold text-slate-950">Assurance</h2>
              <p className="mt-1 text-sm text-slate-500">
                Ces informations permettent d’afficher une mention d’assurance
                professionnelle sur les documents.
              </p>
            </div>

            <div className="space-y-5 p-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Nom de l’assurance
                </label>
                <input
                  value={formulaireEntreprise.assurance_nom}
                  onChange={(event) =>
                    modifierEntreprise("assurance_nom", event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  placeholder="Ex : Groupama, MAAF, MMA..."
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Numéro contrat
                  </label>
                  <input
                    value={formulaireEntreprise.assurance_numero_contrat}
                    onChange={(event) =>
                      modifierEntreprise(
                        "assurance_numero_contrat",
                        event.target.value
                      )
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    placeholder="Numéro de contrat"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Zone de couverture
                  </label>
                  <input
                    value={formulaireEntreprise.assurance_zone_couverture}
                    onChange={(event) =>
                      modifierEntreprise(
                        "assurance_zone_couverture",
                        event.target.value
                      )
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    placeholder="Ex : France métropolitaine"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Mentions légales documents
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Texte complémentaire affiché en bas des devis et factures.
                </p>
              </div>

              <button
                onClick={restaurerMentionsLegales}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Restaurer
              </button>
            </div>

            <div className="space-y-5 p-5">
              <textarea
                value={formulaireEntreprise.mentions_legales_documents}
                onChange={(event) =>
                  modifierEntreprise(
                    "mentions_legales_documents",
                    event.target.value
                  )
                }
                rows={5}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                placeholder="Mentions légales à afficher sur les documents..."
              />

              <button
                onClick={enregistrerEntreprise}
                disabled={enregistrementEntreprise}
                className="w-full rounded-2xl bg-slate-900 px-5 py-4 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {enregistrementEntreprise
                  ? "Enregistrement..."
                  : "Enregistrer les informations entreprise"}
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
            <h2 className="font-bold text-slate-950">Entreprise</h2>

            <div className="mt-4 space-y-3 text-sm">
              <div>
                <span className="block text-slate-500">Nom</span>
                <span className="font-semibold text-slate-950">
                  {entreprise?.nom_entreprise || "—"}
                </span>
              </div>

              <div>
                <span className="block text-slate-500">Adresse</span>
                <span className="font-semibold text-slate-950">
                  {adresseComplete(entreprise)}
                </span>
              </div>

              <div>
                <span className="block text-slate-500">SIRET</span>
                <span className="font-semibold text-slate-950">
                  {entreprise?.siret || "—"}
                </span>
              </div>

              <div>
                <span className="block text-slate-500">TVA</span>
                <span className="font-semibold text-slate-950">
                  {entreprise?.numero_tva || "—"}
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
              Remplis correctement ces informations : elles seront intégrées dans
              les devis PDF, factures PDF et futurs emails clients.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}