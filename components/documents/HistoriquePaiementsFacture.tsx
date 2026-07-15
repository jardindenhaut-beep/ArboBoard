"use client";

import {
  useState,
} from "react";
import { supabase } from "@/lib/supabaseClient";

type Paiement = {
  id: string;
  entreprise_id: string | null;
  facture_id: string | null;
  montant: number | null;
  mode_paiement: string | null;
  reference_paiement: string | null;
  note: string | null;
  date_paiement: string | null;
  enregistre_par: string | null;
  source_paiement:
    | "manuel"
    | "urssaf"
    | null;
  demande_paiement_urssaf_id:
    | string
    | null;
  rapprochement_urssaf_at:
    | string
    | null;
  created_at: string | null;
};

type Props = {
  factureId: string;
  numero?: string | null;
  onPaiementSupprime?:
    () => void | Promise<void>;
};

function formatMontant(
  montant: number | null | undefined
) {
  return new Intl.NumberFormat(
    "fr-FR",
    {
      style: "currency",
      currency: "EUR",
    }
  ).format(Number(montant || 0));
}

function formatDate(
  date: string | null | undefined
) {
  if (!date) return "—";

  try {
    return new Intl.DateTimeFormat(
      "fr-FR",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    ).format(
      new Date(
        `${date.slice(
          0,
          10
        )}T00:00:00`
      )
    );
  } catch {
    return "—";
  }
}

function formatDateHeure(
  date: string | null | undefined
) {
  if (!date) return "—";

  try {
    return new Intl.DateTimeFormat(
      "fr-FR",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    ).format(new Date(date));
  } catch {
    return "—";
  }
}

function libelleModePaiement(
  mode: string | null | undefined
) {
  if (
    mode === "virement_urssaf"
  ) {
    return "Virement URSSAF";
  }
  if (mode === "virement") {
    return "Virement";
  }
  if (mode === "cheque") {
    return "Chèque";
  }
  if (mode === "especes") {
    return "Espèces";
  }
  if (
    mode === "carte_bancaire"
  ) {
    return "Carte bancaire";
  }
  if (mode === "prelevement") {
    return "Prélèvement";
  }
  if (mode === "autre") {
    return "Autre";
  }
  return "Non renseigné";
}

