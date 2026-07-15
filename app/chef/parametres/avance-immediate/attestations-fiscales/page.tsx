"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabaseClient";

type ClientOption = {
  id: string;
  nom: string;
  email: string | null;
};

type FacturePreparation = {
  id: string;
  numero: string;
  date: string;
  montant_ttc: number;
};

type InterventionPreparation = {
  mois: string;
  intervenant_id: string;
  intervenant_nom: string;
  duree_minutes: number;
  nombre_interventions: number;
  nature_services: string;
};

type Preparation = {
  organisme: {
    nom: string;
    adresse: string;
    code_postal: string;
    ville: string;
    siret: string;
    email: string;
    telephone: string;
  };
  beneficiaire: {
    nom: string;
    adresse: string;
    code_postal: string;
    ville: string;
  };
  numero_declaration_sap: string;
  factures: FacturePreparation[];
  interventions: InterventionPreparation[];
  montant_factures_ttc: number;
  nature_services: string;
};

type Attestation = {
  id: string;
  client_id: string;
  annee: number;
  numero: string;
  statut: string;
  nature_services?: string | null;
  compte_debite_masque?: string | null;
  montant_factures_ttc?: number | null;
  montant_acquitte_client?: number | null;
  montant_cesu_prefinance?: number | null;
  numero_declaration_sap?: string | null;
  date_enregistrement_sap?: string | null;
  signataire_nom?: string | null;
  signataire_qualite?: string | null;
  date_emission?: string | null;
  notes?: string | null;
  beneficiaire_snapshot?: {
    nom?: string;
  };
  updated_at?: string | null;
};

type ReponseApi = {
  succes?: boolean;
  erreur?: string;
  message?: string;
  clients?: ClientOption[];
  attestations?: Attestation[];
  preparation?: Preparation | null;
  existante?: Attestation | null;
  signataire_defaut?: string;
  attestation?: Attestation;
};

function anneePrecedente() {
  return new Date()
    .getFullYear() - 1;
}

