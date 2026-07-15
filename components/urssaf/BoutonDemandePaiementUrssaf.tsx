"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type StatutLocal =
  | "brouillon"
  | "prete"
  | "transmise"
  | "payee"
  | "impayee"
  | "annulee"
  | "erreur";

type LigneDemande = {
  facture_ligne_id: string;
  incluse: boolean;
  designation: string;
  code_nature: string;
  code_activite: string;
  quantite: number;
  unite: "HEURE" | "FORFAIT";
  montant_unitaire_ttc: number;
  montant_prestation_ht: number;
  montant_prestation_tva: number;
  montant_prestation_ttc: number;
  complement1: string;
};

type FormulaireDemande = {
  date_debut_emploi: string;
  date_fin_emploi: string;
  montant_acompte: number;
  date_versement_acompte: string;
  confirmation_prestations: boolean;
  lignes: LigneDemande[];
};

type Demande = {
  id: string;
  urssaf_id_demande_paiement:
    | string
    | null;
  statut_local: StatutLocal;
  statut_urssaf_code: string | null;
  statut_urssaf_libelle: string | null;
  montant_facture_ht: number;
  montant_facture_tva: number;
  montant_facture_ttc: number;
  montant_acompte: number;
  date_versement_acompte:
    | string
    | null;
  info_rejet:
    | Record<string, unknown>
    | null;
  info_virement:
    | Record<string, unknown>
    | null;
  transmis_at: string | null;
  derniere_tentative_at:
    | string
    | null;
  derniere_verification_at:
    | string
    | null;
  dernier_code_http: number | null;
  dernier_message: string | null;
};

type DonneesModal = {
  facture: {
    id: string;
    numero: string | null;
    date_facture: string | null;
    statut: string | null;
    total_ht: number;
    total_tva: number;
    total_ttc: number;
  };
  eligibilite: {
    ok: boolean;
    raisons: string[];
  };
  integration: {
    configuree: boolean;
    active: boolean;
    statut: string | null;
    numero_sap: string | null;
  };
  client_urssaf: {
    configure: boolean;
    actif: boolean;
    urssaf_id_client:
      | string
      | null;
  };
  demande: Demande | null;
  formulaire: FormulaireDemande;
};

type ReponseApi =
  Partial<DonneesModal> & {
    succes?: boolean;
    message?: string;
    erreur?: string;
    raisons?: string[];
  };

type Props = {
  factureId: string;
  numero?: string | null;
  clientType?: string | null;
  statut?: string | null;
  totalHt: number;
  totalTtc: number;
  estAvoir: boolean;
  onMiseAJour?: () => void | Promise<void>;
};

function formatMontant(
  montant: number | null | undefined
) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(Number(montant || 0));
}

function formatDate(
  date: string | null | undefined
) {
  if (!date) return "—";

  try {
    return new Intl.DateTimeFormat(
      "fr-FR",
      {
        dateStyle: "medium",
        timeStyle:
          date.includes("T")
            ? "short"
            : undefined,
      }
    ).format(new Date(date));
  } catch {
    return "—";
  }
}

function libelleStatutLocal(
  statut: StatutLocal
) {
  if (statut === "prete") {
    return "Prête";
  }
  if (statut === "transmise") {
    return "Transmise";
  }
  if (statut === "payee") {
    return "Payée";
  }
  if (statut === "impayee") {
    return "Impayée";
  }
  if (statut === "annulee") {
    return "Annulée";
  }
  if (statut === "erreur") {
    return "Erreur";
  }
  return "Brouillon";
}

function classesStatutLocal(
  statut: StatutLocal
) {
  if (statut === "payee") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (statut === "transmise") {
    return "bg-blue-100 text-blue-700";
  }
  if (statut === "impayee") {
    return "bg-red-100 text-red-700";
  }
  if (statut === "annulee") {
    return "bg-slate-200 text-slate-700";
  }
  if (statut === "erreur") {
    return "bg-red-100 text-red-700";
  }
  return "bg-amber-100 text-amber-700";
}