export default function HistoriquePaiementsFacture({
  factureId,
  numero,
  onPaiementSupprime,
}: Props) {
  const [
    modalOuverte,
    setModalOuverte,
  ] = useState(false);

  const [
    chargement,
    setChargement,
  ] = useState(false);

  const [
    suppressionId,
    setSuppressionId,
  ] =
    useState<string | null>(null);

  const [
    paiements,
    setPaiements,
  ] = useState<Paiement[]>([]);

  const [
    messageErreur,
    setMessageErreur,
  ] = useState("");

  const [
    messageSucces,
    setMessageSucces,
  ] = useState("");

  async function ouvrirHistorique() {
    setModalOuverte(true);
    await chargerPaiements();
  }

  function fermerHistorique() {
    if (
      chargement ||
      suppressionId
    ) {
      return;
    }

    setModalOuverte(false);
  }

  async function chargerPaiements() {
    try {
      setChargement(true);
      setMessageErreur("");
      setMessageSucces("");

      if (!factureId) {
        setMessageErreur(
          "Identifiant de facture manquant."
        );
        return;
      }

      const {
        data,
        error,
      } = await supabase
        .from("factures_paiements")
        .select(
          "id, entreprise_id, facture_id, montant, mode_paiement, reference_paiement, note, date_paiement, enregistre_par, source_paiement, demande_paiement_urssaf_id, rapprochement_urssaf_at, created_at"
        )
        .eq(
          "facture_id",
          factureId
        )
        .order(
          "date_paiement",
          { ascending: false }
        )
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      setPaiements(
        (data || []) as Paiement[]
      );
    } catch (error) {
      setMessageErreur(
        error instanceof Error
          ? error.message
          : "Impossible de charger l’historique des paiements."
      );
    } finally {
      setChargement(false);
    }
  }

  async function supprimerPaiement(
    paiement: Paiement
  ) {
    const origineUrssaf =
      paiement.source_paiement ===
        "urssaf" ||
      paiement.mode_paiement ===
        "virement_urssaf";

    const confirmation =
      window.confirm(
        origineUrssaf
          ? "Voulez-vous vraiment supprimer ce rapprochement URSSAF ? La facture sera recalculée et le virement pourra ensuite être rapproché à nouveau."
          : "Voulez-vous vraiment supprimer ce paiement ? La facture sera recalculée automatiquement."
      );

    if (!confirmation) return;

    try {
      setSuppressionId(
        paiement.id
      );
      setMessageErreur("");
      setMessageSucces("");

      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (
        !session?.access_token
      ) {
        setMessageErreur(
          "Session expirée. Veuillez vous reconnecter."
        );
        return;
      }

      const response = await fetch(
        "/api/factures/supprimer-paiement",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            paiementId:
              paiement.id,
            paiement_id:
              paiement.id,
            factureId,
            facture_id:
              factureId,
          }),
        }
      );

      const resultat =
        await response.json()
          .catch(
            () => null
          ) as
          | {
              success?: boolean;
              error?: string;
              message?: string;
            }
          | null;

      if (
        !response.ok ||
        !resultat?.success
      ) {
        setMessageErreur(
          resultat?.error ||
            "Impossible de supprimer ce paiement."
        );
        return;
      }

      setMessageSucces(
        resultat.message ||
          "Paiement supprimé avec succès."
      );

      await chargerPaiements();

      if (onPaiementSupprime) {
        await onPaiementSupprime();
      }
    } catch (error) {
      setMessageErreur(
        error instanceof Error
          ? error.message
          : "Impossible de supprimer ce paiement."
      );
    } finally {
      setSuppressionId(null);
    }
  }

  const totalPaiements =
    paiements.reduce(
      (total, paiement) =>
        total +
        Number(
          paiement.montant || 0
        ),
      0
    );

  return (
    <>
      <button
        type="button"
        onClick={() =>
          void ouvrirHistorique()
        }
        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
      >
        Paiements
      </button>

      {modalOuverte && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/40 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Historique des paiements
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {numero
                    ? `Facture ${numero}`
                    : "Facture sans numéro"}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  fermerHistorique
                }
                disabled={
                  chargement ||
                  Boolean(
                    suppressionId
                  )
                }
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Fermer
              </button>
            </div>

            <div className="p-5">
              {messageErreur && (
                <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {messageErreur}
                </div>
              )}

              {messageSucces && (
                <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {messageSucces}
                </div>
              )}

              <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                  Total encaissé
                </p>

                <p className="mt-1 text-2xl font-black text-emerald-700">
                  {formatMontant(
                    totalPaiements
                  )}
                </p>
              </div>

              {chargement ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
                  <p className="font-semibold text-slate-900">
                    Chargement des paiements...
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Récupération de l’historique en cours.
                  </p>
                </div>
              ) : paiements.length ===
                0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl">
                    💶
                  </div>

                  <p className="font-semibold text-slate-900">
                    Aucun paiement enregistré
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Les encaissements apparaîtront ici.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {paiements.map(
                    (paiement) => {
                      const suppressionEnCours =
                        suppressionId ===
                        paiement.id;

                      const origineUrssaf =
                        paiement.source_paiement ===
                          "urssaf" ||
                        paiement.mode_paiement ===
                          "virement_urssaf";

                      return (
                        <div
                          key={
                            paiement.id
                          }
                          className={`rounded-2xl border p-4 ${
                            origineUrssaf
                              ? "border-blue-200 bg-blue-50/40"
                              : "border-slate-200 bg-white"
                          }`}
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                                  {formatMontant(
                                    paiement.montant
                                  )}
                                </span>

                                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">
                                  {libelleModePaiement(
                                    paiement.mode_paiement
                                  )}
                                </span>

                                {origineUrssaf ? (
                                  <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                                    Origine URSSAF
                                  </span>
                                ) : null}
                              </div>

                              <p className="mt-3 text-sm text-slate-600">
                                Date du paiement :{" "}
                                <span className="font-semibold text-slate-950">
                                  {formatDate(
                                    paiement.date_paiement
                                  )}
                                </span>
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                Enregistré le :{" "}
                                {formatDateHeure(
                                  paiement.created_at
                                )}
                              </p>

                              {origineUrssaf &&
                              paiement.rapprochement_urssaf_at ? (
                                <p className="mt-1 text-xs text-blue-700">
                                  Rapproché le :{" "}
                                  {formatDateHeure(
                                    paiement.rapprochement_urssaf_at
                                  )}
                                </p>
                              ) : null}
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                void supprimerPaiement(
                                  paiement
                                )
                              }
                              disabled={Boolean(
                                suppressionId
                              )}
                              className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {suppressionEnCours
                                ? "Suppression..."
                                : origineUrssaf
                                  ? "Supprimer le rapprochement"
                                  : "Supprimer"}
                            </button>
                          </div>

                          {paiement.reference_paiement && (
                            <div className="mt-3 rounded-xl bg-white p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                {origineUrssaf
                                  ? "Référence de la demande URSSAF"
                                  : "Référence"}
                              </p>

                              <p className="mt-1 break-all font-mono text-sm text-slate-700">
                                {
                                  paiement.reference_paiement
                                }
                              </p>
                            </div>
                          )}

                          {paiement.note && (
                            <div className="mt-3 rounded-xl bg-white p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Note
                              </p>

                              <p className="mt-1 whitespace-pre-line text-sm text-slate-700">
                                {
                                  paiement.note
                                }
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-200 p-5">
              <button
                type="button"
                onClick={() =>
                  void chargerPaiements()
                }
                disabled={
                  chargement ||
                  Boolean(
                    suppressionId
                  )
                }
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {chargement
                  ? "Actualisation..."
                  : "Actualiser"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}