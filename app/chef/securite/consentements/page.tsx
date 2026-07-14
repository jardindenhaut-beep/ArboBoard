"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const TYPES_CONSENTEMENT = [
  "communications_produit",
  "prospection_commerciale",
  "statistiques_optionnelles",
] as const;

type TypeConsentement =
  (typeof TYPES_CONSENTEMENT)[number];

type ConsentementCourant = {
  id: string;
  type_consentement: TypeConsentement;
  accorde: boolean;
  version_document: string;
  source: string;
  accorde_at?: string | null;
  retire_at?: string | null;
  updated_at: string;
};

type HistoriqueConsentement = {
  id: string;
  type_consentement: TypeConsentement;
  accorde: boolean;
  version_document: string;
  source: string;
  created_at: string;
};

type ReponseConsentements = {
  version_document?: string;
  consentements?: ConsentementCourant[];
  historique?: HistoriqueConsentement[];
  erreur?: string;
};

type DefinitionConsentement = {
  type: TypeConsentement;
  titre: string;
  description: string;
  precision: string;
  emoji: string;
};

const DEFINITIONS: DefinitionConsentement[] = [
  {
    type: "communications_produit",
    titre: "Actualités et conseils Arboboard",
    description:
      "Recevoir des conseils d’utilisation, nouveautés produit et invitations à découvrir de nouvelles fonctions.",
    precision:
      "Les messages indispensables au fonctionnement, à la sécurité ou à la facturation restent envoyés même en cas de refus.",
    emoji: "🚀",
  },
  {
    type: "prospection_commerciale",
    titre: "Offres commerciales",
    description:
      "Recevoir des offres promotionnelles, propositions d’évolution d’abonnement ou communications commerciales.",
    precision:
      "Ce choix est facultatif et peut être retiré à tout moment depuis cette page.",
    emoji: "📣",
  },
  {
    type: "statistiques_optionnelles",
    titre: "Statistiques d’usage optionnelles",
    description:
      "Autoriser l’utilisation de mesures facultatives liées au compte afin d’améliorer l’ergonomie et les fonctions du logiciel.",
    precision:
      "Les journaux strictement nécessaires à la sécurité et au diagnostic restent distincts de ce choix.",
    emoji: "📊",
  },
];

