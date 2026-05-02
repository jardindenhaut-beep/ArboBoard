"use client";

import { useEffect, useState } from "react";
import { chargerContexteEntreprise } from "@/lib/entreprise";
import { supabase } from "@/lib/supabaseClient";

type ProfilUtilisateur = {
  id: string;
  email?: string | null;
  role?: string | null;
  statut?: string | null;
  entreprise_id?: string | null;
};

type Entreprise = {
  id: string;
  nom_entreprise?: string | null;
  slug?: string | null;
  email_contact?: string | null;
  telephone?: string | null;
};

type EntrepriseParametres = {
  id?: string | null;
  entreprise_id: string;

  tva_defaut?: number | null;
  acompte_defaut?: number | null;

  validite_devis_jours?: number | null;
  delai_paiement_jours?: number | null;

  prefixe_devis?: string | null;
  prefixe_facture?: string | null;

  numerotation_devis_auto?: boolean | null;
  numerotation_factures_auto?: boolean | null;

  conditions_devis?: string | null;
  conditions_factures?: string | null;
  mention_retard?: string | null;
  footer_documents?: string | null;

  afficher_logo_documents?: boolean | null;

  created_at?: string | null;
  updated_at?: string | null;
};

type FormulaireParametres = {
  tva_defaut: string;
  acompte_defaut: string;

  validite_devis_jours: string;
  delai_paiement_jours: string;

  prefixe_devis: string;
  prefixe_facture: string;

  numerotation_devis_auto: boolean;
  numerotation_factures_auto: boolean;

  conditions_devis: string;
  conditions_factures: string;
  mention_retard: string;
  footer_documents: string;

  afficher_logo_documents: boolean;
};

const CONDITIONS_DEVIS_DEFAUT =
  "Devis valable pendant la durée indiquée. Acompte de 30 % à la signature sauf indication contraire. Les travaux seront réalisés selon les conditions précisées dans le devis.";

const CONDITIONS_FACTURES_DEFAUT =
  "Paiement à réception de facture sauf indication contraire. Aucun escompte ne sera accordé pour paiement anticipé.";

const MENTION_RETARD_DEFAUT =
  "En cas de retard de paiement, des pénalités pourront être appliquées, ainsi qu’une indemnité forfaitaire de recouvrement de 40 € pour les professionnels.";

const FOOTER_DOCUMENTS_DEFAUT = "Merci pour votre confiance.";

function formulaireDefaut(): FormulaireParametres {
  return {
    tva_defaut: "20",
    acompte_defaut: "30",

    validite_devis_jours: "30",
    delai_paiement_jours: "30",

    prefixe_devis: "DEV",
    prefixe_facture: "FAC",

    numerotation_devis_auto: true,
    numerotation_factures_auto: true,

    conditions_devis: CONDITIONS_DEVIS_DEFAUT,
    conditions_factures: CONDITIONS_FACTURES_DEFAUT,
    mention_retard: MENTION_RETARD_DEFAUT,
    footer_documents: FOOTER_DOCUMENTS_DEFAUT,

    afficher_logo_documents: true,
  };
}

function valeurTexte(valeur: string | null | undefined, defaut = "") {
  return valeur ?? defaut;
}

function nombreVersTexte(valeur: number | null | undefined, defaut: string) {
  if (valeur === null || valeur === undefined) return defaut;
  return String(valeur);
}

function nettoyerTexte(valeur: string) {
  const texte = valeur.trim();
  return texte.length > 0 ? texte : null;
}

function nombreDepuisTexte(valeur: string, defaut: number) {
  const texte = String(valeur || "")
    .replace(",", ".")
    .replace(/\s/g, "")
    .trim();

  const nombre = Number.parseFloat(texte);

  return Number.isFinite(nombre) ? nombre : defaut;
}

function entierDepuisTexte(valeur: string, defaut: number) {
  const nombre = nombreDepuisTexte(valeur, defaut);
  return Math.max(0, Math.round(nombre));
}

function formatPourcentage(valeur: string) {
  return `${nombreDepuisTexte(valeur, 0)} %`;
}

