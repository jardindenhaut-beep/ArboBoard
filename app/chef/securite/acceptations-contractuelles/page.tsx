"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabaseClient";

type AcceptationContractuelle = {
  id: string;
  utilisateur_id: string;
  entreprise_id?: string | null;
  utilisateur_email?: string | null;
  utilisateur_nom?: string | null;
  type_document:
    | "cgu"
    | "politique_confidentialite"
    | "cgv";
  version_document: string;
  titre_document: string;
  contexte:
    | "inscription"
    | "souscription";
  source: string;
  details?: Record<string, unknown> | null;
  user_agent?: string | null;
  acceptee_at: string;
};

type ReponseAcceptations = {
  acceptations?: AcceptationContractuelle[];
  statistiques?: {
    total: number;
    cgu: number;
    confidentialite: number;
    cgv: number;
  };
  erreur?: string;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      dateStyle: "medium",
      timeStyle: "medium",
    }
  ).format(new Date(date));
}

function libelleDocument(
  typeDocument: AcceptationContractuelle["type_document"]
) {
  if (typeDocument === "cgu") {
    return "CGU";
  }

  if (
    typeDocument ===
    "politique_confidentialite"
  ) {
    return "Politique de confidentialité";
  }

  return "CGV";
}

function libelleContexte(
  contexte: AcceptationContractuelle["contexte"]
) {
  return contexte === "inscription"
    ? "Inscription"
    : "Souscription";
}

function classeDocument(
  typeDocument: AcceptationContractuelle["type_document"]
) {
  if (typeDocument === "cgu") {
    return "bg-blue-50 text-blue-700";
  }

  if (
    typeDocument ===
    "politique_confidentialite"
  ) {
    return "bg-violet-50 text-violet-700";
  }

  return "bg-emerald-50 text-emerald-700";
}

function echapperCsv(valeur: unknown) {
  const texte =
    valeur === null ||
    valeur === undefined
      ? ""
      : String(valeur);

  return `"${texte.replace(
    /"/g,
    '""'
  )}"`;
}