function formatDate(date: string | null | undefined) {
  if (!date) return "—";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function libelleType(type: TypeConsentement) {
  return (
    DEFINITIONS.find(
      (definition) => definition.type === type
    )?.titre || type
  );
}

export default function ConsentementsChefPage() {
  const [versionDocument, setVersionDocument] =
    useState("");
  const [consentements, setConsentements] = useState<
    ConsentementCourant[]
  >([]);
  const [historique, setHistorique] = useState<
    HistoriqueConsentement[]
  >([]);
  const [chargement, setChargement] = useState(true);
  const [typeEnCours, setTypeEnCours] =
    useState<TypeConsentement | null>(null);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");

  const choix = useMemo(() => {
    return Object.fromEntries(
      TYPES_CONSENTEMENT.map((type) => [
        type,
        consentements.find(
          (consentement) =>
            consentement.type_consentement === type
        )?.accorde || false,
      ])
    ) as Record<TypeConsentement, boolean>;
  }, [consentements]);

  useEffect(() => {
    void chargerConsentements();
  }, []);

  async function obtenirJeton() {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      throw new Error(
        "Votre session a expiré. Veuillez vous reconnecter."
      );
    }

    return session.access_token;
  }

  async function chargerConsentements() {
    try {
      setChargement(true);
      setErreur("");

      const jeton = await obtenirJeton();

      const reponse = await fetch(
        "/api/securite/consentements",
        {
          headers: {
            Authorization: `Bearer ${jeton}`,
          },
          cache: "no-store",
        }
      );

      const donnees =
        (await reponse.json()) as ReponseConsentements;

      if (!reponse.ok) {
        throw new Error(
          donnees.erreur ||
            "Impossible de charger vos choix."
        );
      }

      setVersionDocument(
        donnees.version_document || ""
      );
      setConsentements(donnees.consentements || []);
      setHistorique(donnees.historique || []);
    } catch (error) {
      console.error(
        "Erreur chargement consentements :",
        error
      );
      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible de charger vos choix."
      );
    } finally {
      setChargement(false);
    }
  }

  async function modifierConsentement(
    type: TypeConsentement,
    accorde: boolean
  ) {
    try {
      setTypeEnCours(type);
      setErreur("");
      setMessage("");

      const jeton = await obtenirJeton();

      const reponse = await fetch(
        "/api/securite/consentements",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jeton}`,
          },
          body: JSON.stringify({
            type_consentement: type,
            accorde,
            version_document: versionDocument,
          }),
        }
      );

      const donnees =
        (await reponse.json()) as ReponseConsentements & {
          succes?: boolean;
        };

      if (!reponse.ok) {
        throw new Error(
          donnees.erreur ||
            "Impossible d’enregistrer votre choix."
        );
      }

      setMessage(
        accorde
          ? "Votre accord a été enregistré."
          : "Votre refus ou retrait a été enregistré."
      );

      await chargerConsentements();
    } catch (error) {
      console.error(
        "Erreur modification consentement :",
        error
      );
      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible d’enregistrer votre choix."
      );
    } finally {
      setTypeEnCours(null);
    }
  }

  if (chargement) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="text-3xl">✅</div>
          <p className="mt-3 font-semibold text-slate-900">
            Chargement de vos consentements…
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <p className="text-sm font-semibold text-emerald-700">
              Sécurité & conformité
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              Gestion des consentements
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Choisissez librement les usages facultatifs associés à
              votre compte. Chaque accord, refus ou retrait est
              horodaté et conservé dans un historique.
            </p>
          </div>

          <Link
            href="/chef/securite"
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            ← Sécurité
          </Link>
        </div>

        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-950">
            Services indispensables
          </p>
          <p className="mt-1 text-sm leading-6 text-blue-800">
            Les notifications de sécurité, les messages liés au
            contrat, aux paiements, aux documents et au fonctionnement
            essentiel d’Arboboard ne dépendent pas de ces choix.
          </p>
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

      <section className="space-y-4">
        {DEFINITIONS.map((definition) => {
          const actif = choix[definition.type];
          const enCours =
            typeEnCours === definition.type;

          return (
            <article
              key={definition.type}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            >
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-xl">
                    {definition.emoji}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-950">
                        {definition.titre}
                      </h2>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          actif
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {actif ? "Accepté" : "Refusé"}
                      </span>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {definition.description}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      {definition.precision}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void modifierConsentement(
                        definition.type,
                        false
                      )
                    }
                    disabled={enCours || !actif}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Refuser
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void modifierConsentement(
                        definition.type,
                        true
                      )
                    }
                    disabled={enCours || actif}
                    className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {enCours ? "Enregistrement…" : "Accepter"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5 sm:p-6">
          <h2 className="text-lg font-bold text-slate-950">
            Historique de vos choix
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Version actuelle des textes :{" "}
            <span className="font-semibold text-slate-700">
              {versionDocument || "—"}
            </span>
          </p>
        </div>

        {historique.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-3xl">🕘</div>
            <p className="mt-3 font-semibold text-slate-900">
              Aucun choix enregistré
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Votre premier accord ou refus apparaîtra ici.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {historique.map((element) => (
              <article
                key={element.id}
                className="flex flex-col justify-between gap-3 p-5 sm:flex-row sm:items-center sm:p-6"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {libelleType(
                      element.type_consentement
                    )}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Version {element.version_document} · Source{" "}
                    {element.source}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      element.accorde
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {element.accorde
                      ? "Accord"
                      : "Refus / retrait"}
                  </span>
                  <time className="text-xs font-medium text-slate-500">
                    {formatDate(element.created_at)}
                  </time>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
        <p className="font-bold text-amber-950">
          Cookies et traceurs publics
        </p>
        <p className="mt-2 text-sm leading-6 text-amber-800">
          Cette page gère les consentements liés au compte connecté.
          Un bandeau distinct restera nécessaire sur le site public si
          Arboboard utilise des cookies ou traceurs facultatifs.
        </p>
      </div>
    </main>
  );
}