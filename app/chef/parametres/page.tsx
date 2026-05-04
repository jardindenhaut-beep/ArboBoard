"use client";

import { useEffect, useState } from "react";
import { chargerContexteEntreprise } from "@/lib/entreprise";
import { supabase } from "@/lib/supabaseClient";

type Entreprise = {
  id: string;
  nom_entreprise?: string | null;
  slug?: string | null;
};

type ProfilUtilisateur = {
  id: string;
  role?: string | null;
  statut?: string | null;
  entreprise_id?: string | null;
};

type EntrepriseParametres = {
  id?: string | number | null;
  entreprise_id?: string | null;

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

  email_objet_devis?: string | null;
  email_message_devis?: string | null;
  email_objet_facture?: string | null;
  email_message_facture?: string | null;
  email_copie_entreprise?: boolean | null;
  email_copie_adresse?: string | null;
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

  email_objet_devis: string;
  email_message_devis: string;
  email_objet_facture: string;
  email_message_facture: string;
  email_copie_entreprise: boolean;
  email_copie_adresse: string;
};

const CONDITIONS_DEVIS_DEFAUT =
  "Devis valable pendant la durée indiquée. Acompte de 30 % à la signature sauf indication contraire. Les travaux seront réalisés selon les conditions précisées dans le devis.";

const CONDITIONS_FACTURES_DEFAUT =
  "Paiement à réception de facture sauf indication contraire. Aucun escompte ne sera accordé pour paiement anticipé.";

const MENTION_RETARD_DEFAUT =
  "En cas de retard de paiement, des pénalités pourront être appliquées, ainsi qu’une indemnité forfaitaire de recouvrement de 40 € pour les professionnels.";

const FOOTER_DOCUMENTS_DEFAUT = "Merci pour votre confiance.";

const EMAIL_OBJET_DEVIS_DEFAUT = "Votre devis {numero} - {entreprise}";

const EMAIL_MESSAGE_DEVIS_DEFAUT = `Bonjour,

Veuillez trouver ci-dessous votre devis {numero}.

Nous restons disponibles pour toute question ou précision.

Cordialement,
{entreprise}`;

const EMAIL_OBJET_FACTURE_DEFAUT = "Votre facture {numero} - {entreprise}";

const EMAIL_MESSAGE_FACTURE_DEFAUT = `Bonjour,

Veuillez trouver ci-dessous votre facture {numero}.

Nous vous remercions pour votre confiance.

Cordialement,
{entreprise}`;

function valeurTexte(valeur: string | null | undefined, defaut = "") {
  const texte = String(valeur || "").trim();
  return texte.length > 0 ? texte : defaut;
}

function valeurNombreTexte(
  valeur: number | string | null | undefined,
  defaut: string
) {
  if (valeur === null || valeur === undefined || valeur === "") return defaut;
  return String(valeur);
}

function nombreDepuisTexte(valeur: string, defaut: number) {
  const nombre = Number.parseFloat(
    String(valeur || "")
      .replace(",", ".")
      .replace(/\s/g, "")
  );

  return Number.isFinite(nombre) ? nombre : defaut;
}

function entierDepuisTexte(valeur: string, defaut: number) {
  const nombre = Number.parseInt(
    String(valeur || "")
      .replace(/\s/g, "")
      .trim(),
    10
  );

  return Number.isFinite(nombre) ? nombre : defaut;
}

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

    email_objet_devis: EMAIL_OBJET_DEVIS_DEFAUT,
    email_message_devis: EMAIL_MESSAGE_DEVIS_DEFAUT,
    email_objet_facture: EMAIL_OBJET_FACTURE_DEFAUT,
    email_message_facture: EMAIL_MESSAGE_FACTURE_DEFAUT,
    email_copie_entreprise: false,
    email_copie_adresse: "",
  };
}

