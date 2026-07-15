"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabaseClient";

type SauvegardeEntreprise = {
  id: string;
  type_sauvegarde: string;
  format_fichier: string;
  statut: "terminee" | "echec";
  nombre_tables: number;
  taille_octets: number;
  empreinte_sha256?: string | null;
  message_erreur?: string | null;
  created_at: string;
};

type ReponseSauvegardes = {
  sauvegardes?: SauvegardeEntreprise[];
  erreur?: string;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function formatTaille(octets: number) {
  if (!Number.isFinite(octets) || octets <= 0) {
    return "0 octet";
  }

  const unites = ["octets", "Ko", "Mo", "Go"];
  const index = Math.min(
    Math.floor(Math.log(octets) / Math.log(1024)),
    unites.length - 1
  );

  const valeur = octets / 1024 ** index;

  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: index === 0 ? 0 : 2,
  }).format(valeur)} ${unites[index]}`;
}

function extraireNomFichier(
  disposition: string | null
) {
  if (!disposition) return null;

  const utf8 = disposition.match(
    /filename\*=UTF-8''([^;]+)/i
  );

  if (utf8?.[1]) {
    try {
      return decodeURIComponent(
        utf8[1].replace(/^["']|["']$/g, "")
      );
    } catch {
      return utf8[1].replace(/^["']|["']$/g, "");
    }
  }

  const classique = disposition.match(
    /filename="?([^";]+)"?/i
  );

  return classique?.[1]?.trim() || null;
}

function statutLisible(
  statut: SauvegardeEntreprise["statut"]
) {
  return statut === "terminee"
    ? "Terminé"
    : "Échec";
}

export default function SauvegardesChefPage() {
  const [sauvegardes, setSauvegardes] = useState<
    SauvegardeEntreprise[]
  >([]);
  const [chargement, setChargement] = useState(true);
  const [actualisation, setActualisation] = useState(false);
  const [generation, setGeneration] = useState(false);
  const [filtreStatut, setFiltreStatut] =
    useState<"tous" | "terminee" | "echec">("tous");
  const [empreinteCopiee, setEmpreinteCopiee] =
    useState<string | null>(null);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");

  const sauvegardesTriees = useMemo(
    () =>
      [...sauvegardes].sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      ),
    [sauvegardes]
  );

  const sauvegardesAffichees = useMemo(
    () =>
      filtreStatut === "tous"
        ? sauvegardesTriees
        : sauvegardesTriees.filter(
            (sauvegarde) =>
              sauvegarde.statut === filtreStatut
          ),
    [filtreStatut, sauvegardesTriees]
  );

  const derniereReussie = useMemo(
    () =>
      sauvegardesTriees.find(
        (sauvegarde) =>
          sauvegarde.statut === "terminee"
      ) || null,
    [sauvegardesTriees]
  );

  const statistiques = useMemo(() => {
    const reussies = sauvegardes.filter(
      (sauvegarde) =>
        sauvegarde.statut === "terminee"
    );

    return {
      total: sauvegardes.length,
      reussies: reussies.length,
      echecs: sauvegardes.filter(
        (sauvegarde) =>
          sauvegarde.statut === "echec"
      ).length,
      tailleCumulee: reussies.reduce(
        (total, sauvegarde) =>
          total +
          Math.max(0, Number(sauvegarde.taille_octets || 0)),
        0
      ),
    };
  }, [sauvegardes]);

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

  const chargerSauvegardes = useCallback(
    async (chargementInitial = false) => {
      try {
        if (chargementInitial) {
          setChargement(true);
        } else {
          setActualisation(true);
        }

        setErreur("");

      const jeton = await obtenirJeton();

      const reponse = await fetch(
        "/api/securite/sauvegardes",
        {
          headers: {
            Authorization: `Bearer ${jeton}`,
          },
          cache: "no-store",
        }
      );

      const donnees =
        (await reponse.json()) as ReponseSauvegardes;

      if (!reponse.ok) {
        throw new Error(
          donnees.erreur ||
            "Impossible de charger l’historique."
        );
      }

      setSauvegardes(donnees.sauvegardes || []);
    } catch (error) {
      console.error(
        "Erreur chargement sauvegardes :",
        error
      );

      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible de charger l’historique."
      );
      } finally {
        setChargement(false);
        setActualisation(false);
      }
    },
    []
  );

  useEffect(() => {
    void chargerSauvegardes(true);
  }, [chargerSauvegardes]);

  async function actualiserHistorique() {
    setMessage("");
    await chargerSauvegardes(false);
    setMessage(
      "L’historique des sauvegardes a été actualisé."
    );
  }

  async function genererSauvegarde() {
    try {
      setGeneration(true);
      setErreur("");
      setMessage("");

      const jeton = await obtenirJeton();

      const reponse = await fetch(
        "/api/securite/sauvegardes",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${jeton}`,
          },
          cache: "no-store",
        }
      );

      if (!reponse.ok) {
        const donnees =
          (await reponse.json().catch(() => ({}))) as {
            erreur?: string;
          };

        throw new Error(
          donnees.erreur ||
            "Impossible de générer la sauvegarde."
        );
      }

      const blob = await reponse.blob();

      if (blob.size <= 0) {
        throw new Error(
          "Le serveur a renvoyé un fichier vide."
        );
      }

      const disposition =
        reponse.headers.get("content-disposition");

      const nomFichier =
        extraireNomFichier(disposition) ||
        "arboboard-sauvegarde-entreprise.json";

      const url = URL.createObjectURL(blob);
      const lien = document.createElement("a");

      lien.href = url;
      lien.download = nomFichier;
      document.body.appendChild(lien);
      lien.click();
      lien.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);

      setMessage(
        "La sauvegarde JSON a été générée et téléchargée."
      );

      await chargerSauvegardes(false);
    } catch (error) {
      console.error(
        "Erreur génération sauvegarde :",
        error
      );

      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible de générer la sauvegarde."
      );

      await chargerSauvegardes(false);
    } finally {
      setGeneration(false);
    }
  }

  async function copierEmpreinte(
    sauvegarde: SauvegardeEntreprise
  ) {
    if (!sauvegarde.empreinte_sha256) return;

    try {
      await navigator.clipboard.writeText(
        sauvegarde.empreinte_sha256
      );

      setEmpreinteCopiee(sauvegarde.id);
      setErreur("");
      setMessage(
        "L’empreinte SHA-256 a été copiée."
      );

      window.setTimeout(() => {
        setEmpreinteCopiee((valeur) =>
          valeur === sauvegarde.id ? null : valeur
        );
      }, 2500);
    } catch (error) {
      console.error(
        "Erreur copie empreinte :",
        error
      );

      setErreur(
        "Impossible de copier automatiquement l’empreinte."
      );
    }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6">
      <header className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 bg-emerald-600" />

        <div className="bg-gradient-to-br from-emerald-50 via-white to-white p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-2xl text-white shadow-sm">
                💾
              </div>

              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
                  Sécurité & conformité
                </p>

                <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  Sauvegardes de l’entreprise
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  Téléchargez un export JSON isolé des données
                  professionnelles et consultez l’historique des
                  générations.
                </p>
              </div>
            </div>

            <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto">
              <button
                type="button"
                onClick={() => void actualiserHistorique()}
                disabled={actualisation || generation}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span aria-hidden="true">↻</span>
                {actualisation
                  ? "Actualisation…"
                  : "Actualiser"}
              </button>

              <Link
                href="/chef/securite"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                ← Sécurité
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-emerald-100 bg-emerald-50 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-black text-emerald-950">
                Export manuel sécurisé
              </p>

              <p className="mt-1 max-w-3xl text-sm leading-6 text-emerald-800">
                Le fichier peut contenir des données clients et des
                documents professionnels. Conservez-le dans un
                emplacement privé et protégé.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void genererSauvegarde()}
              disabled={generation || actualisation}
              className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generation
                ? "Génération…"
                : "Générer et télécharger"}
            </button>
          </div>
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

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Statistique
          label="Exports enregistrés"
          valeur={String(statistiques.total)}
          description="Historique disponible"
        />

        <Statistique
          label="Réussis"
          valeur={String(statistiques.reussies)}
          description="Fichiers générés"
          positif={statistiques.reussies > 0}
        />

        <Statistique
          label="Échecs"
          valeur={String(statistiques.echecs)}
          description="Générations à contrôler"
          alerte={statistiques.echecs > 0}
        />

        <Statistique
          label="Volume cumulé"
          valeur={formatTaille(
            statistiques.tailleCumulee
          )}
          description={
            derniereReussie
              ? `Dernier export : ${formatDate(
                  derniereReussie.created_at
                )}`
              : "Aucun export réussi"
          }
        />
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-950">
              Historique des exports
            </h2>

            <p className="mt-1 max-w-3xl text-sm text-slate-500">
              Le fichier lui-même n’est pas conservé dans Arboboard.
              Seules ses informations de contrôle sont enregistrées.
            </p>
          </div>

          <label className="w-full lg:w-52">
            <span className="sr-only">
              Filtrer l’historique
            </span>

            <select
              value={filtreStatut}
              onChange={(event) =>
                setFiltreStatut(
                  event.target.value as
                    | "tous"
                    | "terminee"
                    | "echec"
                )
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            >
              <option value="tous">
                Tous les exports ({sauvegardes.length})
              </option>
              <option value="terminee">
                Réussis ({statistiques.reussies})
              </option>
              <option value="echec">
                Échecs ({statistiques.echecs})
              </option>
            </select>
          </label>
        </div>

        {chargement ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Chargement de l’historique…
          </div>
        ) : sauvegardesAffichees.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-4xl">💾</div>
            <p className="mt-3 font-bold text-slate-950">
              Aucun export pour ce filtre
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Modifiez le filtre ou générez une nouvelle sauvegarde.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {sauvegardesAffichees.map((sauvegarde) => (
              <article
                key={sauvegarde.id}
                className="p-5 sm:p-6"
              >
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-slate-950">
                        Export manuel {sauvegarde.format_fichier.toUpperCase()}
                      </h3>

                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          sauvegarde.statut === "terminee"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {statutLisible(
                          sauvegarde.statut
                        )}
                      </span>
                    </div>

                    {sauvegarde.statut === "terminee" ? (
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                        <span>
                          Tables exportées :{" "}
                          <strong className="text-slate-700">
                            {sauvegarde.nombre_tables}
                          </strong>
                        </span>
                        <span>
                          Taille :{" "}
                          <strong className="text-slate-700">
                            {formatTaille(
                              sauvegarde.taille_octets
                            )}
                          </strong>
                        </span>

                        <span>
                          Type :{" "}
                          <strong className="text-slate-700">
                            {sauvegarde.type_sauvegarde ||
                              "manuel"}
                          </strong>
                        </span>
                      </div>
                    ) : null}

                    {sauvegarde.empreinte_sha256 ? (
                      <div className="mt-4 rounded-2xl bg-slate-50 p-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                            Empreinte SHA-256
                          </p>

                          <button
                            type="button"
                            onClick={() =>
                              void copierEmpreinte(sauvegarde)
                            }
                            className="w-fit text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                          >
                            {empreinteCopiee === sauvegarde.id
                              ? "✓ Copiée"
                              : "Copier l’empreinte"}
                          </button>
                        </div>

                        <code className="mt-2 block select-all break-all font-mono text-[11px] leading-5 text-slate-500">
                          {sauvegarde.empreinte_sha256}
                        </code>
                      </div>
                    ) : null}

                    {sauvegarde.message_erreur ? (
                      <p className="mt-3 text-sm text-red-700">
                        {sauvegarde.message_erreur}
                      </p>
                    ) : null}
                  </div>

                  <time
                    dateTime={sauvegarde.created_at}
                    className="shrink-0 text-xs font-medium text-slate-500"
                  >
                    {formatDate(sauvegarde.created_at)}
                  </time>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-xl">
            ℹ️
          </div>

          <div>
            <h2 className="font-black text-amber-950">
              Différence avec une sauvegarde complète
            </h2>

            <p className="mt-2 text-sm leading-6 text-amber-800">
              Cet export permet de récupérer les données de l’entreprise
              dans un format lisible. Il ne contient pas toute la
              structure PostgreSQL, les fonctions, les politiques RLS,
              l’authentification ni la configuration technique du projet.
              La restauration automatique depuis ce fichier n’est pas
              encore proposée.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function Statistique({
  label,
  valeur,
  description,
  alerte = false,
  positif = false,
}: {
  label: string;
  valeur: string;
  description?: string;
  alerte?: boolean;
  positif?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p
        className={`mt-2 text-2xl font-bold ${
          alerte
            ? "text-red-700"
            : positif
              ? "text-emerald-700"
              : "text-slate-950"
        }`}
      >
        {valeur}
      </p>

      {description ? (
        <p className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>
      ) : null}
    </div>
  );
}