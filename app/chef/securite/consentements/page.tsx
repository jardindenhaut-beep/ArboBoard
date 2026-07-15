"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
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
  const [actualisation, setActualisation] = useState(false);
  const [typeEnCours, setTypeEnCours] =
    useState<TypeConsentement | null>(null);
  const [filtreHistorique, setFiltreHistorique] =
    useState<"tous" | "accords" | "refus">("tous");
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

  const statistiques = useMemo(() => {
    const acceptes = TYPES_CONSENTEMENT.filter(
      (type) => choix[type]
    ).length;

    return {
      total: TYPES_CONSENTEMENT.length,
      acceptes,
      refuses: TYPES_CONSENTEMENT.length - acceptes,
      pourcentage: Math.round(
        (acceptes / TYPES_CONSENTEMENT.length) * 100
      ),
    };
  }, [choix]);

  const historiqueTrie = useMemo(
    () =>
      [...historique].sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      ),
    [historique]
  );

  const historiqueAffiche = useMemo(() => {
    if (filtreHistorique === "accords") {
      return historiqueTrie.filter(
        (element) => element.accorde
      );
    }

    if (filtreHistorique === "refus") {
      return historiqueTrie.filter(
        (element) => !element.accorde
      );
    }

    return historiqueTrie;
  }, [filtreHistorique, historiqueTrie]);

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

  const chargerConsentements = useCallback(
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
        setActualisation(false);
      }
    },
    []
  );

  useEffect(() => {
    void chargerConsentements(true);
  }, [chargerConsentements]);

  async function actualiserConsentements() {
    setMessage("");
    await chargerConsentements(false);
    setMessage(
      "Vos consentements et leur historique ont été actualisés."
    );
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

      await chargerConsentements(false);
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
      <div className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
            ⏳
          </div>

          <p className="font-semibold text-slate-950">
            Chargement de vos consentements…
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Récupération de vos choix et de leur historique.
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6">
      <header className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 bg-emerald-600" />

        <div className="bg-gradient-to-br from-emerald-50 via-white to-white p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-2xl text-white shadow-sm">
                ✅
              </div>

              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
                  Sécurité & conformité
                </p>

                <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  Gestion des consentements
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  Choisissez librement les usages facultatifs associés à
                  votre compte. Chaque accord, refus ou retrait est
                  horodaté et conservé.
                </p>
              </div>
            </div>

            <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto">
              <button
                type="button"
                onClick={() =>
                  void actualiserConsentements()
                }
                disabled={actualisation || typeEnCours !== null}
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

        <div className="border-t border-blue-100 bg-blue-50 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-lg">
              ℹ️
            </div>

            <div>
              <p className="text-sm font-black text-blue-950">
                Services indispensables
              </p>

              <p className="mt-1 text-sm leading-6 text-blue-800">
                Les notifications de sécurité, les messages liés au
                contrat, aux paiements, aux documents et au fonctionnement
                essentiel d’Arboboard ne dépendent pas de ces choix.
              </p>
            </div>
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
        <StatistiqueConsentement
          label="Choix facultatifs"
          valeur={String(statistiques.total)}
          description="Paramètres disponibles"
        />

        <StatistiqueConsentement
          label="Accordés"
          valeur={String(statistiques.acceptes)}
          description="Consentements actifs"
          positif={statistiques.acceptes > 0}
        />

        <StatistiqueConsentement
          label="Refusés ou retirés"
          valeur={String(statistiques.refuses)}
          description="Usages non autorisés"
        />

        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
            Niveau d’accord
          </p>

          <p className="mt-2 text-2xl font-black text-emerald-950">
            {statistiques.pourcentage} %
          </p>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-emerald-600"
              style={{
                width: `${statistiques.pourcentage}%`,
              }}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {DEFINITIONS.map((definition) => {
          const actif = choix[definition.type];
          const enCours =
            typeEnCours === definition.type;

          return (
            <article
              key={definition.type}
              className={`rounded-3xl border p-5 shadow-sm sm:p-6 ${
                actif
                  ? "border-emerald-200 bg-emerald-50/40"
                  : "border-slate-200 bg-white"
              }`}
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

                    {consentements.find(
                      (consentement) =>
                        consentement.type_consentement ===
                        definition.type
                    ) ? (
                      <p className="mt-3 text-xs font-medium text-slate-500">
                        Dernière mise à jour :{" "}
                        {formatDate(
                          consentements.find(
                            (consentement) =>
                              consentement.type_consentement ===
                              definition.type
                          )?.updated_at
                        )}
                      </p>
                    ) : (
                      <p className="mt-3 text-xs font-medium text-slate-400">
                        Aucun choix explicite enregistré.
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid shrink-0 gap-2 sm:grid-cols-2 md:flex">
                  <button
                    type="button"
                    onClick={() =>
                      void modifierConsentement(
                        definition.type,
                        false
                      )
                    }
                    disabled={enCours || !actif}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {enCours && actif
                      ? "Enregistrement…"
                      : "Refuser"}
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
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
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
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-950">
              Historique de vos choix
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Version actuelle des textes :{" "}
              <span className="font-semibold text-slate-700">
                {versionDocument || "—"}
              </span>
            </p>
          </div>

          <label className="w-full lg:w-56">
            <span className="sr-only">
              Filtrer l’historique
            </span>

            <select
              value={filtreHistorique}
              onChange={(event) =>
                setFiltreHistorique(
                  event.target.value as
                    | "tous"
                    | "accords"
                    | "refus"
                )
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            >
              <option value="tous">
                Tous les choix ({historique.length})
              </option>
              <option value="accords">
                Accords (
                {
                  historique.filter(
                    (element) => element.accorde
                  ).length
                }
                )
              </option>
              <option value="refus">
                Refus / retraits (
                {
                  historique.filter(
                    (element) => !element.accorde
                  ).length
                }
                )
              </option>
            </select>
          </label>
        </div>

        {historiqueAffiche.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-3xl">🕘</div>
            <p className="mt-3 font-semibold text-slate-900">
              Aucun choix pour ce filtre
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Modifiez le filtre ou enregistrez un nouveau choix.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {historiqueAffiche.map((element) => (
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
                  <time
                    dateTime={element.created_at}
                    className="text-xs font-medium text-slate-500"
                  >
                    {formatDate(element.created_at)}
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
            🍪
          </div>

          <div>
            <p className="font-black text-amber-950">
              Cookies et traceurs publics
            </p>

            <p className="mt-2 text-sm leading-6 text-amber-800">
              Cette page gère les consentements liés au compte connecté.
              Un bandeau distinct restera nécessaire sur le site public si
              Arboboard utilise des cookies ou traceurs facultatifs.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function StatistiqueConsentement({
  label,
  valeur,
  description,
  positif = false,
}: {
  label: string;
  valeur: string;
  description: string;
  positif?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p
        className={`mt-2 text-2xl font-black ${
          positif
            ? "text-emerald-700"
            : "text-slate-950"
        }`}
      >
        {valeur}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}