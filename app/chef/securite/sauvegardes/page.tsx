"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

export default function SauvegardesChefPage() {
  const [sauvegardes, setSauvegardes] = useState<
    SauvegardeEntreprise[]
  >([]);
  const [chargement, setChargement] = useState(true);
  const [generation, setGeneration] = useState(false);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");

  const derniereReussie = useMemo(
    () =>
      sauvegardes.find(
        (sauvegarde) =>
          sauvegarde.statut === "terminee"
      ) || null,
    [sauvegardes]
  );

  const statistiques = useMemo(
    () => ({
      total: sauvegardes.length,
      reussies: sauvegardes.filter(
        (sauvegarde) =>
          sauvegarde.statut === "terminee"
      ).length,
      echecs: sauvegardes.filter(
        (sauvegarde) =>
          sauvegarde.statut === "echec"
      ).length,
    }),
    [sauvegardes]
  );

  useEffect(() => {
    void chargerSauvegardes();
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

  async function chargerSauvegardes() {
    try {
      setChargement(true);
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
    }
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
      const disposition =
        reponse.headers.get("content-disposition");

      const correspondance =
        disposition?.match(/filename="([^"]+)"/);

      const nomFichier =
        correspondance?.[1] ||
        "arboboard-sauvegarde-entreprise.json";

      const url = URL.createObjectURL(blob);
      const lien = document.createElement("a");

      lien.href = url;
      lien.download = nomFichier;
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      URL.revokeObjectURL(url);

      setMessage(
        "La sauvegarde JSON a été générée et téléchargée."
      );

      await chargerSauvegardes();
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

      await chargerSauvegardes();
    } finally {
      setGeneration(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <p className="text-sm font-semibold text-emerald-700">
              Sécurité & conformité
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              Sauvegardes de l’entreprise
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Téléchargez un export JSON isolé contenant les données
              professionnelles rattachées à votre entreprise et
              consultez l’historique des générations.
            </p>
          </div>

          <Link
            href="/chef/securite"
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            ← Sécurité
          </Link>
        </div>

        <div className="mt-6 flex flex-col justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:flex-row sm:items-center">
          <div>
            <p className="font-bold text-emerald-950">
              Export manuel sécurisé
            </p>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-emerald-800">
              Le fichier peut contenir des clients, documents,
              interventions, paramètres et autres données
              professionnelles. Conservez-le hors d’un appareil partagé
              et protégez son emplacement.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void genererSauvegarde()}
            disabled={generation}
            className="shrink-0 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
          >
            {generation
              ? "Génération…"
              : "Générer et télécharger"}
          </button>
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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Statistique
          label="Exports enregistrés"
          valeur={String(statistiques.total)}
        />
        <Statistique
          label="Réussis"
          valeur={String(statistiques.reussies)}
        />
        <Statistique
          label="Échecs"
          valeur={String(statistiques.echecs)}
          alerte={statistiques.echecs > 0}
        />
        <Statistique
          label="Dernière taille"
          valeur={
            derniereReussie
              ? formatTaille(
                  derniereReussie.taille_octets
                )
              : "Aucune"
          }
        />
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:p-6">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Historique des exports
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Le fichier lui-même n’est pas conservé dans Arboboard.
              Seules ses informations de contrôle sont enregistrées.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void chargerSauvegardes()}
            disabled={chargement}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Actualiser
          </button>
        </div>

        {chargement ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Chargement de l’historique…
          </div>
        ) : sauvegardes.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-4xl">💾</div>
            <p className="mt-3 font-bold text-slate-950">
              Aucun export généré
            </p>
            <p className="mt-1 text-sm text-slate-500">
              La première sauvegarde apparaîtra ici.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {sauvegardes.map((sauvegarde) => (
              <article
                key={sauvegarde.id}
                className="p-5 sm:p-6"
              >
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-950">
                        Export manuel JSON
                      </h3>

                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          sauvegarde.statut === "terminee"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {sauvegarde.statut === "terminee"
                          ? "Terminé"
                          : "Échec"}
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
                      </div>
                    ) : null}

                    {sauvegarde.empreinte_sha256 ? (
                      <p className="mt-3 break-all font-mono text-[11px] leading-5 text-slate-400">
                        SHA-256 :{" "}
                        {sauvegarde.empreinte_sha256}
                      </p>
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

      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="font-bold text-amber-950">
          Différence avec une sauvegarde complète
        </h2>
        <p className="mt-2 text-sm leading-6 text-amber-800">
          Cet export sert à récupérer les données de l’entreprise dans
          un format lisible. Il ne contient pas l’ensemble de la
          structure PostgreSQL, des fonctions, des politiques RLS, de
          l’authentification et de la configuration technique du projet.
          La restauration automatique depuis ce fichier n’est pas
          encore proposée.
        </p>
      </section>
    </main>
  );
}

function Statistique({
  label,
  valeur,
  alerte = false,
}: {
  label: string;
  valeur: string;
  alerte?: boolean;
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
            : "text-slate-950"
        }`}
      >
        {valeur}
      </p>
    </div>
  );
}