export default function ParametresChefPage() {
  const [entrepriseId, setEntrepriseId] = useState("");
  const [profil, setProfil] = useState<ProfilUtilisateur | null>(null);
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null);
  const [parametres, setParametres] = useState<EntrepriseParametres | null>(
    null
  );

  const [formulaire, setFormulaire] =
    useState<FormulaireParametres>(formulaireDefaut);

  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);

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
        !resultat.contexte?.entreprise?.id
      ) {
        setMessageErreur(
          "Impossible de charger vos paramètres. Veuillez vous reconnecter."
        );
        setChargement(false);
        return;
      }

      const profilConnecte = resultat.contexte.profil as ProfilUtilisateur;
      const entrepriseChargee = resultat.contexte.entreprise as Entreprise;
      const idEntreprise = entrepriseChargee.id;

      if (profilConnecte.role !== "chef") {
        setMessageErreur("Cette page est réservée au chef d’entreprise.");
        setChargement(false);
        return;
      }

      setProfil(profilConnecte);
      setEntreprise(entrepriseChargee);
      setEntrepriseId(idEntreprise);

      await chargerParametres(idEntreprise);
    } catch (error) {
      console.error("Erreur chargement paramètres :", error);
      setMessageErreur("Une erreur est survenue pendant le chargement.");
    } finally {
      setChargement(false);
    }
  }

  async function chargerParametres(idEntreprise = entrepriseId) {
    if (!idEntreprise) return;

    const { data, error } = await supabase
      .from("entreprise_parametres")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .maybeSingle();

    if (error) {
      console.error("Erreur chargement paramètres entreprise :", error);
      setMessageErreur(
        error.message || "Impossible de charger les paramètres entreprise."
      );
      return;
    }

    if (!data) {
      setParametres(null);
      setFormulaire(formulaireDefaut());
      return;
    }

    const donnees = data as EntrepriseParametres;

    setParametres(donnees);

    setFormulaire({
      tva_defaut: nombreVersTexte(donnees.tva_defaut, "20"),
      acompte_defaut: nombreVersTexte(donnees.acompte_defaut, "30"),

      validite_devis_jours: nombreVersTexte(
        donnees.validite_devis_jours,
        "30"
      ),
      delai_paiement_jours: nombreVersTexte(
        donnees.delai_paiement_jours,
        "30"
      ),

      prefixe_devis: valeurTexte(donnees.prefixe_devis, "DEV"),
      prefixe_facture: valeurTexte(donnees.prefixe_facture, "FAC"),

      numerotation_devis_auto: donnees.numerotation_devis_auto ?? true,
      numerotation_factures_auto: donnees.numerotation_factures_auto ?? true,

      conditions_devis: valeurTexte(
        donnees.conditions_devis,
        CONDITIONS_DEVIS_DEFAUT
      ),
      conditions_factures: valeurTexte(
        donnees.conditions_factures,
        CONDITIONS_FACTURES_DEFAUT
      ),
      mention_retard: valeurTexte(
        donnees.mention_retard,
        MENTION_RETARD_DEFAUT
      ),
      footer_documents: valeurTexte(
        donnees.footer_documents,
        FOOTER_DOCUMENTS_DEFAUT
      ),

      afficher_logo_documents: donnees.afficher_logo_documents ?? true,
    });
  }

  function modifierChamp(
    champ: keyof FormulaireParametres,
    valeur: string | boolean
  ) {
    setFormulaire(
      (ancien) =>
        ({
          ...ancien,
          [champ]: valeur,
        } as FormulaireParametres)
    );
  }

  async function enregistrerParametres() {
    if (!entrepriseId) {
      setMessageErreur("Entreprise introuvable. Veuillez vous reconnecter.");
      return;
    }

    try {
      setEnregistrement(true);
      setMessageErreur("");
      setMessageSucces("");

      const payload = {
        entreprise_id: entrepriseId,

        tva_defaut: nombreDepuisTexte(formulaire.tva_defaut, 20),
        acompte_defaut: nombreDepuisTexte(formulaire.acompte_defaut, 30),

        validite_devis_jours: entierDepuisTexte(
          formulaire.validite_devis_jours,
          30
        ),
        delai_paiement_jours: entierDepuisTexte(
          formulaire.delai_paiement_jours,
          30
        ),

        prefixe_devis: nettoyerTexte(formulaire.prefixe_devis) || "DEV",
        prefixe_facture: nettoyerTexte(formulaire.prefixe_facture) || "FAC",

        numerotation_devis_auto: formulaire.numerotation_devis_auto,
        numerotation_factures_auto: formulaire.numerotation_factures_auto,

        conditions_devis: nettoyerTexte(formulaire.conditions_devis),
        conditions_factures: nettoyerTexte(formulaire.conditions_factures),
        mention_retard: nettoyerTexte(formulaire.mention_retard),
        footer_documents: nettoyerTexte(formulaire.footer_documents),

        afficher_logo_documents: formulaire.afficher_logo_documents,
      };

      const { data: parametreExistant, error: erreurRecherche } = await supabase
        .from("entreprise_parametres")
        .select("id, entreprise_id")
        .eq("entreprise_id", entrepriseId)
        .maybeSingle();

      if (erreurRecherche) {
        throw erreurRecherche;
      }

      if (parametreExistant) {
        const { data, error } = await supabase
          .from("entreprise_parametres")
          .update(payload)
          .eq("entreprise_id", entrepriseId)
          .select("*")
          .single();

        if (error) throw error;

        setParametres(data as EntrepriseParametres);
      } else {
        const { data, error } = await supabase
          .from("entreprise_parametres")
          .insert(payload)
          .select("*")
          .single();

        if (error) throw error;

        setParametres(data as EntrepriseParametres);
      }

      setMessageSucces("Paramètres entreprise enregistrés avec succès.");
    } catch (error: any) {
      console.error("Erreur enregistrement paramètres :", error);
      setMessageErreur(
        error?.message || "Impossible d’enregistrer les paramètres."
      );
    } finally {
      setEnregistrement(false);
    }
  }

  function reinitialiserTextes() {
    setFormulaire((ancien) => ({
      ...ancien,
      conditions_devis: CONDITIONS_DEVIS_DEFAUT,
      conditions_factures: CONDITIONS_FACTURES_DEFAUT,
      mention_retard: MENTION_RETARD_DEFAUT,
      footer_documents: FOOTER_DOCUMENTS_DEFAUT,
    }));

    setMessageSucces("Textes par défaut restaurés. Pensez à enregistrer.");
  }

  if (chargement) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-50 text-3xl">
            ⚙️
          </div>
          <p className="text-lg font-bold text-slate-950">
            Chargement des paramètres...
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Récupération des réglages entreprise.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-emerald-700">Arboboard</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">
          Paramètres entreprise
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Configurez les valeurs par défaut utilisées pour vos devis, factures et
          futurs documents PDF.
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
                Réglages financiers
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Ces valeurs serviront de base pour la création des prochains
                devis et factures.
              </p>
            </div>

            <div className="grid gap-5 p-5 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  TVA par défaut
                </label>
                <input
                  value={formulaire.tva_defaut}
                  onChange={(event) =>
                    modifierChamp("tva_defaut", event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  placeholder="20"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Exemple : 20 pour 20 %.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Acompte par défaut
                </label>
                <input
                  value={formulaire.acompte_defaut}
                  onChange={(event) =>
                    modifierChamp("acompte_defaut", event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  placeholder="30"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Exemple : 30 pour 30 % à la signature.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Validité devis
                </label>
                <input
                  value={formulaire.validite_devis_jours}
                  onChange={(event) =>
                    modifierChamp("validite_devis_jours", event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  placeholder="30"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Durée en jours avant expiration du devis.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Délai paiement facture
                </label>
                <input
                  value={formulaire.delai_paiement_jours}
                  onChange={(event) =>
                    modifierChamp("delai_paiement_jours", event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  placeholder="30"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Nombre de jours avant échéance.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-lg font-bold text-slate-950">
                Numérotation documents
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Ces préfixes seront utilisés pour la numérotation propre des
                devis et factures.
              </p>
            </div>

            <div className="grid gap-5 p-5 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Préfixe devis
                </label>
                <input
                  value={formulaire.prefixe_devis}
                  onChange={(event) =>
                    modifierChamp("prefixe_devis", event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm uppercase outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  placeholder="DEV"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Préfixe facture
                </label>
                <input
                  value={formulaire.prefixe_facture}
                  onChange={(event) =>
                    modifierChamp("prefixe_facture", event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm uppercase outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  placeholder="FAC"
                />
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4">
                <input
                  type="checkbox"
                  checked={formulaire.numerotation_devis_auto}
                  onChange={(event) =>
                    modifierChamp(
                      "numerotation_devis_auto",
                      event.target.checked
                    )
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-800">
                    Numérotation devis automatique
                  </span>
                  <span className="text-xs text-slate-500">
                    Exemple futur : {formulaire.prefixe_devis || "DEV"}-2026-0001
                  </span>
                </span>
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4">
                <input
                  type="checkbox"
                  checked={formulaire.numerotation_factures_auto}
                  onChange={(event) =>
                    modifierChamp(
                      "numerotation_factures_auto",
                      event.target.checked
                    )
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-800">
                    Numérotation factures automatique
                  </span>
                  <span className="text-xs text-slate-500">
                    Exemple futur : {formulaire.prefixe_facture || "FAC"}
                    -2026-0001
                  </span>
                </span>
              </label>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Textes par défaut
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Ces textes seront réutilisés dans les PDF devis et factures.
                </p>
              </div>

              <button
                onClick={reinitialiserTextes}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Restaurer textes
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Conditions devis
                </label>
                <textarea
                  value={formulaire.conditions_devis}
                  onChange={(event) =>
                    modifierChamp("conditions_devis", event.target.value)
                  }
                  rows={5}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Conditions factures
                </label>
                <textarea
                  value={formulaire.conditions_factures}
                  onChange={(event) =>
                    modifierChamp("conditions_factures", event.target.value)
                  }
                  rows={5}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Mention retard de paiement
                </label>
                <textarea
                  value={formulaire.mention_retard}
                  onChange={(event) =>
                    modifierChamp("mention_retard", event.target.value)
                  }
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Pied de page documents
                </label>
                <textarea
                  value={formulaire.footer_documents}
                  onChange={(event) =>
                    modifierChamp("footer_documents", event.target.value)
                  }
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4">
                <input
                  type="checkbox"
                  checked={formulaire.afficher_logo_documents}
                  onChange={(event) =>
                    modifierChamp(
                      "afficher_logo_documents",
                      event.target.checked
                    )
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-800">
                    Afficher le logo sur les documents
                  </span>
                  <span className="text-xs text-slate-500">
                    Option préparée pour les futurs PDF.
                  </span>
                </span>
              </label>
            </div>
          </div>

          <button
            onClick={enregistrerParametres}
            disabled={enregistrement}
            className="w-full rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enregistrement
              ? "Enregistrement des paramètres..."
              : "Enregistrer les paramètres entreprise"}
          </button>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-950">Entreprise</h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Nom</span>
                <span className="font-semibold text-slate-950">
                  {entreprise?.nom_entreprise || "—"}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Email</span>
                <span className="font-semibold text-slate-950">
                  {entreprise?.email_contact || "—"}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Téléphone</span>
                <span className="font-semibold text-slate-950">
                  {entreprise?.telephone || "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-950">Résumé paramètres</h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">TVA</span>
                <span className="font-semibold text-slate-950">
                  {formatPourcentage(formulaire.tva_defaut)}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Acompte</span>
                <span className="font-semibold text-slate-950">
                  {formatPourcentage(formulaire.acompte_defaut)}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Validité devis</span>
                <span className="font-semibold text-slate-950">
                  {entierDepuisTexte(formulaire.validite_devis_jours, 30)} jours
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Délai facture</span>
                <span className="font-semibold text-slate-950">
                  {entierDepuisTexte(formulaire.delai_paiement_jours, 30)} jours
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Préfixes</span>
                <span className="font-semibold text-slate-950">
                  {formulaire.prefixe_devis || "DEV"} /{" "}
                  {formulaire.prefixe_facture || "FAC"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="font-bold text-emerald-900">Important</p>
            <p className="mt-2 text-sm text-emerald-800">
              Cette page prépare la génération propre des devis PDF et factures
              PDF. Les paramètres seront utilisés dans les prochaines étapes.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-950">État</h2>
            <p className="mt-2 text-sm text-slate-500">
              {parametres
                ? "Des paramètres existent déjà pour cette entreprise."
                : "Aucun paramètre enregistré pour le moment. Les valeurs par défaut sont affichées."}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Utilisateur : {profil?.email || "—"}
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}