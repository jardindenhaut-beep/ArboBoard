"use client";

import {
  useEffect,
  useState,
} from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  factureId: string;
  numero?: string | null;
  totalTtc?: number | null;
  montantPaye?: number | null;
  resteAPayer?: number | null;
  onPaiementEnregistre?:
    () => void | Promise<void>;
};

type RapprochementUrssaf = {
  existe: boolean;
  disponible: boolean;
  deja_rapproche: boolean;
  demande_id?: string | null;
  id_demande_paiement?: string | null;
  statut_local?: string | null;
  statut_urssaf_code?: string | null;
  statut_urssaf_libelle?: string | null;
  montant_virement?: number;
  date_virement?: string | null;
  message?: string | null;
};

type ReponseRapprochement = {
  success?: boolean;
  error?: string;
  urssaf?: RapprochementUrssaf;
};

function dateAujourdhui() {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

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
        dateStyle: "medium",
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

export default function BoutonEncaisserFacture({
  factureId,
  numero,
  totalTtc,
  montantPaye,
  resteAPayer,
  onPaiementEnregistre,
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
    chargementUrssaf,
    setChargementUrssaf,
  ] = useState(false);

  const [
    modeUrssafActif,
    setModeUrssafActif,
  ] = useState(false);

  const [
    rapprochementUrssaf,
    setRapprochementUrssaf,
  ] =
    useState<RapprochementUrssaf | null>(
      null
    );

  const [
    montant,
    setMontant,
  ] = useState(
    String(
      Number(resteAPayer || 0)
    )
  );

  const [
    modePaiement,
    setModePaiement,
  ] = useState("virement");

  const [
    referencePaiement,
    setReferencePaiement,
  ] = useState("");

  const [
    datePaiement,
    setDatePaiement,
  ] = useState(dateAujourdhui());

  const [
    note,
    setNote,
  ] = useState("");

  const [
    messageErreur,
    setMessageErreur,
  ] = useState("");

  const [
    messageSucces,
    setMessageSucces,
  ] = useState("");

  useEffect(() => {
    if (
      modalOuverte &&
      !modeUrssafActif
    ) {
      setMontant(
        String(
          Number(resteAPayer || 0)
        )
      );
    }
  }, [
    resteAPayer,
    modalOuverte,
    modeUrssafActif,
  ]);

  async function obtenirJeton() {
    const {
      data: { session },
      error,
    } =
      await supabase.auth.getSession();

    if (
      error ||
      !session?.access_token
    ) {
      throw new Error(
        "Session expirée. Veuillez vous reconnecter."
      );
    }

    return session.access_token;
  }

  async function chargerRapprochementUrssaf() {
    try {
      setChargementUrssaf(true);

      const jeton =
        await obtenirJeton();

      const response = await fetch(
        `/api/factures/enregistrer-paiement?factureId=${encodeURIComponent(
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
        await response.json()
          .catch(
            () => null
          ) as
          | ReponseRapprochement
          | null;

      if (
        !response.ok ||
        !resultat?.success
      ) {
        setRapprochementUrssaf(
          null
        );
        return;
      }

      setRapprochementUrssaf(
        resultat.urssaf || null
      );
    } catch {
      setRapprochementUrssaf(null);
    } finally {
      setChargementUrssaf(false);
    }
  }

  async function ouvrirModal() {
    setMontant(
      String(
        Number(resteAPayer || 0)
      )
    );
    setModePaiement("virement");
    setReferencePaiement("");
    setDatePaiement(
      dateAujourdhui()
    );
    setNote("");
    setModeUrssafActif(false);
    setRapprochementUrssaf(null);
    setMessageErreur("");
    setMessageSucces("");
    setModalOuverte(true);

    await chargerRapprochementUrssaf();
  }

  function fermerModal() {
    if (chargement) return;

    setModalOuverte(false);
    setModeUrssafActif(false);
  }

  function activerRapprochementUrssaf() {
    if (
      !rapprochementUrssaf
        ?.disponible ||
      !rapprochementUrssaf
        .demande_id ||
      !rapprochementUrssaf
        .date_virement ||
      !rapprochementUrssaf
        .montant_virement
    ) {
      setMessageErreur(
        "Les informations du virement URSSAF sont incomplètes."
      );
      return;
    }

    setModeUrssafActif(true);
    setMontant(
      String(
        rapprochementUrssaf
          .montant_virement
      )
    );
    setModePaiement(
      "virement_urssaf"
    );
    setReferencePaiement(
      rapprochementUrssaf
        .id_demande_paiement ||
        rapprochementUrssaf
          .demande_id
    );
    setDatePaiement(
      rapprochementUrssaf
        .date_virement
    );
    setNote(
      "Virement URSSAF rapproché depuis la demande d’Avance immédiate."
    );
    setMessageErreur("");
    setMessageSucces("");
  }

  function revenirPaiementManuel() {
    setModeUrssafActif(false);
    setMontant(
      String(
        Number(resteAPayer || 0)
      )
    );
    setModePaiement("virement");
    setReferencePaiement("");
    setDatePaiement(
      dateAujourdhui()
    );
    setNote("");
    setMessageErreur("");
  }

  async function enregistrerPaiement() {
    try {
      setChargement(true);
      setMessageErreur("");
      setMessageSucces("");

      const montantNombre =
        Number(
          String(montant)
            .replace(",", ".")
        );

      if (!factureId) {
        setMessageErreur(
          "Identifiant de facture manquant."
        );
        return;
      }

      if (
        !montantNombre ||
        montantNombre <= 0
      ) {
        setMessageErreur(
          "Veuillez renseigner un montant valide."
        );
        return;
      }

      if (
        resteAPayer &&
        montantNombre >
          Number(resteAPayer) +
            0.01
      ) {
        setMessageErreur(
          `Le montant encaissé ne peut pas dépasser le reste à payer : ${formatMontant(
            resteAPayer
          )}.`
        );
        return;
      }

      if (!datePaiement) {
        setMessageErreur(
          "Veuillez renseigner une date de paiement."
        );
        return;
      }

      if (
        modeUrssafActif &&
        !rapprochementUrssaf
          ?.demande_id
      ) {
        setMessageErreur(
          "La demande URSSAF à rapprocher est introuvable."
        );
        return;
      }

      const jeton =
        await obtenirJeton();

      const response = await fetch(
        "/api/factures/enregistrer-paiement",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${jeton}`,
          },
          body: JSON.stringify({
            factureId,
            facture_id: factureId,
            montant: montantNombre,
            modePaiement,
            mode_paiement:
              modePaiement,
            referencePaiement:
              referencePaiement.trim() ||
              null,
            reference_paiement:
              referencePaiement.trim() ||
              null,
            datePaiement,
            date_paiement:
              datePaiement,
            note:
              note.trim() ||
              null,
            origineUrssaf:
              modeUrssafActif,
            source_paiement:
              modeUrssafActif
                ? "urssaf"
                : "manuel",
            demandePaiementUrssafId:
              modeUrssafActif
                ? rapprochementUrssaf
                    ?.demande_id
                : null,
            demande_paiement_urssaf_id:
              modeUrssafActif
                ? rapprochementUrssaf
                    ?.demande_id
                : null,
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
            "Impossible d’enregistrer le paiement."
        );
        return;
      }

      setMessageSucces(
        resultat.message ||
          "Paiement enregistré avec succès."
      );

      await chargerRapprochementUrssaf();

      if (onPaiementEnregistre) {
        await onPaiementEnregistre();
      }

      window.setTimeout(() => {
        setModalOuverte(false);
      }, 900);
    } catch (error) {
      setMessageErreur(
        error instanceof Error
          ? error.message
          : "Impossible d’enregistrer le paiement."
      );
    } finally {
      setChargement(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() =>
          void ouvrirModal()
        }
        className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
      >
        Encaisser
      </button>

      {modalOuverte && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/40 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Enregistrer un paiement
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
                  fermerModal
                }
                disabled={
                  chargement
                }
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Fermer
              </button>
            </div>

            <div className="space-y-4 p-5">
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

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">
                    Total TTC
                  </p>
                  <p className="mt-1 font-black text-slate-950">
                    {formatMontant(
                      totalTtc
                    )}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">
                    Déjà payé
                  </p>
                  <p className="mt-1 font-black text-slate-950">
                    {formatMontant(
                      montantPaye
                    )}
                  </p>
                </div>

                <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <p className="text-xs text-red-600">
                    Reste à payer
                  </p>
                  <p className="mt-1 font-black text-red-700">
                    {formatMontant(
                      resteAPayer
                    )}
                  </p>
                </div>
              </div>

              {chargementUrssaf ? (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
                  Vérification d’un éventuel virement URSSAF…
                </div>
              ) : rapprochementUrssaf
                  ?.existe ? (
                <div
                  className={`rounded-2xl border p-4 ${
                    rapprochementUrssaf
                      .disponible
                      ? "border-blue-200 bg-blue-50"
                      : rapprochementUrssaf
                            .deja_rapproche
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-amber-200 bg-amber-50"
                  }`}
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div>
                      <p className="font-bold text-slate-950">
                        Virement URSSAF
                      </p>

                      <p className="mt-1 text-sm leading-6 text-slate-700">
                        {rapprochementUrssaf
                          .message ||
                          "Statut indisponible."}
                      </p>

                      {rapprochementUrssaf
                        .montant_virement ? (
                        <p className="mt-2 text-sm text-slate-700">
                          Montant :{" "}
                          <strong>
                            {formatMontant(
                              rapprochementUrssaf
                                .montant_virement
                            )}
                          </strong>
                          {" · "}
                          Date :{" "}
                          <strong>
                            {formatDate(
                              rapprochementUrssaf
                                .date_virement
                            )}
                          </strong>
                        </p>
                      ) : null}
                    </div>

                    {rapprochementUrssaf
                      .disponible &&
                    !modeUrssafActif ? (
                      <button
                        type="button"
                        onClick={
                          activerRapprochementUrssaf
                        }
                        className="shrink-0 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
                      >
                        Rapprocher le virement URSSAF
                      </button>
                    ) : null}
                  </div>

                  {modeUrssafActif ? (
                    <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-white p-3">
                      <p className="text-xs font-semibold text-blue-700">
                        Les données officielles du virement sont verrouillées.
                      </p>

                      <button
                        type="button"
                        onClick={
                          revenirPaiementManuel
                        }
                        className="shrink-0 text-xs font-semibold text-slate-600 hover:underline"
                      >
                        Revenir au paiement manuel
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Montant encaissé
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={montant}
                  onChange={(event) =>
                    setMontant(
                      event.target.value
                    )
                  }
                  disabled={
                    modeUrssafActif
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-100"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Mode de paiement
                  </label>

                  <select
                    value={
                      modePaiement
                    }
                    onChange={(event) =>
                      setModePaiement(
                        event.target
                          .value
                      )
                    }
                    disabled={
                      modeUrssafActif
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-100"
                  >
                    <option value="virement">
                      Virement
                    </option>
                    <option value="virement_urssaf">
                      Virement URSSAF
                    </option>
                    <option value="cheque">
                      Chèque
                    </option>
                    <option value="especes">
                      Espèces
                    </option>
                    <option value="carte_bancaire">
                      Carte bancaire
                    </option>
                    <option value="prelevement">
                      Prélèvement
                    </option>
                    <option value="autre">
                      Autre
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Date du paiement
                  </label>

                  <input
                    type="date"
                    value={
                      datePaiement
                    }
                    onChange={(event) =>
                      setDatePaiement(
                        event.target
                          .value
                      )
                    }
                    disabled={
                      modeUrssafActif
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Référence du paiement
                </label>

                <input
                  value={
                    referencePaiement
                  }
                  onChange={(event) =>
                    setReferencePaiement(
                      event.target.value
                    )
                  }
                  disabled={
                    modeUrssafActif
                  }
                  placeholder="Ex : numéro de chèque, virement, référence bancaire..."
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Note interne
                </label>

                <textarea
                  value={note}
                  onChange={(event) =>
                    setNote(
                      event.target.value
                    )
                  }
                  rows={4}
                  disabled={
                    modeUrssafActif
                  }
                  placeholder="Note facultative..."
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-100"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 p-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={
                  fermerModal
                }
                disabled={
                  chargement
                }
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={() =>
                  void enregistrerPaiement()
                }
                disabled={
                  chargement
                }
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {chargement
                  ? "Enregistrement..."
                  : modeUrssafActif
                    ? "Confirmer le rapprochement URSSAF"
                    : "Enregistrer le paiement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}