export default function AcceptationsContractuellesPage() {
  const [acceptations, setAcceptations] =
    useState<AcceptationContractuelle[]>(
      []
    );

  const [typeDocument, setTypeDocument] =
    useState("tous");
  const [contexte, setContexte] =
    useState("tous");
  const [recherche, setRecherche] =
    useState("");

  const [chargement, setChargement] =
    useState(true);
  const [actualisation, setActualisation] =
    useState(false);
  const [exportEnCours, setExportEnCours] =
    useState(false);
  const [erreur, setErreur] =
    useState("");
  const [message, setMessage] =
    useState("");

  const statistiques = useMemo(
    () => ({
      total: acceptations.length,
      cgu: acceptations.filter(
        (element) =>
          element.type_document === "cgu"
      ).length,
      confidentialite:
        acceptations.filter(
          (element) =>
            element.type_document ===
            "politique_confidentialite"
        ).length,
      cgv: acceptations.filter(
        (element) =>
          element.type_document === "cgv"
      ).length,
    }),
    [acceptations]
  );

  const obtenirJeton =
    useCallback(async () => {
      const {
        data: { session },
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (
        sessionError ||
        !session?.access_token
      ) {
        throw new Error(
          "Votre session a expiré. Veuillez vous reconnecter."
        );
      }

      return session.access_token;
    }, []);

  const chargerAcceptations =
    useCallback(
      async (
        chargementInitial = false
      ) => {
        try {
          if (chargementInitial) {
            setChargement(true);
          } else {
            setActualisation(true);
          }

          setErreur("");
          setMessage("");

          const jeton =
            await obtenirJeton();

          const parametres =
            new URLSearchParams({
              limite: "500",
              type_document:
                typeDocument,
              contexte,
              recherche:
                recherche.trim(),
            });

          const reponse = await fetch(
            `/api/securite/acceptations-contractuelles?${parametres.toString()}`,
            {
              headers: {
                Authorization:
                  `Bearer ${jeton}`,
              },
              cache: "no-store",
            }
          );

          const donnees =
            (await reponse.json()) as ReponseAcceptations;

          if (!reponse.ok) {
            throw new Error(
              donnees.erreur ||
                "Impossible de charger les acceptations."
            );
          }

          setAcceptations(
            donnees.acceptations || []
          );

          if (!chargementInitial) {
            setMessage(
              "L’historique des acceptations a été actualisé."
            );
          }
        } catch (error) {
          console.error(
            "Erreur chargement acceptations :",
            error
          );

          setAcceptations([]);
          setErreur(
            error instanceof Error
              ? error.message
              : "Impossible de charger les acceptations."
          );
        } finally {
          setChargement(false);
          setActualisation(false);
        }
      },
      [
        contexte,
        obtenirJeton,
        recherche,
        typeDocument,
      ]
    );

  useEffect(() => {
    void chargerAcceptations(true);
  }, [chargerAcceptations]);

  async function exporterCsv() {
    if (
      acceptations.length === 0
    ) {
      return;
    }

    try {
      setExportEnCours(true);
      setErreur("");
      setMessage("");

      const entetes = [
        "Date",
        "Utilisateur",
        "Email",
        "Document",
        "Version",
        "Contexte",
        "Source",
        "Plan",
        "Fréquence",
      ];

      const lignes = acceptations.map(
        (acceptation) => [
          formatDate(
            acceptation.acceptee_at
          ),
          acceptation.utilisateur_nom ||
            "",
          acceptation.utilisateur_email ||
            "",
          libelleDocument(
            acceptation.type_document
          ),
          acceptation.version_document,
          libelleContexte(
            acceptation.contexte
          ),
          acceptation.source,
          String(
            acceptation.details?.plan ||
              ""
          ),
          String(
            acceptation.details
              ?.frequence || ""
          ),
        ]
      );

      const contenu = [
        entetes
          .map(echapperCsv)
          .join(";"),
        ...lignes.map((ligne) =>
          ligne
            .map(echapperCsv)
            .join(";")
        ),
      ].join("\n");

      const blob = new Blob(
        [`\uFEFF${contenu}`],
        {
          type: "text/csv;charset=utf-8",
        }
      );

      const url =
        URL.createObjectURL(blob);
      const lien =
        document.createElement("a");

      lien.href = url;
      lien.download =
        `acceptations-contractuelles-arboboard-${new Date()
          .toISOString()
          .slice(0, 10)}.csv`;

      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      URL.revokeObjectURL(url);

      setMessage(
        `${acceptations.length} acceptation(s) exportée(s).`
      );
    } catch (error) {
      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible d’exporter les acceptations."
      );
    } finally {
      setExportEnCours(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6">
      <header className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 bg-violet-600" />

        <div className="bg-gradient-to-br from-violet-50 via-white to-white p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-2xl text-white shadow-sm">
                ✍️
              </div>

              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">
                  Sécurité & conformité
                </p>

                <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  Acceptations contractuelles
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  Consultez les preuves d’acceptation des CGU,
                  de la Politique de confidentialité et des CGV
                  enregistrées pour votre entreprise.
                </p>
              </div>
            </div>

            <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto">
              <button
                type="button"
                onClick={() =>
                  void chargerAcceptations(
                    false
                  )
                }
                disabled={
                  actualisation ||
                  exportEnCours
                }
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span aria-hidden="true">
                  ↻
                </span>
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
        <CarteStatistique
          label="Acceptations"
          valeur={statistiques.total}
          description="Résultats affichés"
        />

        <CarteStatistique
          label="CGU"
          valeur={statistiques.cgu}
          description="Acceptations d’utilisation"
        />

        <CarteStatistique
          label="Confidentialité"
          valeur={
            statistiques.confidentialite
          }
          description="Lectures confirmées"
        />

        <CarteStatistique
          label="CGV"
          valeur={statistiques.cgv}
          description="Souscriptions validées"
        />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-4 lg:grid-cols-4">
          <label>
            <span className="text-sm font-medium text-slate-700">
              Document
            </span>

            <select
              value={typeDocument}
              onChange={(event) =>
                setTypeDocument(
                  event.target.value
                )
              }
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
            >
              <option value="tous">
                Tous les documents
              </option>
              <option value="cgu">
                CGU
              </option>
              <option value="politique_confidentialite">
                Politique de confidentialité
              </option>
              <option value="cgv">
                CGV
              </option>
            </select>
          </label>

          <label>
            <span className="text-sm font-medium text-slate-700">
              Contexte
            </span>

            <select
              value={contexte}
              onChange={(event) =>
                setContexte(
                  event.target.value
                )
              }
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
            >
              <option value="tous">
                Tous les contextes
              </option>
              <option value="inscription">
                Inscription
              </option>
              <option value="souscription">
                Souscription
              </option>
            </select>
          </label>

          <label>
            <span className="text-sm font-medium text-slate-700">
              Recherche
            </span>

            <input
              type="search"
              value={recherche}
              onChange={(event) =>
                setRecherche(
                  event.target.value
                )
              }
              placeholder="Nom, email, version, plan…"
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
            />
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() =>
                void exporterCsv()
              }
              disabled={
                exportEnCours ||
                chargement ||
                acceptations.length === 0
              }
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {exportEnCours
                ? "Export en cours…"
                : "Exporter en CSV"}
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {chargement ? (
          <div className="p-10 text-center">
            <div className="text-3xl">
              ⏳
            </div>
            <p className="mt-3 font-semibold text-slate-900">
              Chargement des acceptations…
            </p>
          </div>
        ) : acceptations.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-3xl">
              ✍️
            </div>
            <p className="mt-3 font-semibold text-slate-900">
              Aucune acceptation enregistrée
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Les prochaines inscriptions et souscriptions apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {acceptations.map(
              (acceptation) => {
                const plan =
                  String(
                    acceptation.details
                      ?.plan || ""
                  );

                const frequence =
                  String(
                    acceptation.details
                      ?.frequence || ""
                  );

                return (
                  <article
                    key={acceptation.id}
                    className="p-5 sm:p-6"
                  >
                    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-bold text-slate-950">
                            {acceptation.utilisateur_nom ||
                              acceptation.utilisateur_email ||
                              "Utilisateur"}
                          </h2>

                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${classeDocument(
                              acceptation.type_document
                            )}`}
                          >
                            {libelleDocument(
                              acceptation.type_document
                            )}
                          </span>

                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                            {libelleContexte(
                              acceptation.contexte
                            )}
                          </span>
                        </div>

                        {acceptation.utilisateur_email ? (
                          <p className="mt-1 break-all text-sm text-slate-500">
                            {
                              acceptation.utilisateur_email
                            }
                          </p>
                        ) : null}

                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                          <span>
                            Version :{" "}
                            <strong className="font-semibold text-slate-700">
                              {
                                acceptation.version_document
                              }
                            </strong>
                          </span>

                          <span>
                            Source :{" "}
                            <strong className="font-semibold text-slate-700">
                              {
                                acceptation.source
                              }
                            </strong>
                          </span>

                          {plan ? (
                            <span>
                              Plan :{" "}
                              <strong className="font-semibold capitalize text-slate-700">
                                {plan}
                              </strong>
                            </span>
                          ) : null}

                          {frequence ? (
                            <span>
                              Fréquence :{" "}
                              <strong className="font-semibold capitalize text-slate-700">
                                {frequence}
                              </strong>
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <time
                        dateTime={
                          acceptation.acceptee_at
                        }
                        className="shrink-0 text-xs font-medium text-slate-500"
                      >
                        {formatDate(
                          acceptation.acceptee_at
                        )}
                      </time>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 sm:p-6">
        <p className="font-black text-blue-950">
          Conservation des preuves
        </p>

        <p className="mt-2 text-sm leading-6 text-blue-800">
          Cet historique est en lecture seule. Les preuves sont créées côté
          serveur avec la version du document et l’horodatage enregistrés
          au moment de l’acceptation.
        </p>
      </section>
    </main>
  );
}

function CarteStatistique({
  label,
  valeur,
  description,
}: {
  label: string;
  valeur: number;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black text-slate-950">
        {valeur}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {description}
      </p>
    </div>
  );
}