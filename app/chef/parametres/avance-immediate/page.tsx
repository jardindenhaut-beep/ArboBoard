"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type ConfigurationUrssaf = {
  id: string;
  numero_sap: string;
  client_id_masque?: string | null;
  scope_oauth: string;
  actif: boolean;
  statut:
    | "configuree"
    | "connectee"
    | "erreur"
    | "desactivee";
  derniere_verification_at?: string | null;
  dernier_code_http?: number | null;
  dernier_message?: string | null;
  created_at: string;
  updated_at: string;
};

type ReponseApi = {
  succes?: boolean;
  connexion_ok?: boolean;
  configuration?: ConfigurationUrssaf | null;
  message?: string;
  erreur?: string;
};

type AlerteUrssaf = {
  id: string;
  type: "client" | "demande";
  statut: string;
  titre: string;
  message: string;
  date: string | null;
  lien: string;
};

type TableauUrssaf = {
  clients: {
    total: number;
    brouillon: number;
    pret: number;
    appareillage_en_cours: number;
    actif: number;
    refuse: number;
    erreur: number;
  };
  demandes: {
    total: number;
    brouillon: number;
    prete: number;
    transmise: number;
    payee: number;
    impayee: number;
    annulee: number;
    erreur: number;
  };
  virements: {
    rapproches: number;
    a_rapprocher: number;
  };
  derniere_verification: string | null;
  alertes: AlerteUrssaf[];
};

type ReponseTableau = {
  succes?: boolean;
  tableau?: TableauUrssaf;
  erreur?: string;
};

type ReponseSynchronisation = {
  succes?: boolean;
  avec_erreurs?: boolean;
  message?: string;
  erreur?: string;
  demandes?: number;
  actualisees?: number;
  changees?: number;
  erreurs?: number;
};