function lireTexteObjet(
  objet: Record<string, unknown> | null,
  cle: string
) {
  if (!objet) return "";

  const valeur = objet[cle];

  return typeof valeur === "string"
    ? valeur
    : typeof valeur === "number"
      ? String(valeur)
      : "";
}

export default function BoutonDemandePaiementUrssaf({
  factureId,
  numero,
  clientType,
  statut,
  totalHt,
  totalTtc,
  estAvoir,
  onMiseAJour,
}: Props) {
  const [ouvert, setOuvert] =
    useState(false);
  const [chargement, setChargement] =
    useState(false);
  const [action, setAction] =
    useState<
      | "enregistrer"
      | "transmettre"
      | "actualiser"
      | null
    >(null);

  const [donnees, setDonnees] =
    useState<DonneesModal | null>(null);
  const [formulaire, setFormulaire] =
    useState<FormulaireDemande | null>(
      null
    );

  const [erreur, setErreur] =
    useState("");
  const [message, setMessage] =
    useState("");

  const affichable =
    !estAvoir &&
    clientType === "particulier" &&
    ["envoyee", "en_retard"].includes(
      statut || ""
    );

  const totauxSelectionnes =
    useMemo(() => {
      const lignes =
        formulaire?.lignes.filter(
          (ligne) => ligne.incluse
        ) || [];

      return {
        nombre: lignes.length,
        ht: lignes.reduce(
          (total, ligne) =>
            total +
            Number(
              ligne.montant_prestation_ht ||
                0
            ),
          0
        ),
        tva: lignes.reduce(
          (total, ligne) =>
            total +
            Number(
              ligne.montant_prestation_tva ||
                0
            ),
          0
        ),
        ttc: lignes.reduce(
          (total, ligne) =>
            total +
            Number(
              ligne.montant_prestation_ttc ||
                0
            ),
          0
        ),
      };
    }, [formulaire]);

  if (!affichable) return null;

  async function obtenirJeton() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (
      error ||
      !session?.access_token
    ) {
      throw new Error(
        "Votre session a expiré. Veuillez vous reconnecter."
      );
    }

    return session.access_token;
  }

  async function charger() {
    try {
      setChargement(true);
      setErreur("");
      setMessage("");

      const jeton =
        await obtenirJeton();

      const reponse = await fetch(
        `/api/integrations/urssaf/factures/${encodeURIComponent(
          factureId
        )}`,
        {
          headers: {
            Authorization:
              `Bearer ${jeton}`,
          },
          cache: "no-store",
        }
      );

      const resultat =
        await reponse.json() as ReponseApi;

      if (
        !reponse.ok ||
        !resultat.facture ||
        !resultat.eligibilite ||
        !resultat.integration ||
        !resultat.client_urssaf ||
        !resultat.formulaire
      ) {
        throw new Error(
          resultat.erreur ||
            "Impossible de charger la demande de paiement."
        );
      }

      const donneesCompletes:
        DonneesModal = {
        facture: resultat.facture,
        eligibilite:
          resultat.eligibilite,
        integration:
          resultat.integration,
        client_urssaf:
          resultat.client_urssaf,
        demande:
          resultat.demande || null,
        formulaire:
          resultat.formulaire,
      };

      setDonnees(donneesCompletes);
      setFormulaire(
        donneesCompletes.formulaire
      );
    } catch (error) {
      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible de charger la demande de paiement."
      );
    } finally {
      setChargement(false);
    }
  }

  async function ouvrirModal() {
    setOuvert(true);
    await charger();
  }

  function fermerModal() {
    if (action) return;

    setOuvert(false);
    setDonnees(null);
    setFormulaire(null);
    setErreur("");
    setMessage("");
  }

  function modifierFormulaire<
    K extends keyof FormulaireDemande
  >(
    champ: K,
    valeur: FormulaireDemande[K]
  ) {
    setFormulaire((ancien) =>
      ancien
        ? {
            ...ancien,
            [champ]: valeur,
          }
        : ancien
    );
  }

  function modifierLigne(
    index: number,
    modification:
      Partial<LigneDemande>
  ) {
    setFormulaire((ancien) => {
      if (!ancien) return ancien;

      return {
        ...ancien,
        lignes: ancien.lignes.map(
          (ligne, ligneIndex) => {
            if (ligneIndex !== index) {
              return ligne;
            }

            const suivante = {
              ...ligne,
              ...modification,
            };

            if (
              modification.quantite !==
                undefined &&
              modification.quantite > 0
            ) {
              suivante.montant_unitaire_ttc =
                Number(
                  (
                    suivante
                      .montant_prestation_ttc /
                    modification.quantite
                  ).toFixed(3)
                );
            }

            return suivante;
          }
        ),
      };
    });
  }

  async function executer(
    typeAction:
      | "enregistrer"
      | "transmettre"
      | "actualiser"
  ) {
    if (
      !formulaire &&
      typeAction !== "actualiser"
    ) {
      return;
    }

    try {
      setAction(typeAction);
      setErreur("");
      setMessage("");

      const jeton =
        await obtenirJeton();

      const reponse = await fetch(
        `/api/integrations/urssaf/factures/${encodeURIComponent(
          factureId
        )}`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${jeton}`,
          },
          body: JSON.stringify({
            action: typeAction,
            formulaire:
              typeAction ===
              "actualiser"
                ? undefined
                : formulaire,
          }),
        }
      );

      const resultat =
        await reponse.json() as ReponseApi;

      if (!reponse.ok) {
        if (
          resultat.demande &&
          donnees
        ) {
          setDonnees({
            ...donnees,
            demande:
              resultat.demande,
          });
        }

        setErreur(
          resultat.erreur ||
            "Impossible de traiter la demande de paiement."
        );
        return;
      }

      await charger();

      setMessage(
        resultat.message ||
          "La demande a été mise à jour."
      );

      if (onMiseAJour) {
        await onMiseAJour();
      }
    } catch (error) {
      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible de traiter la demande de paiement."
      );
    } finally {
      setAction(null);
    }
  }

  const verrouille =
    Boolean(
      donnees?.demande
        ?.urssaf_id_demande_paiement
    );

  const peutTransmettre =
    Boolean(
      donnees?.eligibilite.ok &&
      donnees.integration.active &&
      donnees.client_urssaf.actif &&
      formulaire
        ?.confirmation_prestations &&
      totauxSelectionnes.nombre > 0 &&
      !verrouille
    );

  return (
    <>
      <button
        type="button"
        onClick={() =>
          void ouvrirModal()
        }
        className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
      >
        Avance immédiate
      </button>

      {ouvert ? (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/50 px-4 py-6">
          <div className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white p-5">
              <div>
                <p className="text-sm font-semibold text-blue-700">
                  Avance immédiate URSSAF
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  Demande de paiement
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Facture{" "}
                  {numero ||
                    "sans numéro"}{" "}
                  —{" "}
                  {formatMontant(
                    totalTtc
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={fermerModal}
                disabled={Boolean(action)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                Fermer
              </button>
            </div>

            {chargement ? (
              <div className="p-10 text-center">
                <p className="font-semibold text-slate-900">
                  Chargement de la demande…
                </p>
              </div>
            ) : (
              <div className="space-y-6 p-5">
                {erreur ? (
                  <div
                    role="alert"
                    className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                  >
                    {erreur}
                  </div>
                ) : null}

                {message ? (
                  <div
                    role="status"
                    className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
                  >
                    {message}
                  </div>
                ) : null}

                {donnees &&
                formulaire ? (
                  <>
                    <section className="grid gap-4 md:grid-cols-3">
                      <Etat
                        label="Connexion API"
                        valeur={
                          donnees.integration
                            .active
                            ? "Validée"
                            : "À configurer"
                        }
                        positif={
                          donnees.integration
                            .active
                        }
                      />

                      <Etat
                        label="Client URSSAF"
                        valeur={
                          donnees.client_urssaf
                            .actif
                            ? "Actif"
                            : "Non autorisé"
                        }
                        positif={
                          donnees.client_urssaf
                            .actif
                        }
                      />

                      <Etat
                        label="Demande"
                        valeur={
                          donnees.demande
                            ? libelleStatutLocal(
                                donnees.demande
                                  .statut_local
                              )
                            : "Non transmise"
                        }
                        positif={
                          donnees.demande
                            ?.statut_local ===
                            "payee"
                        }
                      />
                    </section>

                    {!donnees
                      .eligibilite.ok ? (
                      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <h3 className="font-bold text-amber-950">
                          Facture non transmissible
                        </h3>
                        <ul className="mt-2 space-y-1 text-sm text-amber-800">
                          {donnees.eligibilite.raisons.map(
                            (raison) => (
                              <li key={raison}>
                                • {raison}
                              </li>
                            )
                          )}
                        </ul>
                      </section>
                    ) : null}

                    {donnees.demande ? (
                      <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5">
                        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-bold text-blue-950">
                                Suivi URSSAF
                              </h3>

                              <span
                                className={`rounded-full px-3 py-1 text-xs font-bold ${classesStatutLocal(
                                  donnees.demande
                                    .statut_local
                                )}`}
                              >
                                {libelleStatutLocal(
                                  donnees.demande
                                    .statut_local
                                )}
                              </span>
                            </div>

                            <div className="mt-3 space-y-1 text-sm text-blue-800">
                              <p>
                                Identifiant :{" "}
                                <strong className="break-all font-mono text-blue-950">
                                  {donnees.demande
                                    .urssaf_id_demande_paiement ||
                                    "Non attribué"}
                                </strong>
                              </p>
                              <p>
                                Statut URSSAF :{" "}
                                <strong>
                                  {donnees.demande
                                    .statut_urssaf_libelle ||
                                    donnees.demande
                                      .statut_urssaf_code ||
                                    "Non disponible"}
                                </strong>
                              </p>
                              <p>
                                Dernière vérification :{" "}
                                <strong>
                                  {formatDate(
                                    donnees.demande
                                      .derniere_verification_at
                                  )}
                                </strong>
                              </p>
                            </div>

                            {donnees.demande
                              .dernier_message ? (
                              <p className="mt-3 text-sm leading-6 text-blue-800">
                                {
                                  donnees.demande
                                    .dernier_message
                                }
                              </p>
                            ) : null}
                          </div>

                          {donnees.demande
                            .urssaf_id_demande_paiement ? (
                            <button
                              type="button"
                              onClick={() =>
                                void executer(
                                  "actualiser"
                                )
                              }
                              disabled={Boolean(
                                action
                              )}
                              className="shrink-0 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                            >
                              {action ===
                              "actualiser"
                                ? "Actualisation…"
                                : "Actualiser le statut"}
                            </button>
                          ) : null}
                        </div>

                        {donnees.demande
                          .info_rejet ? (
                          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                            <strong>
                              Rejet :
                            </strong>{" "}
                            {lireTexteObjet(
                              donnees.demande
                                .info_rejet,
                              "code"
                            )}{" "}
                            {lireTexteObjet(
                              donnees.demande
                                .info_rejet,
                              "commentaire"
                            )}
                          </div>
                        ) : null}

                        {donnees.demande
                          .info_virement ? (
                          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                            <strong>
                              Virement :
                            </strong>{" "}
                            {formatMontant(
                              Number(
                                lireTexteObjet(
                                  donnees.demande
                                    .info_virement,
                                  "mntVirement"
                                )
                              )
                            )}{" "}
                            le{" "}
                            {formatDate(
                              lireTexteObjet(
                                donnees.demande
                                  .info_virement,
                                "dateVirement"
                              )
                            )}
                          </div>
                        ) : null}
                      </section>
                    ) : null}

                    <section className="rounded-3xl border border-slate-200 p-5">
                      <h3 className="text-lg font-bold text-slate-950">
                        Période des prestations
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        La date de début et la
                        date de fin doivent être
                        dans le même mois civil
                        et ne peuvent pas être
                        dans le futur.
                      </p>

                      <div className="mt-5 grid gap-4 md:grid-cols-2">
                        <label>
                          <span className="text-sm font-medium text-slate-700">
                            Date de début *
                          </span>
                          <input
                            type="date"
                            value={
                              formulaire
                                .date_debut_emploi
                            }
                            onChange={(event) =>
                              modifierFormulaire(
                                "date_debut_emploi",
                                event.target
                                  .value
                              )
                            }
                            disabled={verrouille}
                            className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                          />
                        </label>

                        <label>
                          <span className="text-sm font-medium text-slate-700">
                            Date de fin *
                          </span>
                          <input
                            type="date"
                            value={
                              formulaire
                                .date_fin_emploi
                            }
                            onChange={(event) =>
                              modifierFormulaire(
                                "date_fin_emploi",
                                event.target
                                  .value
                              )
                            }
                            disabled={verrouille}
                            className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                          />
                        </label>
                      </div>
                    </section>

                    <section className="rounded-3xl border border-slate-200 p-5">
                      <h3 className="text-lg font-bold text-slate-950">
                        Prestations éligibles
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Coche uniquement les
                        lignes réellement
                        éligibles au service à la
                        personne. Le code nature
                        provient du référentiel
                        de ton habilitation
                        URSSAF.
                      </p>

                      <div className="mt-5 space-y-4">
                        {formulaire.lignes.map(
                          (ligne, index) => (
                            <article
                              key={
                                ligne.facture_ligne_id ||
                                index
                              }
                              className={`rounded-2xl border p-4 ${
                                ligne.incluse
                                  ? "border-blue-200 bg-blue-50/40"
                                  : "border-slate-200 bg-slate-50"
                              }`}
                            >
                              <label className="flex cursor-pointer items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={
                                    ligne.incluse
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    modifierLigne(
                                      index,
                                      {
                                        incluse:
                                          event
                                            .target
                                            .checked,
                                      }
                                    )
                                  }
                                  disabled={
                                    verrouille
                                  }
                                  className="mt-1 h-4 w-4 rounded border-slate-300"
                                />

                                <span>
                                  <span className="block font-bold text-slate-950">
                                    {
                                      ligne.designation
                                    }
                                  </span>
                                  <span className="mt-1 block text-xs text-slate-500">
                                    HT{" "}
                                    {formatMontant(
                                      ligne.montant_prestation_ht
                                    )}{" "}
                                    · TVA{" "}
                                    {formatMontant(
                                      ligne.montant_prestation_tva
                                    )}{" "}
                                    · TTC{" "}
                                    {formatMontant(
                                      ligne.montant_prestation_ttc
                                    )}
                                  </span>
                                </span>
                              </label>

                              {ligne.incluse ? (
                                <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                  <label>
                                    <span className="text-xs font-medium text-slate-600">
                                      Code
                                      nature *
                                    </span>
                                    <input
                                      value={
                                        ligne.code_nature
                                      }
                                      onChange={(
                                        event
                                      ) =>
                                        modifierLigne(
                                          index,
                                          {
                                            code_nature:
                                              event.target.value
                                                .replace(
                                                  /\D/g,
                                                  ""
                                                )
                                                .slice(
                                                  0,
                                                  3
                                                ),
                                          }
                                        )
                                      }
                                      disabled={
                                        verrouille
                                      }
                                      inputMode="numeric"
                                      placeholder="Ex : 30"
                                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                                    />
                                  </label>

                                  <label>
                                    <span className="text-xs font-medium text-slate-600">
                                      Code
                                      activité
                                    </span>
                                    <input
                                      value={
                                        ligne.code_activite
                                      }
                                      onChange={(
                                        event
                                      ) =>
                                        modifierLigne(
                                          index,
                                          {
                                            code_activite:
                                              event.target.value
                                                .replace(
                                                  /[^0-9A-Za-z]/g,
                                                  ""
                                                )
                                                .toUpperCase()
                                                .slice(
                                                  0,
                                                  30
                                                ),
                                          }
                                        )
                                      }
                                      disabled={
                                        verrouille
                                      }
                                      placeholder="Facultatif"
                                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                                    />
                                  </label>

                                  <label>
                                    <span className="text-xs font-medium text-slate-600">
                                      Unité *
                                    </span>
                                    <select
                                      value={
                                        ligne.unite
                                      }
                                      onChange={(
                                        event
                                      ) =>
                                        modifierLigne(
                                          index,
                                          {
                                            unite:
                                              event
                                                .target
                                                .value as
                                                | "HEURE"
                                                | "FORFAIT",
                                          }
                                        )
                                      }
                                      disabled={
                                        verrouille
                                      }
                                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                                    >
                                      <option value="HEURE">
                                        HEURE
                                      </option>
                                      <option value="FORFAIT">
                                        FORFAIT
                                      </option>
                                    </select>
                                  </label>

                                  <label>
                                    <span className="text-xs font-medium text-slate-600">
                                      Quantité *
                                    </span>
                                    <input
                                      type="number"
                                      min="0.001"
                                      step="0.001"
                                      value={
                                        ligne.quantite
                                      }
                                      onChange={(
                                        event
                                      ) =>
                                        modifierLigne(
                                          index,
                                          {
                                            quantite:
                                              Math.max(
                                                0,
                                                Number(
                                                  event
                                                    .target
                                                    .value ||
                                                    0
                                                )
                                              ),
                                          }
                                        )
                                      }
                                      disabled={
                                        verrouille
                                      }
                                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                                    />
                                  </label>

                                  <label className="lg:col-span-4">
                                    <span className="text-xs font-medium text-slate-600">
                                      Complément
                                      prestation
                                    </span>
                                    <input
                                      value={
                                        ligne.complement1
                                      }
                                      onChange={(
                                        event
                                      ) =>
                                        modifierLigne(
                                          index,
                                          {
                                            complement1:
                                              event.target.value.slice(
                                                0,
                                                255
                                              ),
                                          }
                                        )
                                      }
                                      disabled={
                                        verrouille
                                      }
                                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                                    />
                                  </label>

                                  <div className="rounded-xl bg-white p-3 text-xs text-slate-600 lg:col-span-4">
                                    Prix
                                    unitaire TTC
                                    calculé :{" "}
                                    <strong className="text-slate-950">
                                      {formatMontant(
                                        ligne.montant_unitaire_ttc
                                      )}
                                    </strong>
                                    {" · "}
                                    Numéro SAP
                                    transmis
                                    automatiquement :{" "}
                                    <strong className="font-mono text-slate-950">
                                      {donnees.integration
                                        .numero_sap ||
                                        "Non configuré"}
                                    </strong>
                                  </div>
                                </div>
                              ) : null}
                            </article>
                          )
                        )}
                      </div>
                    </section>

                    <section className="grid gap-5 lg:grid-cols-2">
                      <div className="rounded-3xl border border-slate-200 p-5">
                        <h3 className="text-lg font-bold text-slate-950">
                          Acompte déjà
                          versé
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          Laisse le montant à
                          zéro lorsqu’aucun
                          acompte n’a été payé
                          avant la demande.
                        </p>

                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                          <label>
                            <span className="text-sm font-medium text-slate-700">
                              Montant
                              acompte
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={
                                formulaire
                                  .montant_acompte
                              }
                              onChange={(
                                event
                              ) =>
                                modifierFormulaire(
                                  "montant_acompte",
                                  Math.max(
                                    0,
                                    Number(
                                      event
                                        .target
                                        .value ||
                                        0
                                    )
                                  )
                                )
                              }
                              disabled={
                                verrouille
                              }
                              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                            />
                          </label>

                          <label>
                            <span className="text-sm font-medium text-slate-700">
                              Date de
                              versement
                            </span>
                            <input
                              type="date"
                              value={
                                formulaire
                                  .date_versement_acompte
                              }
                              onChange={(
                                event
                              ) =>
                                modifierFormulaire(
                                  "date_versement_acompte",
                                  event.target
                                    .value
                                )
                              }
                              disabled={
                                verrouille ||
                                formulaire
                                  .montant_acompte <=
                                  0
                              }
                              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                            />
                          </label>
                        </div>
                      </div>

                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                        <h3 className="text-lg font-bold text-slate-950">
                          Montants transmis
                        </h3>

                        <div className="mt-4 space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-500">
                              Prestations
                            </span>
                            <strong>
                              {
                                totauxSelectionnes.nombre
                              }
                            </strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">
                              Total HT
                            </span>
                            <strong>
                              {formatMontant(
                                totauxSelectionnes.ht
                              )}
                            </strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">
                              TVA
                            </span>
                            <strong>
                              {formatMontant(
                                totauxSelectionnes.tva
                              )}
                            </strong>
                          </div>
                          <div className="flex justify-between border-t border-slate-200 pt-3 text-lg">
                            <span className="font-black text-slate-950">
                              Total TTC
                            </span>
                            <strong className="text-blue-700">
                              {formatMontant(
                                totauxSelectionnes.ttc
                              )}
                            </strong>
                          </div>
                        </div>

                        {Math.abs(
                          totauxSelectionnes.ttc -
                            totalTtc
                        ) > 0.05 ? (
                          <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                            Le montant URSSAF
                            sélectionné diffère du
                            total de la facture
                            ({formatMontant(
                              totalTtc
                            )}). Vérifie que les
                            lignes exclues ne sont
                            réellement pas
                            éligibles.
                          </p>
                        ) : null}

                        <p className="mt-3 text-xs text-slate-500">
                          Total original HT :{" "}
                          {formatMontant(
                            totalHt
                          )}
                        </p>
                      </div>
                    </section>

                    {!verrouille ? (
                      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
                        <label className="flex cursor-pointer items-start gap-3">
                          <input
                            type="checkbox"
                            checked={
                              formulaire
                                .confirmation_prestations
                            }
                            onChange={(
                              event
                            ) =>
                              modifierFormulaire(
                                "confirmation_prestations",
                                event.target
                                  .checked
                              )
                            }
                            className="mt-1 h-4 w-4 rounded border-amber-300"
                          />

                          <span>
                            <span className="block font-bold text-amber-950">
                              Confirmation
                              avant transmission
                            </span>
                            <span className="mt-1 block text-sm leading-6 text-amber-800">
                              Je confirme que les
                              prestations
                              sélectionnées ont
                              réellement été
                              réalisées, sont
                              éligibles au service
                              à la personne et que
                              les dates et montants
                              correspondent à la
                              facture.
                            </span>
                          </span>
                        </label>
                      </section>
                    ) : null}

                    <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:flex-wrap sm:justify-end">
                      {!verrouille ? (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              void executer(
                                "enregistrer"
                              )
                            }
                            disabled={Boolean(
                              action
                            )}
                            className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          >
                            {action ===
                            "enregistrer"
                              ? "Enregistrement…"
                              : "Enregistrer sans transmettre"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void executer(
                                "transmettre"
                              )
                            }
                            disabled={
                              Boolean(
                                action
                              ) ||
                              !peutTransmettre
                            }
                            className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {action ===
                            "transmettre"
                              ? "Transmission à l’Urssaf…"
                              : "Envoyer à l’URSSAF"}
                          </button>
                        </>
                      ) : (
                        <p className="text-sm font-medium text-slate-600">
                          La demande a déjà été
                          transmise. Les données
                          sont désormais
                          verrouillées.
                        </p>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

function Etat({
  label,
  valeur,
  positif,
}: {
  label: string;
  valeur: string;
  positif: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p
        className={`mt-2 text-sm font-bold ${
          positif
            ? "text-emerald-700"
            : "text-amber-700"
        }`}
      >
        {valeur}
      </p>
    </div>
  );
}