function formulaireDepuisParametres(
  parametres: EntrepriseParametres | null
): FormulaireParametres {
  const defaut = formulaireDefaut();

  if (!parametres) return defaut;

  return {
    tva_defaut: valeurNombreTexte(parametres.tva_defaut, defaut.tva_defaut),
    acompte_defaut: valeurNombreTexte(
      parametres.acompte_defaut,
      defaut.acompte_defaut
    ),
    validite_devis_jours: valeurNombreTexte(
      parametres.validite_devis_jours,
      defaut.validite_devis_jours
    ),
    delai_paiement_jours: valeurNombreTexte(
      parametres.delai_paiement_jours,
      defaut.delai_paiement_jours
    ),

    prefixe_devis: valeurTexte(parametres.prefixe_devis, defaut.prefixe_devis),
    prefixe_facture: valeurTexte(
      parametres.prefixe_facture,
      defaut.prefixe_facture
    ),

    numerotation_devis_auto:
      parametres.numerotation_devis_auto === null ||
      parametres.numerotation_devis_auto === undefined
        ? defaut.numerotation_devis_auto
        : Boolean(parametres.numerotation_devis_auto),

    numerotation_factures_auto:
      parametres.numerotation_factures_auto === null ||
      parametres.numerotation_factures_auto === undefined
        ? defaut.numerotation_factures_auto
        : Boolean(parametres.numerotation_factures_auto),

    conditions_devis: valeurTexte(
      parametres.conditions_devis,
      defaut.conditions_devis
    ),
    conditions_factures: valeurTexte(
      parametres.conditions_factures,
      defaut.conditions_factures
    ),
    mention_retard: valeurTexte(
      parametres.mention_retard,
      defaut.mention_retard
    ),
    footer_documents: valeurTexte(
      parametres.footer_documents,
      defaut.footer_documents
    ),
    afficher_logo_documents:
      parametres.afficher_logo_documents === null ||
      parametres.afficher_logo_documents === undefined
        ? defaut.afficher_logo_documents
        : Boolean(parametres.afficher_logo_documents),

    email_objet_devis: valeurTexte(
      parametres.email_objet_devis,
      defaut.email_objet_devis
    ),
    email_message_devis: valeurTexte(
      parametres.email_message_devis,
      defaut.email_message_devis
    ),
    email_objet_facture: valeurTexte(
      parametres.email_objet_facture,
      defaut.email_objet_facture
    ),
    email_message_facture: valeurTexte(
      parametres.email_message_facture,
      defaut.email_message_facture
    ),
    email_copie_entreprise:
      parametres.email_copie_entreprise === null ||
      parametres.email_copie_entreprise === undefined
        ? defaut.email_copie_entreprise
        : Boolean(parametres.email_copie_entreprise),
    email_copie_adresse: valeurTexte(parametres.email_copie_adresse, ""),
  };
}

function construirePayload(formulaire: FormulaireParametres) {
  return {
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

    prefixe_devis: valeurTexte(formulaire.prefixe_devis, "DEV"),
    prefixe_facture: valeurTexte(formulaire.prefixe_facture, "FAC"),

    numerotation_devis_auto: formulaire.numerotation_devis_auto,
    numerotation_factures_auto: formulaire.numerotation_factures_auto,

    conditions_devis: formulaire.conditions_devis.trim(),
    conditions_factures: formulaire.conditions_factures.trim(),
    mention_retard: formulaire.mention_retard.trim(),
    footer_documents: formulaire.footer_documents.trim(),
    afficher_logo_documents: formulaire.afficher_logo_documents,

    email_objet_devis: formulaire.email_objet_devis.trim(),
    email_message_devis: formulaire.email_message_devis.trim(),
    email_objet_facture: formulaire.email_objet_facture.trim(),
    email_message_facture: formulaire.email_message_facture.trim(),
    email_copie_entreprise: formulaire.email_copie_entreprise,
    email_copie_adresse: formulaire.email_copie_adresse.trim() || null,
  };
}

function BlocAideVariables() {
  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
      <p className="font-bold">Variables disponibles dans les emails</p>
      <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
        <p>
          <span className="font-semibold">{"{numero}"}</span> : numéro du
          document
        </p>
        <p>
          <span className="font-semibold">{"{entreprise}"}</span> : nom de
          l’entreprise
        </p>
        <p>
          <span className="font-semibold">{"{client}"}</span> : nom du client
        </p>
        <p>
          <span className="font-semibold">{"{objet}"}</span> : objet du document
        </p>
        <p>
          <span className="font-semibold">{"{total_ttc}"}</span> : total TTC
        </p>
        <p>
          <span className="font-semibold">{"{date}"}</span> : date du document
        </p>
        <p>
          <span className="font-semibold">{"{validite}"}</span> : validité du
          devis
        </p>
        <p>
          <span className="font-semibold">{"{echeance}"}</span> : échéance de
          facture
        </p>
      </div>
    </div>
  );
}

