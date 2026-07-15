"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { chargerContexteEntreprise } from "@/lib/entreprise";
import { journaliserActivite } from "@/lib/journalActivite";
import { supabase } from "@/lib/supabaseClient";

type ResultatContexteEntreprise = Awaited<
  ReturnType<typeof chargerContexteEntreprise>
>;

type ContexteEntrepriseBrut = NonNullable<
  ResultatContexteEntreprise["contexte"]
>;

type ProfilUtilisateur = NonNullable<ContexteEntrepriseBrut["profil"]> & {
  id: string;
  email?: string | null;
  role?: string | null;
  statut?: string | null;
  nom?: string | null;
  prenom?: string | null;
  entreprise_id?: string | null;
};

type Entreprise = NonNullable<ContexteEntrepriseBrut["entreprise"]> & {
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

const FORMULAIRE_PROFIL_VIDE: FormulaireProfil = {
  nom: "",
  prenom: "",
};

const FORMULAIRE_ENTREPRISE_VIDE: FormulaireEntreprise = {
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
};

function valeurTexte(valeur: string | null | undefined) {
  return valeur || "";
}

function nettoyerTexte(valeur: string) {
  const texte = valeur.trim();
  return texte.length > 0 ? texte : null;
}

function normaliserRole(role: string | null | undefined) {
  return String(role || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function roleChefAutorise(role: string | null | undefined) {
  return [
    "chef",
    "admin",
    "administrateur",
    "gerant",
    "dirigeant",
    "patron",
  ].includes(normaliserRole(role));
}

function libelleRole(role: string | null | undefined) {
  const roleNormalise = normaliserRole(role);

  if (roleNormalise === "admin" || roleNormalise === "administrateur") {
    return "Administrateur";
  }

  if (roleNormalise === "gerant") return "Gérant";
  if (roleNormalise === "dirigeant") return "Dirigeant";
  if (roleNormalise === "patron") return "Chef d’entreprise";

  return "Chef d’entreprise";
}

function libellePlan(plan: string | null | undefined) {
  const planNormalise = String(plan || "").toLowerCase();

  if (planNormalise === "essentiel") return "Essentiel";
  if (planNormalise === "pro") return "Pro";
  if (planNormalise === "expert") return "Expert";
  if (planNormalise === "dev") return "Développement";
  if (planNormalise === "essai") return "Essai";

  return plan || "Non défini";
}

function libelleStatutAbonnement(statut: string | null | undefined) {
  const statutNormalise = String(statut || "").toLowerCase();

  if (statutNormalise === "actif") return "Actif";
  if (statutNormalise === "essai") return "Essai";
  if (statutNormalise === "suspendu") return "Suspendu";
  if (statutNormalise === "annule" || statutNormalise === "annulé") {
    return "Annulé";
  }
  if (statutNormalise === "dev") return "Développement";

  return statut || "Non défini";
}

function badgeStatut(statut: string | null | undefined) {
  const statutNormalise = String(statut || "").toLowerCase();

  if (statutNormalise === "actif" || statutNormalise === "dev") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (statutNormalise === "essai") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (statutNormalise === "suspendu") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (statutNormalise === "annule" || statutNormalise === "annulé") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function adresseComplete(entreprise: Entreprise | null) {
  if (!entreprise) return "—";

  const adresse = entreprise.adresse?.trim();
  const ville = [entreprise.code_postal, entreprise.ville]
    .filter(Boolean)
    .join(" ")
    .trim();

  return [adresse, ville].filter(Boolean).join(", ") || "—";
}

function obtenirMessageErreur(error: unknown, messageParDefaut: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return messageParDefaut;
}

function emailValide(email: string) {
  if (!email.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function siretValide(siret: string) {
  if (!siret.trim()) return true;
  return siret.replace(/\s/g, "").length === 14;
}

function codePostalValide(codePostal: string) {
  if (!codePostal.trim()) return true;
  return /^\d{5}$/.test(codePostal.replace(/\s/g, ""));
}

function initialesProfil(profil: ProfilUtilisateur | null) {
  if (!profil) return "A";

  const initiales = [profil.prenom, profil.nom]
    .filter(Boolean)
    .map((valeur) =>
      String(valeur).trim().charAt(0).toUpperCase()
    )
    .join("");

  if (initiales) return initiales.slice(0, 2);

  return String(profil.email || "A")
    .charAt(0)
    .toUpperCase();
}

function normaliserEmail(email: string) {
  return email.trim().toLowerCase();
}

function normaliserNumeroTva(numeroTva: string) {
  return numeroTva.replace(/\s/g, "").toUpperCase();
}

export default function ProfilChefPage() {
  const [profil, setProfil] = useState<ProfilUtilisateur | null>(null);
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null);

  const [formulaireProfil, setFormulaireProfil] =
    useState<FormulaireProfil>(FORMULAIRE_PROFIL_VIDE);
  const [profilEnregistre, setProfilEnregistre] =
    useState<FormulaireProfil>(FORMULAIRE_PROFIL_VIDE);

  const [formulaireEntreprise, setFormulaireEntreprise] =
    useState<FormulaireEntreprise>(FORMULAIRE_ENTREPRISE_VIDE);
  const [entrepriseEnregistree, setEntrepriseEnregistree] =
    useState<FormulaireEntreprise>(FORMULAIRE_ENTREPRISE_VIDE);

  const [chargement, setChargement] = useState(true);
  const [enregistrementProfil, setEnregistrementProfil] = useState(false);
  const [enregistrementEntreprise, setEnregistrementEntreprise] =
    useState(false);

  const [messageErreur, setMessageErreur] = useState("");
  const [messageSucces, setMessageSucces] = useState("");

  const profilModifie = useMemo(
    () => JSON.stringify(formulaireProfil) !== JSON.stringify(profilEnregistre),
    [formulaireProfil, profilEnregistre]
  );

  const entrepriseModifiee = useMemo(
    () =>
      JSON.stringify(formulaireEntreprise) !==
      JSON.stringify(entrepriseEnregistree),
    [formulaireEntreprise, entrepriseEnregistree]
  );

  useEffect(() => {
    void initialiserPage();
  }, []);

  useEffect(() => {
    function avertirAvantFermeture(event: BeforeUnloadEvent) {
      if (!profilModifie && !entrepriseModifiee) return;

      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", avertirAvantFermeture);

    return () => {
      window.removeEventListener("beforeunload", avertirAvantFermeture);
    };
  }, [entrepriseModifiee, profilModifie]);

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
        throw new Error(
          resultat.erreur ||
            "Impossible de charger votre profil. Veuillez vous reconnecter."
        );
      }

      const profilCharge = resultat.contexte.profil as ProfilUtilisateur;
      const entrepriseChargee = resultat.contexte.entreprise as Entreprise;

      if (!roleChefAutorise(profilCharge.role)) {
        throw new Error("Cette page est réservée au chef d’entreprise.");
      }

      const nouveauFormulaireProfil: FormulaireProfil = {
        nom: valeurTexte(profilCharge.nom),
        prenom: valeurTexte(profilCharge.prenom),
      };

      const nouveauFormulaireEntreprise: FormulaireEntreprise = {
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
      };

      setProfil(profilCharge);
      setEntreprise(entrepriseChargee);
      setFormulaireProfil(nouveauFormulaireProfil);
      setProfilEnregistre(nouveauFormulaireProfil);
      setFormulaireEntreprise(nouveauFormulaireEntreprise);
      setEntrepriseEnregistree(nouveauFormulaireEntreprise);
    } catch (error) {
      console.error("Erreur chargement profil chef :", error);
      setMessageErreur(
        obtenirMessageErreur(
          error,
          "Une erreur est survenue pendant le chargement."
        )
      );
    } finally {
      setChargement(false);
    }
  }

  function modifierProfil(champ: keyof FormulaireProfil, valeur: string) {
    setFormulaireProfil((ancien) => ({
      ...ancien,
      [champ]: valeur,
    }));
    setMessageErreur("");
    setMessageSucces("");
  }

  function modifierEntreprise(
    champ: keyof FormulaireEntreprise,
    valeur: string
  ) {
    setFormulaireEntreprise((ancien) => ({
      ...ancien,
      [champ]: valeur,
    }));
    setMessageErreur("");
    setMessageSucces("");
  }

  async function enregistrerProfil() {
    if (!profil?.id) {
      setMessageErreur("Profil introuvable. Veuillez vous reconnecter.");
      return;
    }

    const champsModifies = (
      Object.keys(formulaireProfil) as Array<keyof FormulaireProfil>
    ).filter(
      (champ) =>
        formulaireProfil[champ] !== profilEnregistre[champ]
    );

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

      const profilMisAJour: ProfilUtilisateur = {
        ...profil,
        ...payload,
      };

      const formulaireSauvegarde: FormulaireProfil = {
        nom: valeurTexte(payload.nom),
        prenom: valeurTexte(payload.prenom),
      };

      setProfil(profilMisAJour);
      setFormulaireProfil(formulaireSauvegarde);
      setProfilEnregistre(formulaireSauvegarde);
      setMessageSucces("Vos informations personnelles ont été enregistrées.");

      await journaliserActivite({
        action: "profil_personnel_modifie",
        categorie: "parametres",
        ressource_type: "profil_utilisateur",
        ressource_id: profil.id,
        resultat: "succes",
        description:
          "Modification des informations personnelles du compte chef.",
        details: {
          champs_modifies: champsModifies,
        },
      });
    } catch (error) {
      console.error("Erreur mise à jour profil chef :", error);

      const message = obtenirMessageErreur(
        error,
        "Impossible de mettre à jour votre profil."
      );

      setMessageErreur(message);

      await journaliserActivite({
        action: "profil_personnel_modification_echec",
        categorie: "parametres",
        ressource_type: "profil_utilisateur",
        ressource_id: profil.id,
        resultat: "echec",
        description:
          "Échec de la modification des informations personnelles.",
        details: {
          champs_modifies: champsModifies,
          erreur: message,
        },
      });
    } finally {
      setEnregistrementProfil(false);
    }
  }

  async function enregistrerEntreprise() {
    if (!entreprise?.id) {
      setMessageErreur("Entreprise introuvable. Veuillez vous reconnecter.");
      return;
    }

    if (!formulaireEntreprise.nom_entreprise.trim()) {
      setMessageErreur("Le nom de l’entreprise est obligatoire.");
      return;
    }

    if (!emailValide(formulaireEntreprise.email_contact)) {
      setMessageErreur("L’adresse email de contact n’est pas valide.");
      return;
    }

    if (!siretValide(formulaireEntreprise.siret)) {
      setMessageErreur("Le numéro SIRET doit contenir exactement 14 chiffres.");
      return;
    }

    if (!codePostalValide(formulaireEntreprise.code_postal)) {
      setMessageErreur("Le code postal doit contenir 5 chiffres.");
      return;
    }

    const champsModifies = (
      Object.keys(formulaireEntreprise) as Array<
        keyof FormulaireEntreprise
      >
    ).filter(
      (champ) =>
        formulaireEntreprise[champ] !== entrepriseEnregistree[champ]
    );

    try {
      setEnregistrementEntreprise(true);
      setMessageErreur("");
      setMessageSucces("");

      const payload = {
        nom_entreprise: nettoyerTexte(formulaireEntreprise.nom_entreprise),
        email_contact: nettoyerTexte(
          normaliserEmail(formulaireEntreprise.email_contact)
        ),
        telephone: nettoyerTexte(formulaireEntreprise.telephone),
        adresse: nettoyerTexte(formulaireEntreprise.adresse),
        code_postal: nettoyerTexte(formulaireEntreprise.code_postal),
        ville: nettoyerTexte(formulaireEntreprise.ville),
        siret: nettoyerTexte(
          formulaireEntreprise.siret.replace(/\s/g, "")
        ),
        numero_tva: nettoyerTexte(
          normaliserNumeroTva(formulaireEntreprise.numero_tva)
        ),
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

      const { error: synchronisationError } = await supabase
        .from("entreprise_parametres")
        .update({
          nom_entreprise: payload.nom_entreprise,
          adresse: payload.adresse,
          code_postal: payload.code_postal,
          ville: payload.ville,
          telephone: payload.telephone,
          email: payload.email_contact,
          siret: payload.siret,
          numero_tva_intracommunautaire: payload.numero_tva,
          forme_juridique: payload.forme_juridique,
        })
        .eq("entreprise_id", entreprise.id);

      if (synchronisationError) {
        console.warn(
          "Synchronisation des paramètres entreprise impossible :",
          synchronisationError
        );
      }

      const entrepriseMiseAJour: Entreprise = {
        ...entreprise,
        ...payload,
      };

      const formulaireSauvegarde: FormulaireEntreprise = {
        nom_entreprise: valeurTexte(payload.nom_entreprise),
        email_contact: valeurTexte(payload.email_contact),
        telephone: valeurTexte(payload.telephone),
        adresse: valeurTexte(payload.adresse),
        code_postal: valeurTexte(payload.code_postal),
        ville: valeurTexte(payload.ville),
        siret: valeurTexte(payload.siret),
        numero_tva: valeurTexte(payload.numero_tva),
        forme_juridique: valeurTexte(payload.forme_juridique),
        assurance_nom: valeurTexte(payload.assurance_nom),
        assurance_numero_contrat: valeurTexte(
          payload.assurance_numero_contrat
        ),
        assurance_zone_couverture: valeurTexte(
          payload.assurance_zone_couverture
        ),
        mentions_legales_documents: valeurTexte(
          payload.mentions_legales_documents
        ),
      };

      setEntreprise(entrepriseMiseAJour);
      setFormulaireEntreprise(formulaireSauvegarde);
      setEntrepriseEnregistree(formulaireSauvegarde);
      setMessageSucces(
        "Les informations de l’entreprise ont été enregistrées."
      );

      await journaliserActivite({
        action: "entreprise_modifiee",
        categorie: "parametres",
        ressource_type: "entreprise",
        ressource_id: entreprise.id,
        resultat: "succes",
        description:
          "Modification des coordonnées ou informations légales de l’entreprise.",
        details: {
          champs_modifies: champsModifies,
          synchronisation_parametres:
            synchronisationError === null,
        },
      });
    } catch (error) {
      console.error("Erreur mise à jour entreprise :", error);

      const message = obtenirMessageErreur(
        error,
        "Impossible de mettre à jour l’entreprise."
      );

      setMessageErreur(message);

      await journaliserActivite({
        action: "entreprise_modification_echec",
        categorie: "parametres",
        ressource_type: "entreprise",
        ressource_id: entreprise.id,
        resultat: "echec",
        description:
          "Échec de la modification des informations de l’entreprise.",
        details: {
          champs_modifies: champsModifies,
          erreur: message,
        },
      });
    } finally {
      setEnregistrementEntreprise(false);
    }
  }

  function restaurerMentionsLegales() {
    modifierEntreprise(
      "mentions_legales_documents",
      MENTIONS_LEGALES_DEFAUT
    );
    setMessageSucces(
      "Le texte par défaut a été restauré. Enregistrez l’entreprise pour le conserver."
    );
  }

  function annulerModificationsProfil() {
    setFormulaireProfil(profilEnregistre);
    setMessageErreur("");
    setMessageSucces(
      "Les modifications du profil ont été annulées."
    );
  }

  function annulerModificationsEntreprise() {
    setFormulaireEntreprise(entrepriseEnregistree);
    setMessageErreur("");
    setMessageSucces(
      "Les modifications de l’entreprise ont été annulées."
    );
  }

  if (chargement) {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
            ⏳
          </div>

          <p className="font-semibold text-slate-950">
            Chargement du profil…
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Récupération de vos informations personnelles et professionnelles.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 bg-emerald-600" />

        <div className="bg-gradient-to-br from-emerald-50 via-white to-white p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-lg font-black text-white shadow-sm">
                {initialesProfil(profil)}
              </div>

              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
                  Mon compte
                </p>

                <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  Profil et entreprise
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  Gérez vos informations personnelles ainsi que les données
                  officielles utilisées sur les documents Arboboard.
                </p>
              </div>
            </div>

            <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto">
              <Link
                href="/chef/compte"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                ← Mon compte
              </Link>

              <Link
                href="/chef/parametres"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Paramètres documents
              </Link>
            </div>
          </div>
        </div>
      </section>

      {messageErreur ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {messageErreur}
        </div>
      ) : null}

      {messageSucces ? (
        <div
          role="status"
          className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
        >
          {messageSucces}
        </div>
      ) : null}

      {(profilModifie || entrepriseModifiee) ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          Des modifications ne sont pas encore enregistrées.
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <article className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    Informations personnelles
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Nom affiché dans votre espace et sur les signatures.
                  </p>
                </div>

                {profilModifie ? (
                  <span className="w-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    Modifications non enregistrées
                  </span>
                ) : null}
              </div>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <ChampTexte
                  label="Prénom"
                  value={formulaireProfil.prenom}
                  onChange={(valeur) => modifierProfil("prenom", valeur)}
                  autoComplete="given-name"
                  placeholder="Votre prénom"
                />
                <ChampTexte
                  label="Nom"
                  value={formulaireProfil.nom}
                  onChange={(valeur) => modifierProfil("nom", valeur)}
                  autoComplete="family-name"
                  placeholder="Votre nom"
                />
              </div>

              <ChampTexte
                label="Email de connexion"
                value={profil?.email || ""}
                onChange={() => undefined}
                type="email"
                disabled
                aide="L’adresse de connexion ne peut pas être modifiée depuis cette page."
              />

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={annulerModificationsProfil}
                  disabled={enregistrementProfil || !profilModifie}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Annuler les modifications
                </button>

                <button
                  type="button"
                  onClick={enregistrerProfil}
                  disabled={enregistrementProfil || !profilModifie}
                  className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {enregistrementProfil
                    ? "Enregistrement…"
                    : "Enregistrer mon profil"}
                </button>
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    Identité de l’entreprise
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Coordonnées utilisées sur les documents et les emails.
                  </p>
                </div>

                {entrepriseModifiee ? (
                  <span className="w-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    Modifications non enregistrées
                  </span>
                ) : null}
              </div>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <ChampTexte
                label="Nom de l’entreprise"
                value={formulaireEntreprise.nom_entreprise}
                onChange={(valeur) =>
                  modifierEntreprise("nom_entreprise", valeur)
                }
                autoComplete="organization"
                placeholder="Ex. Jardin d’en Haut"
                required
              />

              <div className="grid gap-4 md:grid-cols-2">
                <ChampTexte
                  label="Email de contact"
                  value={formulaireEntreprise.email_contact}
                  onChange={(valeur) =>
                    modifierEntreprise("email_contact", valeur)
                  }
                  type="email"
                  autoComplete="email"
                  placeholder="contact@entreprise.fr"
                  erreur={
                    formulaireEntreprise.email_contact.trim() !== "" &&
                    !emailValide(formulaireEntreprise.email_contact)
                      ? "L’adresse email n’est pas valide."
                      : undefined
                  }
                />
                <ChampTexte
                  label="Téléphone"
                  value={formulaireEntreprise.telephone}
                  onChange={(valeur) =>
                    modifierEntreprise("telephone", valeur)
                  }
                  type="tel"
                  autoComplete="tel"
                  placeholder="06 00 00 00 00"
                />
              </div>

              <ChampTexte
                label="Adresse"
                value={formulaireEntreprise.adresse}
                onChange={(valeur) =>
                  modifierEntreprise("adresse", valeur)
                }
                autoComplete="street-address"
                placeholder="Adresse de l’entreprise"
              />

              <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
                <ChampTexte
                  label="Code postal"
                  value={formulaireEntreprise.code_postal}
                  onChange={(valeur) =>
                    modifierEntreprise("code_postal", valeur)
                  }
                  inputMode="numeric"
                  autoComplete="postal-code"
                  maxLength={5}
                  placeholder="03500"
                  erreur={
                    formulaireEntreprise.code_postal.trim() !== "" &&
                    !codePostalValide(formulaireEntreprise.code_postal)
                      ? "Le code postal doit contenir 5 chiffres."
                      : undefined
                  }
                />
                <ChampTexte
                  label="Ville"
                  value={formulaireEntreprise.ville}
                  onChange={(valeur) =>
                    modifierEntreprise("ville", valeur)
                  }
                  autoComplete="address-level2"
                  placeholder="Châtel-de-Neuvre"
                />
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5 sm:p-6">
              <h2 className="text-lg font-bold text-slate-950">
                Informations légales
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Données d’identification affichées sur les documents commerciaux.
              </p>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <ChampTexte
                  label="SIRET"
                  value={formulaireEntreprise.siret}
                  onChange={(valeur) =>
                    modifierEntreprise("siret", valeur)
                  }
                  inputMode="numeric"
                  maxLength={17}
                  placeholder="14 chiffres"
                  aide="Les espaces sont supprimés lors de l’enregistrement."
                  erreur={
                    formulaireEntreprise.siret.trim() !== "" &&
                    !siretValide(formulaireEntreprise.siret)
                      ? "Le SIRET doit contenir exactement 14 chiffres."
                      : undefined
                  }
                />
                <ChampTexte
                  label="TVA intracommunautaire"
                  value={formulaireEntreprise.numero_tva}
                  onChange={(valeur) =>
                    modifierEntreprise("numero_tva", valeur.toUpperCase())
                  }
                  placeholder="FR..."
                />
              </div>

              <ChampTexte
                label="Forme juridique"
                value={formulaireEntreprise.forme_juridique}
                onChange={(valeur) =>
                  modifierEntreprise("forme_juridique", valeur)
                }
                placeholder="Entreprise individuelle, SASU, EURL…"
              />
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5 sm:p-6">
              <h2 className="text-lg font-bold text-slate-950">
                Assurance professionnelle
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Références de l’assurance couvrant les travaux de l’entreprise.
              </p>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <ChampTexte
                label="Compagnie d’assurance"
                value={formulaireEntreprise.assurance_nom}
                onChange={(valeur) =>
                  modifierEntreprise("assurance_nom", valeur)
                }
                placeholder="Nom de l’assureur"
              />

              <div className="grid gap-4 md:grid-cols-2">
                <ChampTexte
                  label="Numéro du contrat"
                  value={formulaireEntreprise.assurance_numero_contrat}
                  onChange={(valeur) =>
                    modifierEntreprise(
                      "assurance_numero_contrat",
                      valeur
                    )
                  }
                  placeholder="Référence du contrat"
                />
                <ChampTexte
                  label="Zone de couverture"
                  value={formulaireEntreprise.assurance_zone_couverture}
                  onChange={(valeur) =>
                    modifierEntreprise(
                      "assurance_zone_couverture",
                      valeur
                    )
                  }
                  placeholder="France métropolitaine"
                />
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Mention complémentaire
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Texte d’entreprise pouvant être repris sur les documents.
                </p>
              </div>

              <button
                type="button"
                onClick={restaurerMentionsLegales}
                className="w-fit rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Restaurer le texte
              </button>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <ChampTextarea
                label="Mention"
                value={formulaireEntreprise.mentions_legales_documents}
                onChange={(valeur) =>
                  modifierEntreprise(
                    "mentions_legales_documents",
                    valeur
                  )
                }
                rows={5}
                placeholder="Mention complémentaire de l’entreprise…"
              />

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={annulerModificationsEntreprise}
                  disabled={
                    enregistrementEntreprise || !entrepriseModifiee
                  }
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Annuler les modifications
                </button>

                <button
                  type="button"
                  onClick={enregistrerEntreprise}
                  disabled={
                    enregistrementEntreprise || !entrepriseModifiee
                  }
                  className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {enregistrementEntreprise
                    ? "Enregistrement…"
                    : "Enregistrer l’entreprise"}
                </button>
              </div>
            </div>
          </article>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-950">
              Résumé du compte
            </h2>

            <div className="mt-4 space-y-4 text-sm">
              <LigneResume
                label="Utilisateur"
                valeur={
                  `${profil?.prenom || ""} ${profil?.nom || ""}`.trim() ||
                  profil?.email ||
                  "—"
                }
              />
              <LigneResume
                label="Rôle"
                valeur={libelleRole(profil?.role)}
              />
              <LigneResume
                label="Statut"
                valeur={profil?.statut || "—"}
              />
              <LigneResume
                label="Entreprise"
                valeur={entreprise?.nom_entreprise || "—"}
              />
              <LigneResume
                label="Adresse"
                valeur={adresseComplete(entreprise)}
              />
              <LigneResume
                label="SIRET"
                valeur={entreprise?.siret || "—"}
              />
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-950">Abonnement</h2>

            <div className="mt-4 space-y-3 text-sm">
              <LigneResume
                label="Plan"
                valeur={libellePlan(entreprise?.plan_abonnement)}
              />

              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500">Statut</span>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeStatut(
                    entreprise?.statut_abonnement
                  )}`}
                >
                  {libelleStatutAbonnement(
                    entreprise?.statut_abonnement
                  )}
                </span>
              </div>
            </div>

            <Link
              href="/chef/abonnement"
              className="mt-5 inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Gérer l’abonnement →
            </Link>
          </article>

          <article className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="font-bold text-emerald-950">
              Paramètres des documents
            </p>
            <p className="mt-2 text-sm leading-6 text-emerald-800">
              Le logo, la TVA, les délais, les préfixes et les conditions
              générales se règlent dans la page Paramètres.
            </p>
            <Link
              href="/chef/parametres"
              className="mt-4 inline-flex text-sm font-semibold text-emerald-800 hover:text-emerald-950"
            >
              Ouvrir les paramètres →
            </Link>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-950">
              Sécurité et conformité
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Accédez aux sauvegardes, au RGPD et aux documents juridiques.
            </p>
            <Link
              href="/chef/securite"
              className="mt-4 inline-flex text-sm font-semibold text-slate-800 hover:text-slate-950"
            >
              Ouvrir la sécurité →
            </Link>
          </article>
        </aside>
      </section>
    </div>
  );
}

function ChampTexte({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  aide,
  disabled = false,
  required = false,
  autoComplete,
  inputMode,
  maxLength,
  erreur,
}: {
  label: string;
  value: string;
  onChange: (valeur: string) => void;
  type?: string;
  placeholder?: string;
  aide?: string;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
  inputMode?: "text" | "search" | "tel" | "url" | "email" | "numeric" | "decimal";
  maxLength?: number;
  erreur?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(erreur)}
        className={`mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 ${
          erreur
            ? "border-red-300 focus:border-red-500 focus:ring-red-100"
            : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-100"
        }`}
      />

      {erreur ? (
        <span className="mt-1.5 block text-xs font-medium leading-5 text-red-600">
          {erreur}
        </span>
      ) : null}

      {aide ? (
        <span className="mt-1.5 block text-xs leading-5 text-slate-500">
          {aide}
        </span>
      ) : null}
    </label>
  );
}

function ChampTextarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (valeur: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <textarea
        value={value}
        placeholder={placeholder}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full resize-y rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
      />
    </label>
  );
}

function LigneResume({
  label,
  valeur,
}: {
  label: string;
  valeur: string;
}) {
  return (
    <div>
      <span className="block text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span className="mt-1 block break-words font-semibold text-slate-900">
        {valeur}
      </span>
    </div>
  );
}