function dateAujourdhui() {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function monnaie(
  montant:
    | number
    | null
    | undefined
) {
  return new Intl.NumberFormat(
    "fr-FR",
    {
      style: "currency",
      currency: "EUR",
    }
  ).format(Number(montant || 0));
}

function duree(minutes: number) {
  const total =
    Math.max(
      0,
      Math.round(minutes || 0)
    );

  const heures =
    Math.floor(total / 60);

  const reste =
    total % 60;

  return heures > 0
    ? reste > 0
      ? `${heures} h ${reste}`
      : `${heures} h`
    : `${reste} min`;
}

function moisFr(mois: string) {
  try {
    return new Intl.DateTimeFormat(
      "fr-FR",
      {
        month: "long",
        year: "numeric",
      }
    ).format(
      new Date(
        `${mois}-01T00:00:00`
      )
    );
  } catch {
    return mois;
  }
}

export default function AttestationsFiscalesSapPage() {
  const [annee, setAnnee] =
    useState(
      anneePrecedente()
    );

  const [clients, setClients] =
    useState<ClientOption[]>([]);

  const [
    attestations,
    setAttestations,
  ] =
    useState<Attestation[]>([]);

  const [clientId, setClientId] =
    useState("");

  const [
    preparation,
    setPreparation,
  ] =
    useState<Preparation | null>(null);

  const [
    attestation,
    setAttestation,
  ] =
    useState<Attestation | null>(null);

  const [
    chargement,
    setChargement,
  ] = useState(true);

  const [
    enregistrement,
    setEnregistrement,
  ] = useState(false);

  const [erreur, setErreur] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [
    natureServices,
    setNatureServices,
  ] = useState("");

  const [
    compteDebiteMasque,
    setCompteDebiteMasque,
  ] = useState("");

  const [
    montantAcquitteClient,
    setMontantAcquitteClient,
  ] = useState("");

  const [
    montantCesuPrefinance,
    setMontantCesuPrefinance,
  ] = useState("0");

  const [
    numeroDeclarationSap,
    setNumeroDeclarationSap,
  ] = useState("");

  const [
    dateEnregistrementSap,
    setDateEnregistrementSap,
  ] = useState("");

  const [
    signataireNom,
    setSignataireNom,
  ] = useState("");

  const [
    signataireQualite,
    setSignataireQualite,
  ] = useState("Gérant");

  const [
    dateEmission,
    setDateEmission,
  ] = useState(dateAujourdhui());

  const [notes, setNotes] =
    useState("");

  useEffect(() => {
    void chargerListe();
  }, [annee]);

  async function jeton() {
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

  async function chargerListe() {
    try {
      setChargement(true);
      setErreur("");
      setMessage("");

      const token =
        await jeton();

      const reponse = await fetch(
        `/api/integrations/urssaf/attestations-fiscales?annee=${annee}`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const donnees =
        (await reponse.json().catch(
          () => null
        )) as ReponseApi | null;

      if (
        !reponse.ok ||
        !donnees?.succes
      ) {
        setErreur(
          donnees?.erreur ||
            "Impossible de charger les attestations."
        );
        return;
      }

      setClients(
        donnees.clients || []
      );

      setAttestations(
        donnees.attestations ||
          []
      );

      if (
        !signataireNom &&
        donnees.signataire_defaut
      ) {
        setSignataireNom(
          donnees.signataire_defaut
        );
      }
    } catch (error) {
      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible de charger les attestations."
      );
    } finally {
      setChargement(false);
    }
  }

  async function preparerClient(
    prochainClientId: string
  ) {
    setClientId(
      prochainClientId
    );
    setPreparation(null);
    setAttestation(null);
    setErreur("");
    setMessage("");

    if (!prochainClientId) {
      return;
    }

    try {
      setChargement(true);

      const token =
        await jeton();

      const reponse = await fetch(
        `/api/integrations/urssaf/attestations-fiscales?annee=${annee}&clientId=${encodeURIComponent(
          prochainClientId
        )}`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const donnees =
        (await reponse.json().catch(
          () => null
        )) as ReponseApi | null;

      if (
        !reponse.ok ||
        !donnees?.succes ||
        !donnees.preparation
      ) {
        setErreur(
          donnees?.erreur ||
            "Impossible de préparer l’attestation."
        );
        return;
      }

      setPreparation(
        donnees.preparation
      );

      const existante =
        donnees.existante ||
        null;

      setAttestation(
        existante
      );

      setNatureServices(
        existante
          ?.nature_services ||
          donnees.preparation
            .nature_services ||
          ""
      );

      setCompteDebiteMasque(
        existante
          ?.compte_debite_masque ||
          ""
      );

      setMontantAcquitteClient(
        existante
          ? String(
              Number(
                existante
                  .montant_acquitte_client ||
                  0
              )
            )
          : ""
      );

      setMontantCesuPrefinance(
        String(
          Number(
            existante
              ?.montant_cesu_prefinance ||
              0
          )
        )
      );

      setNumeroDeclarationSap(
        existante
          ?.numero_declaration_sap ||
          donnees.preparation
            .numero_declaration_sap ||
          ""
      );

      setDateEnregistrementSap(
        existante
          ?.date_enregistrement_sap ||
          ""
      );

      setSignataireNom(
        existante
          ?.signataire_nom ||
          donnees.signataire_defaut ||
          signataireNom
      );

      setSignataireQualite(
        existante
          ?.signataire_qualite ||
          "Gérant"
      );

      setDateEmission(
        existante
          ?.date_emission ||
          dateAujourdhui()
      );

      setNotes(
        existante?.notes ||
          ""
      );
    } catch (error) {
      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible de préparer l’attestation."
      );
    } finally {
      setChargement(false);
    }
  }

  async function enregistrer(
    action:
      | "enregistrer"
      | "valider"
  ) {
    try {
      setEnregistrement(true);
      setErreur("");
      setMessage("");

      if (
        !clientId ||
        !preparation
      ) {
        setErreur(
          "Sélectionnez un client."
        );
        return;
      }

      if (
        montantAcquitteClient.trim() ===
        ""
      ) {
        setErreur(
          "Renseignez et contrôlez le montant effectivement acquitté par le client."
        );
        return;
      }

      const montantClient =
        Number(
          montantAcquitteClient
            .replace(",", ".")
        );

      if (
        !Number.isFinite(
          montantClient
        ) ||
        montantClient < 0
      ) {
        setErreur(
          "Le montant acquitté par le client est invalide."
        );
        return;
      }

      const token =
        await jeton();

      const reponse = await fetch(
        "/api/integrations/urssaf/attestations-fiscales",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${token}`,
          },
          body: JSON.stringify({
            action,
            clientId,
            annee,
            natureServices,
            compteDebiteMasque,
            montantAcquitteClient:
              montantClient,
            montantCesuPrefinance:
              Number(
                montantCesuPrefinance
                  .replace(",", ".")
              ) || 0,
            numeroDeclarationSap,
            dateEnregistrementSap,
            signataireNom,
            signataireQualite,
            dateEmission,
            notes,
          }),
        }
      );

      const donnees =
        (await reponse.json().catch(
          () => null
        )) as ReponseApi | null;

      if (
        !reponse.ok ||
        !donnees?.succes ||
        !donnees.attestation
      ) {
        setErreur(
          donnees?.erreur ||
            "Impossible d’enregistrer l’attestation."
        );
        return;
      }

      setAttestation(
        donnees.attestation
      );

      const messageSucces =
        donnees.message ||
        "Attestation enregistrée.";

      await chargerListe();
      await preparerClient(
        clientId
      );

      setMessage(
        messageSucces
      );
    } catch (error) {
      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible d’enregistrer l’attestation."
      );
    } finally {
      setEnregistrement(false);
    }
  }

  async function ouvrirPdf(
    id: string
  ) {
    try {
      setErreur("");

      const token =
        await jeton();

      const reponse = await fetch(
        `/api/integrations/urssaf/attestations-fiscales/${id}/pdf`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      if (!reponse.ok) {
        const donnees =
          await reponse.json().catch(
            () => null
          );

        setErreur(
          donnees?.erreur ||
            "Impossible de générer le PDF."
        );
        return;
      }

      const blob =
        await reponse.blob();

      const url =
        URL.createObjectURL(blob);

      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );

      window.setTimeout(
        () =>
          URL.revokeObjectURL(
            url
          ),
        60_000
      );
    } catch (error) {
      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible de générer le PDF."
      );
    }
  }

  const totalInterventions =
    useMemo(
      () =>
        preparation?.interventions.reduce(
          (total, ligne) =>
            total +
            ligne.nombre_interventions,
          0
        ) || 0,
      [preparation]
    );

  return (
    <main className="mx-auto max-w-7xl space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <Link
          href="/chef/parametres/avance-immediate"
          className="text-sm font-semibold text-blue-700 hover:underline"
        >
          ← Retour à l’Avance immédiate
        </Link>

        <p className="mt-5 text-sm font-semibold text-blue-700">
          Conformité SAP
        </p>

        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
          Attestations fiscales annuelles
        </h1>

        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
          Préparez et validez les attestations annuelles des particuliers.
          Le montant réellement acquitté par le client doit être vérifié
          avant validation, notamment lorsque l’Avance immédiate a été utilisée.
        </p>
      </header>

      {erreur ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erreur}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Année fiscale
            </label>
            <input
              type="number"
              min="2000"
              max="2100"
              value={annee}
              onChange={(event) => {
                setAnnee(
                  Number(
                    event.target.value
                  )
                );
                setClientId("");
                setPreparation(null);
                setAttestation(null);
              }}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Particulier
            </label>
            <select
              value={clientId}
              onChange={(event) =>
                void preparerClient(
                  event.target.value
                )
              }
              disabled={chargement}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
            >
              <option value="">
                Sélectionner un client ayant une demande URSSAF payée
              </option>

              {clients.map(
                (client) => (
                  <option
                    key={client.id}
                    value={client.id}
                  >
                    {client.nom}
                    {client.email
                      ? ` - ${client.email}`
                      : ""}
                  </option>
                )
              )}
            </select>
          </div>
        </div>
      </section>

      {preparation ? (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <Carte
              label="Factures URSSAF payées"
              valeur={String(
                preparation.factures
                  .length
              )}
            />

            <Carte
              label="Total TTC recensé"
              valeur={monnaie(
                preparation
                  .montant_factures_ttc
              )}
            />

            <Carte
              label="Interventions recensées"
              valeur={String(
                totalInterventions
              )}
            />
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold text-slate-950">
              Informations obligatoires
            </h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Champ
                label="Numéro de déclaration SAP"
                value={
                  numeroDeclarationSap
                }
                onChange={
                  setNumeroDeclarationSap
                }
                placeholder="Ex : SAP123456789"
              />

              <ChampDate
                label="Date d’enregistrement de la déclaration"
                value={
                  dateEnregistrementSap
                }
                onChange={
                  setDateEnregistrementSap
                }
              />

              <Champ
                label="Nom du signataire"
                value={
                  signataireNom
                }
                onChange={
                  setSignataireNom
                }
              />

              <Champ
                label="Qualité du signataire"
                value={
                  signataireQualite
                }
                onChange={
                  setSignataireQualite
                }
                placeholder="Ex : Gérant"
              />

              <ChampDate
                label="Date d’émission"
                value={
                  dateEmission
                }
                onChange={
                  setDateEmission
                }
              />

              <Champ
                label="Compte débité masqué — facultatif"
                value={
                  compteDebiteMasque
                }
                onChange={
                  setCompteDebiteMasque
                }
                placeholder="Ex : FR76 **** **** **** 1234"
              />
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Nature exacte des services
              </label>
              <textarea
                value={
                  natureServices
                }
                onChange={(event) =>
                  setNatureServices(
                    event.target.value
                  )
                }
                rows={4}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>
          </section>

          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold text-amber-950">
              Montants à contrôler
            </h2>

            <p className="mt-2 text-sm leading-6 text-amber-800">
              Arboboard connaît le total des factures URSSAF payées, mais
              le montant réellement acquitté par le particulier doit être
              confirmé à partir des éléments URSSAF et des éventuelles aides.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-amber-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                  Total factures TTC
                </p>
                <p className="mt-2 text-2xl font-black text-amber-950">
                  {monnaie(
                    preparation
                      .montant_factures_ttc
                  )}
                </p>
              </div>

              <ChampNombre
                label="Montant effectivement acquitté par le client"
                value={
                  montantAcquitteClient
                }
                onChange={
                  setMontantAcquitteClient
                }
              />

              <ChampNombre
                label="Dont CESU préfinancé"
                value={
                  montantCesuPrefinance
                }
                onChange={
                  setMontantCesuPrefinance
                }
              />
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold text-slate-950">
              Récapitulatif automatique
            </h2>

            <div className="mt-5 space-y-5">
              <div>
                <h3 className="font-semibold text-slate-900">
                  Factures
                </h3>
                <div className="mt-3 space-y-2">
                  {preparation.factures.length ===
                  0 ? (
                    <p className="text-sm text-slate-500">
                      Aucune facture payée trouvée.
                    </p>
                  ) : (
                    preparation.factures.map(
                      (facture) => (
                        <div
                          key={`${facture.id}-${facture.numero}`}
                          className="flex flex-col justify-between gap-2 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center"
                        >
                          <div>
                            <p className="font-semibold text-slate-900">
                              {facture.numero}
                            </p>
                            <p className="text-xs text-slate-500">
                              {facture.date}
                            </p>
                          </div>

                          <p className="font-bold text-slate-900">
                            {monnaie(
                              facture.montant_ttc
                            )}
                          </p>
                        </div>
                      )
                    )
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">
                  Intervenants et durées
                </h3>

                <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-4 py-3">
                          Mois
                        </th>
                        <th className="px-4 py-3">
                          Intervenant
                        </th>
                        <th className="px-4 py-3">
                          Nature
                        </th>
                        <th className="px-4 py-3 text-right">
                          Durée
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {preparation.interventions.map(
                        (ligne, index) => (
                          <tr
                            key={`${ligne.mois}-${ligne.intervenant_id}-${index}`}
                          >
                            <td className="px-4 py-3 text-sm text-slate-700">
                              {moisFr(
                                ligne.mois
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm font-semibold text-slate-900">
                                {ligne.intervenant_nom}
                              </p>
                              <p className="text-xs font-mono text-slate-500">
                                {ligne.intervenant_id}
                              </p>
                            </td>
                            <td className="max-w-sm px-4 py-3 text-sm text-slate-600">
                              {ligne.nature_services ||
                                "Non renseignée"}
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                              {duree(
                                ligne.duree_minutes
                              )}
                            </td>
                          </tr>
                        )
                      )}

                      {preparation.interventions.length ===
                      0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-6 text-center text-sm text-slate-500"
                          >
                            Aucun détail d’intervention trouvé automatiquement.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Observations — facultatif
            </label>
            <textarea
              value={notes}
              onChange={(event) =>
                setNotes(
                  event.target.value
                )
              }
              rows={4}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  void enregistrer(
                    "enregistrer"
                  )
                }
                disabled={
                  enregistrement
                }
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {enregistrement
                  ? "Enregistrement…"
                  : "Enregistrer le brouillon"}
              </button>

              <button
                type="button"
                onClick={() =>
                  void enregistrer(
                    "valider"
                  )
                }
                disabled={
                  enregistrement
                }
                className="rounded-2xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {enregistrement
                  ? "Validation…"
                  : "Valider l’attestation"}
              </button>

              {attestation &&
              [
                "validee",
                "envoyee",
              ].includes(
                attestation.statut
              ) ? (
                <button
                  type="button"
                  onClick={() =>
                    void ouvrirPdf(
                      attestation.id
                    )
                  }
                  className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  Ouvrir le PDF
                </button>
              ) : null}
            </div>
          </section>
        </>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">
          Attestations de l’année {annee}
        </h2>

        <div className="mt-4 space-y-3">
          {attestations.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
              Aucune attestation enregistrée.
            </p>
          ) : (
            attestations.map(
              (item) => (
                <div
                  key={item.id}
                  className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-950">
                        {item.beneficiaire_snapshot
                          ?.nom ||
                          item.numero}
                      </p>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                          item.statut ===
                          "validee"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-50 text-slate-700"
                        }`}
                      >
                        {item.statut ===
                        "validee"
                          ? "Validée"
                          : "Brouillon"}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      {item.numero} - Client :{" "}
                      {monnaie(
                        item.montant_acquitte_client
                      )}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void preparerClient(
                          item.client_id
                        )
                      }
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Ouvrir
                    </button>

                    {[
                      "validee",
                      "envoyee",
                    ].includes(
                      item.statut
                    ) ? (
                      <button
                        type="button"
                        onClick={() =>
                          void ouvrirPdf(
                            item.id
                          )
                        }
                        className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                      >
                        PDF
                      </button>
                    ) : null}
                  </div>
                </div>
              )
            )
          )}
        </div>
      </section>
    </main>
  );
}

function Carte({
  label,
  valeur,
}: {
  label: string;
  valeur: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-slate-950">
        {valeur}
      </p>
    </div>
  );
}

function Champ({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (valeur: string) => void;
  placeholder?: string;
}) {
  return (
    <label>
      <span className="mb-1 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      />
    </label>
  );
}

function ChampDate({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (valeur: string) => void;
}) {
  return (
    <label>
      <span className="mb-1 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      <input
        type="date"
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      />
    </label>
  );
}

function ChampNombre({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (valeur: string) => void;
}) {
  return (
    <label className="rounded-2xl border border-amber-200 bg-white p-4">
      <span className="block text-xs font-semibold uppercase tracking-wide text-amber-600">
        {label}
      </span>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value
            )
          }
          className="min-w-0 flex-1 rounded-xl border border-amber-200 px-3 py-2 text-lg font-bold text-amber-950 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
        />
        <span className="font-bold text-amber-800">
          EUR
        </span>
      </div>
    </label>
  );
}