export default function ParametresChefPage() {
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null);
  const [profil, setProfil] = useState<ProfilUtilisateur | null>(null);
  const [parametresExistants, setParametresExistants] =
    useState<EntrepriseParametres | null>(null);

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
          "Impossible de charger les paramètres. Veuillez vous reconnecter."
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

      const { data, error } = await supabase
        .from("entreprise_parametres")
        .select("*")
        .eq("entreprise_id", entrepriseChargee.id)
        .maybeSingle();

      if (error) throw error;

      const parametres = (data || null) as EntrepriseParametres | null;

      setParametresExistants(parametres);
      setFormulaire(formulaireDepuisParametres(parametres));
    } catch (error: any) {
      console.error("Erreur chargement paramètres :", error);
      setMessageErreur(
        error?.message || "Impossible de charger les paramètres."
      );
    } finally {
      setChargement(false);
    }
  }

  function modifierChamp<K extends keyof FormulaireParametres>(
    champ: K,
    valeur: FormulaireParametres[K]
  ) {
    setFormulaire((ancien) => ({
      ...ancien,
      [champ]: valeur,
    }));
  }

  async function enregistrerParametres() {
    if (!entreprise?.id || !profil?.id) {
      setMessageErreur("Entreprise introuvable. Veuillez vous reconnecter.");
      return;
    }

    try {
      setEnregistrement(true);
      setMessageErreur("");
      setMessageSucces("");

      const payload = {
        entreprise_id: entreprise.id,
        ...construirePayload(formulaire),
      };

      if (parametresExistants?.entreprise_id) {
        const { data, error } = await supabase
          .from("entreprise_parametres")
          .update(payload)
          .eq("entreprise_id", entreprise.id)
          .select("*")
          .maybeSingle();

        if (error) throw error;

        setParametresExistants((data || payload) as EntrepriseParametres);
      } else {
        const { data, error } = await supabase
          .from("entreprise_parametres")
          .insert(payload)
          .select("*")
          .maybeSingle();

        if (error) throw error;

        setParametresExistants((data || payload) as EntrepriseParametres);
      }

      setMessageSucces("Paramètres enregistrés avec succès.");
    } catch (error: any) {
      console.error("Erreur enregistrement paramètres :", error);
      setMessageErreur(
        error?.message || "Impossible d’enregistrer les paramètres."
      );
    } finally {
      setEnregistrement(false);
    }
  }

  function restaurerDocuments() {
    setFormulaire((ancien) => ({
      ...ancien,
      conditions_devis: CONDITIONS_DEVIS_DEFAUT,
      conditions_factures: CONDITIONS_FACTURES_DEFAUT,
      mention_retard: MENTION_RETARD_DEFAUT,
      footer_documents: FOOTER_DOCUMENTS_DEFAUT,
    }));

    setMessageSucces(
      "Textes documents restaurés. Pensez à enregistrer les paramètres."
    );
  }

  function restaurerEmails() {
    setFormulaire((ancien) => ({
      ...ancien,
      email_objet_devis: EMAIL_OBJET_DEVIS_DEFAUT,
      email_message_devis: EMAIL_MESSAGE_DEVIS_DEFAUT,
      email_objet_facture: EMAIL_OBJET_FACTURE_DEFAUT,
      email_message_facture: EMAIL_MESSAGE_FACTURE_DEFAUT,
    }));

    setMessageSucces(
      "Modèles email restaurés. Pensez à enregistrer les paramètres."
    );
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
            Récupération de la configuration entreprise.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-emerald-700">Arboboard</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">Paramètres</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Configurez les réglages utilisés pour vos devis, factures, documents
          PDF et emails clients.
        </p>

        {entreprise?.nom_entreprise && (
          <p className="mt-3 text-sm font-semibold text-slate-800">
            Entreprise : {entreprise.nom_entreprise}
          </p>
        )}
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

      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-lg font-bold text-slate-950">
                Réglages généraux
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Valeurs par défaut utilisées lors de la création des documents.
              </p>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  TVA par défaut %
                </label>
                <input
                  value={formulaire.tva_defaut}
                  onChange={(event) =>
                    modifierChamp("tva_defaut", event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  placeholder="20"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Acompte par défaut %
                </label>
                <input
                  value={formulaire.acompte_defaut}
                  onChange={(event) =>
                    modifierChamp("acompte_defaut", event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  placeholder="30"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Validité devis jours
                </label>
                <input
                  value={formulaire.validite_devis_jours}
                  onChange={(event) =>
                    modifierChamp("validite_devis_jours", event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  placeholder="30"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Paiement facture jours
                </label>
                <input
                  value={formulaire.delai_paiement_jours}
                  onChange={(event) =>
                    modifierChamp("delai_paiement_jours", event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  placeholder="30"
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-lg font-bold text-slate-950">
                Numérotation
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Préfixes et génération automatique des numéros.
              </p>
            </div>

            <div className="space-y-5 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Préfixe devis
                  </label>
                  <input
                    value={formulaire.prefixe_devis}
                    onChange={(event) =>
                      modifierChamp("prefixe_devis", event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
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
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    placeholder="FAC"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={formulaire.numerotation_devis_auto}
                    onChange={(event) =>
                      modifierChamp(
                        "numerotation_devis_auto",
                        event.target.checked
                      )
                    }
                    className="mt-1 h-4 w-4"
                  />
                  <span>
                    <span className="block font-semibold text-slate-950">
                      Numérotation devis automatique
                    </span>
                    <span className="mt-1 block text-sm text-slate-500">
                      Génère un numéro à chaque nouveau devis.
                    </span>
                  </span>
                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={formulaire.numerotation_factures_auto}
                    onChange={(event) =>
                      modifierChamp(
                        "numerotation_factures_auto",
                        event.target.checked
                      )
                    }
                    className="mt-1 h-4 w-4"
                  />
                  <span>
                    <span className="block font-semibold text-slate-950">
                      Numérotation factures automatique
                    </span>
                    <span className="mt-1 block text-sm text-slate-500">
                      Génère un numéro à chaque nouvelle facture.
                    </span>
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Textes documents PDF
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Conditions et mentions affichées dans les devis et factures.
                </p>
              </div>

              <button
                type="button"
                onClick={restaurerDocuments}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Restaurer
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
                  rows={4}
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
                  rows={4}
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
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Footer documents
                </label>
                <input
                  value={formulaire.footer_documents}
                  onChange={(event) =>
                    modifierChamp("footer_documents", event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={formulaire.afficher_logo_documents}
                  onChange={(event) =>
                    modifierChamp(
                      "afficher_logo_documents",
                      event.target.checked
                    )
                  }
                  className="mt-1 h-4 w-4"
                />
                <span>
                  <span className="block font-semibold text-slate-950">
                    Afficher l’icône/logo dans les documents
                  </span>
                  <span className="mt-1 block text-sm text-slate-500">
                    Affiche l’icône verte dans les PDF devis et factures.
                  </span>
                </span>
              </label>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Emails documents
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Modèles utilisés lors de l’envoi des devis et factures par
                  email.
                </p>
              </div>

              <button
                type="button"
                onClick={restaurerEmails}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Restaurer
              </button>
            </div>

            <div className="space-y-5 p-5">
              <BlocAideVariables />

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Objet email devis
                </label>
                <input
                  value={formulaire.email_objet_devis}
                  onChange={(event) =>
                    modifierChamp("email_objet_devis", event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Message email devis
                </label>
                <textarea
                  value={formulaire.email_message_devis}
                  onChange={(event) =>
                    modifierChamp("email_message_devis", event.target.value)
                  }
                  rows={7}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Objet email facture
                </label>
                <input
                  value={formulaire.email_objet_facture}
                  onChange={(event) =>
                    modifierChamp("email_objet_facture", event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Message email facture
                </label>
                <textarea
                  value={formulaire.email_message_facture}
                  onChange={(event) =>
                    modifierChamp("email_message_facture", event.target.value)
                  }
                  rows={7}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={formulaire.email_copie_entreprise}
                  onChange={(event) =>
                    modifierChamp(
                      "email_copie_entreprise",
                      event.target.checked
                    )
                  }
                  className="mt-1 h-4 w-4"
                />
                <span>
                  <span className="block font-semibold text-slate-950">
                    Envoyer une copie à l’entreprise
                  </span>
                  <span className="mt-1 block text-sm text-slate-500">
                    Envoie une copie des devis/factures envoyés à l’adresse
                    ci-dessous.
                  </span>
                </span>
              </label>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Email de copie
                </label>
                <input
                  value={formulaire.email_copie_adresse}
                  onChange={(event) =>
                    modifierChamp("email_copie_adresse", event.target.value)
                  }
                  placeholder="contact@entreprise.fr"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="sticky top-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-950">Enregistrement</h2>
            <p className="mt-2 text-sm text-slate-500">
              Après modification, clique sur le bouton ci-dessous pour appliquer
              les changements.
            </p>

            <button
              type="button"
              onClick={enregistrerParametres}
              disabled={enregistrement}
              className="mt-5 w-full rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {enregistrement ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>

          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="font-bold text-emerald-900">Conseil</p>
            <p className="mt-2 text-sm text-emerald-800">
              Les modèles email peuvent utiliser les variables affichées dans la
              section Emails documents. Elles seront remplacées automatiquement
              lors de l’envoi au client.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}