function formaterDate(date: string | null | undefined) {
  if (!date) return "Jamais testée";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function classesStatut(
  statut: ConfigurationUrssaf["statut"]
) {
  if (statut === "connectee") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (statut === "erreur") {
    return "bg-red-50 text-red-700";
  }

  if (statut === "desactivee") {
    return "bg-slate-100 text-slate-600";
  }

  return "bg-amber-50 text-amber-700";
}

function libelleStatut(
  statut: ConfigurationUrssaf["statut"]
) {
  if (statut === "connectee") {
    return "Connexion validée";
  }

  if (statut === "erreur") {
    return "Erreur de connexion";
  }

  if (statut === "desactivee") {
    return "Désactivée";
  }

  return "Configurée";
}

export default function AvanceImmediateParametresPage() {
  const [configuration, setConfiguration] =
    useState<ConfigurationUrssaf | null>(null);

  const [numeroSap, setNumeroSap] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] =
    useState("");

  const [afficherSecret, setAfficherSecret] =
    useState(false);
  const [chargement, setChargement] =
    useState(true);
  const [enregistrement, setEnregistrement] =
    useState(false);
  const [suppression, setSuppression] =
    useState(false);

  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");

  const [tableau, setTableau] =
    useState<TableauUrssaf | null>(null);

  const [
    chargementTableau,
    setChargementTableau,
  ] = useState(true);

  const [
    synchronisationEnCours,
    setSynchronisationEnCours,
  ] = useState(false);

  const [
    messageSynchronisation,
    setMessageSynchronisation,
  ] = useState("");

  const [
    erreurSynchronisation,
    setErreurSynchronisation,
  ] = useState("");

  useEffect(() => {
    void chargerConfiguration();
    void chargerTableauDeBord();
  }, []);

  async function obtenirJeton() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.access_token) {
      throw new Error(
        "Votre session a expiré. Veuillez vous reconnecter."
      );
    }

    return session.access_token;
  }

  async function chargerConfiguration() {
    try {
      setChargement(true);
      setErreur("");

      const jeton = await obtenirJeton();

      const reponse = await fetch(
        "/api/integrations/urssaf/configuration",
        {
          headers: {
            Authorization: `Bearer ${jeton}`,
          },
          cache: "no-store",
        }
      );

      const donnees =
        (await reponse.json()) as ReponseApi;

      if (!reponse.ok) {
        throw new Error(
          donnees.erreur ||
            "Impossible de charger la configuration."
        );
      }

      const config = donnees.configuration || null;

      setConfiguration(config);
      setNumeroSap(config?.numero_sap || "");
      setClientId("");
      setClientSecret("");
    } catch (error) {
      console.error(
        "Erreur chargement intégration Urssaf :",
        error
      );

      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible de charger la configuration."
      );
    } finally {
      setChargement(false);
    }
  }

  async function chargerTableauDeBord() {
    try {
      setChargementTableau(true);

      const jeton = await obtenirJeton();

      const reponse = await fetch(
        "/api/integrations/urssaf/tableau-de-bord",
        {
          headers: {
            Authorization: `Bearer ${jeton}`,
          },
          cache: "no-store",
        }
      );

      const donnees =
        (await reponse.json()) as ReponseTableau;

      if (!reponse.ok || !donnees.succes) {
        setTableau(null);
        return;
      }

      setTableau(
        donnees.tableau || null
      );
    } catch {
      setTableau(null);
    } finally {
      setChargementTableau(false);
    }
  }

  async function synchroniserAvecUrssaf() {
    try {
      setSynchronisationEnCours(true);
      setMessageSynchronisation("");
      setErreurSynchronisation("");

      const jeton = await obtenirJeton();

      const reponse = await fetch(
        "/api/integrations/urssaf/synchroniser",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${jeton}`,
          },
          cache: "no-store",
        }
      );

      const donnees =
        (await reponse.json().catch(
          () => null
        )) as ReponseSynchronisation | null;

      if (
        !reponse.ok ||
        !donnees?.succes
      ) {
        setErreurSynchronisation(
          donnees?.erreur ||
            "Impossible de synchroniser les demandes URSSAF."
        );
        return;
      }

      setMessageSynchronisation(
        donnees.message ||
          "Synchronisation URSSAF terminée."
      );

      await chargerTableauDeBord();
    } catch (error) {
      setErreurSynchronisation(
        error instanceof Error
          ? error.message
          : "Impossible de synchroniser les demandes URSSAF."
      );
    } finally {
      setSynchronisationEnCours(false);
    }
  }

  async function enregistrerEtTester() {
    try {
      setEnregistrement(true);
      setErreur("");
      setMessage("");

      const jeton = await obtenirJeton();

      const reponse = await fetch(
        "/api/integrations/urssaf/configuration",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jeton}`,
          },
          body: JSON.stringify({
            numero_sap: numeroSap,
            client_id: clientId,
            client_secret: clientSecret,
          }),
        }
      );

      const donnees =
        (await reponse.json()) as ReponseApi;

      if (!reponse.ok) {
        throw new Error(
          donnees.erreur ||
            "Impossible d’enregistrer la configuration."
        );
      }

      setConfiguration(
        donnees.configuration || null
      );
      setClientId("");
      setClientSecret("");
      await chargerTableauDeBord();

      if (donnees.connexion_ok) {
        setMessage(
          donnees.message ||
            "La connexion Urssaf a été validée."
        );
      } else {
        setErreur(
          donnees.message ||
            "La configuration est enregistrée mais le test Urssaf a échoué."
        );
      }
    } catch (error) {
      console.error(
        "Erreur enregistrement intégration Urssaf :",
        error
      );

      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible d’enregistrer la configuration."
      );
    } finally {
      setEnregistrement(false);
    }
  }

  async function supprimerConfiguration() {
    const confirme = window.confirm(
      "Supprimer les identifiants Urssaf enregistrés pour cette entreprise ?"
    );

    if (!confirme) return;

    try {
      setSuppression(true);
      setErreur("");
      setMessage("");

      const jeton = await obtenirJeton();

      const reponse = await fetch(
        "/api/integrations/urssaf/configuration",
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${jeton}`,
          },
        }
      );

      const donnees =
        (await reponse.json()) as ReponseApi;

      if (!reponse.ok) {
        throw new Error(
          donnees.erreur ||
            "Impossible de supprimer la configuration."
        );
      }

      setConfiguration(null);
      setNumeroSap("");
      setClientId("");
      setClientSecret("");
      setMessage(
        "La configuration Urssaf a été supprimée."
      );
      await chargerTableauDeBord();
    } catch (error) {
      console.error(
        "Erreur suppression intégration Urssaf :",
        error
      );

      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible de supprimer la configuration."
      );
    } finally {
      setSuppression(false);
    }
  }

  if (chargement) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="font-semibold text-slate-700">
          Chargement de l’intégration Urssaf…
        </p>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <p className="text-sm font-semibold text-emerald-700">
              Paramètres & intégrations
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              Avance immédiate Urssaf
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Configurez les identifiants remis à votre organisme
              après son habilitation à l’API Tiers de prestation.
              Cette première étape valide uniquement la connexion
              sécurisée à l’Urssaf.
            </p>
          </div>

          <Link
            href="/chef/parametres"
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            ← Paramètres
          </Link>
        </div>
      </header>

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

      <section className="grid gap-4 md:grid-cols-3">
        <Etat
          label="Configuration"
          valeur={
            configuration
              ? "Identifiants enregistrés"
              : "Non configurée"
          }
          positif={Boolean(configuration)}
        />

        <Etat
          label="Connexion OAuth2"
          valeur={
            configuration
              ? libelleStatut(
                  configuration.statut
                )
              : "Non testée"
          }
          positif={
            configuration?.statut ===
            "connectee"
          }
        />

        <Etat
          label="Dernière vérification"
          valeur={formaterDate(
            configuration
              ?.derniere_verification_at
          )}
          positif={
            configuration?.statut ===
            "connectee"
          }
        />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <p className="text-sm font-semibold text-blue-700">
              Suivi opérationnel
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">
              Tableau de bord Avance immédiate
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Suivez les dossiers particuliers, les demandes de paiement
              et les virements restant à rapprocher.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/chef/parametres/avance-immediate/historique"
              className="shrink-0 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-center text-sm font-semibold text-blue-700 hover:bg-blue-100"
            >
              Historique complet
            </Link>

            <Link
              href="/chef/parametres/avance-immediate/attestations-fiscales"
              className="shrink-0 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-center text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              Attestations fiscales
            </Link>

            <button
              type="button"
              onClick={() =>
                void chargerTableauDeBord()
              }
              disabled={
                chargementTableau ||
                synchronisationEnCours
              }
              className="shrink-0 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {chargementTableau
                ? "Actualisation…"
                : "Rafraîchir l’affichage"}
            </button>

            <button
              type="button"
              onClick={() =>
                void synchroniserAvecUrssaf()
              }
              disabled={
                synchronisationEnCours ||
                chargementTableau ||
                !configuration ||
                configuration.statut !==
                  "connectee"
              }
              className="shrink-0 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {synchronisationEnCours
                ? "Synchronisation…"
                : "Synchroniser avec l’URSSAF"}
            </button>
          </div>
        </div>

        {messageSynchronisation ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {messageSynchronisation}
          </div>
        ) : null}

        {erreurSynchronisation ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {erreurSynchronisation}
          </div>
        ) : null}

        {chargementTableau ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-600">
            Chargement des indicateurs URSSAF…
          </div>
        ) : tableau ? (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Indicateur
                label="Clients actifs"
                valeur={tableau.clients.actif}
                detail={`${tableau.clients.total} dossier(s) au total`}
                variante="succes"
                lien="/chef/clients"
              />

              <Indicateur
                label="Inscriptions en attente"
                valeur={
                  tableau.clients.pret +
                  tableau.clients.appareillage_en_cours
                }
                detail={`${tableau.clients.brouillon} brouillon(s)`}
                variante="attente"
                lien="/chef/clients"
              />

              <Indicateur
                label="Demandes transmises"
                valeur={tableau.demandes.transmise}
                detail={`${tableau.demandes.payee} payée(s)`}
                variante="information"
                lien="/chef/factures"
              />

              <Indicateur
                label="Virements à rapprocher"
                valeur={tableau.virements.a_rapprocher}
                detail={`${tableau.virements.rapproches} déjà rapproché(s)`}
                variante={
                  tableau.virements.a_rapprocher > 0
                    ? "attention"
                    : "succes"
                }
                lien="/chef/factures"
              />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <PetitIndicateur
                label="Demandes en préparation"
                valeur={
                  tableau.demandes.brouillon +
                  tableau.demandes.prete
                }
              />

              <PetitIndicateur
                label="Impayées ou annulées"
                valeur={
                  tableau.demandes.impayee +
                  tableau.demandes.annulee
                }
                alerte={
                  tableau.demandes.impayee +
                    tableau.demandes.annulee >
                  0
                }
              />

              <PetitIndicateur
                label="Erreurs à traiter"
                valeur={
                  tableau.clients.erreur +
                  tableau.clients.refuse +
                  tableau.demandes.erreur
                }
                alerte={
                  tableau.clients.erreur +
                    tableau.clients.refuse +
                    tableau.demandes.erreur >
                  0
                }
              />
            </div>

            <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Dernière vérification automatique
                </p>
                <p className="mt-1 text-sm font-bold text-slate-800">
                  {tableau.derniere_verification
                    ? formaterDate(
                        tableau.derniere_verification
                      )
                    : "Aucune demande vérifiée pour le moment"}
                </p>
              </div>

              <Link
                href="/chef/factures"
                className="text-sm font-semibold text-blue-700 hover:underline"
              >
                Ouvrir les factures →
              </Link>
            </div>

            {tableau.alertes.length > 0 ? (
              <div className="mt-6">
                <h3 className="font-bold text-slate-950">
                  Points nécessitant une vérification
                </h3>

                <div className="mt-3 space-y-3">
                  {tableau.alertes.map(
                    (alerte) => (
                      <Link
                        key={`${alerte.type}-${alerte.id}`}
                        href={alerte.lien}
                        className="block rounded-2xl border border-red-200 bg-red-50 p-4 transition hover:border-red-300"
                      >
                        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-bold text-red-950">
                                {alerte.titre}
                              </p>
                              <span className="rounded-full border border-red-200 bg-white px-2.5 py-1 text-[11px] font-bold uppercase text-red-700">
                                {alerte.statut}
                              </span>
                            </div>

                            <p className="mt-2 text-sm leading-6 text-red-800">
                              {alerte.message}
                            </p>
                          </div>

                          <span className="shrink-0 text-xs font-semibold text-red-700">
                            Vérifier →
                          </span>
                        </div>
                      </Link>
                    )
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                Aucun incident URSSAF ne nécessite une intervention.
              </div>
            )}
          </>
        ) : (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Le suivi n’est pas encore disponible. Vérifiez que les migrations
            URSSAF et le rapprochement des paiements ont été installés.
          </div>
        )}
      </section>

      {configuration ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-slate-950">
                  Configuration actuelle
                </h2>

                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${classesStatut(
                    configuration.statut
                  )}`}
                >
                  {libelleStatut(
                    configuration.statut
                  )}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p>
                  Numéro SAP :{" "}
                  <strong className="text-slate-900">
                    {configuration.numero_sap}
                  </strong>
                </p>
                <p>
                  Client ID :{" "}
                  <strong className="font-mono text-slate-900">
                    {configuration.client_id_masque ||
                      "Masqué"}
                  </strong>
                </p>
                <p>
                  Scope OAuth :{" "}
                  <strong className="font-mono text-slate-900">
                    {configuration.scope_oauth}
                  </strong>
                </p>
              </div>

              {configuration.dernier_message ? (
                <p
                  className={`mt-4 rounded-2xl p-4 text-sm leading-6 ${
                    configuration.statut ===
                    "connectee"
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {configuration.dernier_message}
                  {configuration.dernier_code_http
                    ? ` Code HTTP : ${configuration.dernier_code_http}.`
                    : ""}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() =>
                void supprimerConfiguration()
              }
              disabled={suppression}
              className="shrink-0 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
            >
              {suppression
                ? "Suppression…"
                : "Supprimer la configuration"}
            </button>
          </div>
        </section>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-bold text-slate-950">
          Identifiants d’habilitation
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          Lorsque des identifiants sont déjà enregistrés, laissez le
          Client ID et le Client Secret vides pour simplement refaire
          le test avec les valeurs existantes.
        </p>

        <div className="mt-6 grid gap-5">
          <label>
            <span className="text-sm font-medium text-slate-700">
              Numéro SAP
            </span>
            <input
              value={numeroSap}
              onChange={(event) =>
                setNumeroSap(
                  event.target.value
                    .replace(/\s+/g, "")
                    .toUpperCase()
                    .slice(0, 12)
                )
              }
              placeholder="SAP123456789"
              autoComplete="off"
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 font-mono text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
            <span className="mt-1 block text-xs text-slate-500">
              SAP suivi des 9 chiffres du SIREN.
            </span>
          </label>

          <label>
            <span className="text-sm font-medium text-slate-700">
              Client ID Urssaf
            </span>
            <input
              value={clientId}
              onChange={(event) =>
                setClientId(event.target.value)
              }
              placeholder={
                configuration
                  ? "Laisser vide pour conserver le Client ID actuel"
                  : "Client ID remis par l’Urssaf"
              }
              autoComplete="off"
              spellCheck={false}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 font-mono text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
          </label>

          <label>
            <span className="text-sm font-medium text-slate-700">
              Client Secret Urssaf
            </span>
            <input
              type={
                afficherSecret
                  ? "text"
                  : "password"
              }
              value={clientSecret}
              onChange={(event) =>
                setClientSecret(event.target.value)
              }
              placeholder={
                configuration
                  ? "Laisser vide pour conserver le secret actuel"
                  : "Client Secret remis par l’Urssaf"
              }
              autoComplete="new-password"
              spellCheck={false}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 font-mono text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
          </label>

          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={afficherSecret}
              onChange={(event) =>
                setAfficherSecret(
                  event.target.checked
                )
              }
              className="h-4 w-4 rounded border-slate-300"
            />
            Afficher temporairement le secret saisi
          </label>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() =>
              void enregistrerEtTester()
            }
            disabled={
              enregistrement ||
              !numeroSap.trim()
            }
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {enregistrement
              ? "Connexion à l’Urssaf…"
              : configuration
                ? "Enregistrer et retester"
                : "Enregistrer et tester"}
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 sm:p-6">
        <h2 className="font-bold text-blue-950">
          Parcours de mise en service
        </h2>

        <ol className="mt-3 space-y-2 text-sm leading-6 text-blue-900">
          <li>
            1. L’organisme de services à la personne obtient son
            habilitation Urssaf.
          </li>
          <li>
            2. Il reçoit son Client ID et son Client Secret.
          </li>
          <li>
            3. Il les enregistre dans Arboboard et valide la connexion.
          </li>
          <li>
            4. Arboboard inscrit les particuliers, transmet les demandes
            de paiement et suit automatiquement les réponses URSSAF.
          </li>
          <li>
            5. Les virements confirmés peuvent être rapprochés avec les
            factures depuis le bouton Encaisser.
          </li>
        </ol>
      </section>

      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="font-bold text-amber-950">
          Protection des identifiants
        </h2>
        <p className="mt-2 text-sm leading-6 text-amber-800">
          Les identifiants sont chiffrés avant leur enregistrement.
          Le Client Secret n’est jamais renvoyé au navigateur et le
          jeton OAuth obtenu pendant le test n’est pas conservé.
        </p>
      </section>
    </main>
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
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
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

type VarianteIndicateur =
  | "succes"
  | "attente"
  | "information"
  | "attention";

function Indicateur({
  label,
  valeur,
  detail,
  variante,
  lien,
}: {
  label: string;
  valeur: number;
  detail: string;
  variante: VarianteIndicateur;
  lien: string;
}) {
  const classes = {
    succes:
      "border-emerald-200 bg-emerald-50 text-emerald-800",
    attente:
      "border-amber-200 bg-amber-50 text-amber-800",
    information:
      "border-blue-200 bg-blue-50 text-blue-800",
    attention:
      "border-red-200 bg-red-50 text-red-800",
  }[variante];

  return (
    <Link
      href={lien}
      className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${classes}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide opacity-75">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black">
        {valeur}
      </p>
      <p className="mt-1 text-xs font-semibold opacity-80">
        {detail}
      </p>
    </Link>
  );
}

function PetitIndicateur({
  label,
  valeur,
  alerte = false,
}: {
  label: string;
  valeur: number;
  alerte?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        alerte
          ? "border-red-200 bg-red-50"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <p
        className={`text-xs font-semibold uppercase tracking-wide ${
          alerte
            ? "text-red-600"
            : "text-slate-500"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-2 text-2xl font-black ${
          alerte
            ? "text-red-800"
            : "text-slate-900"
        }`}
      >
        {valeur}
      </p>
    </div>
  );
}
