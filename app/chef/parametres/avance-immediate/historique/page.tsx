"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabaseClient";

type LigneHistorique = {
  id: string;
  type: "client" | "demande";
  client_id: string;
  client_nom: string;
  client_email: string | null;
  statut: string;
  reference_urssaf: string | null;
  message: string | null;
  date_creation: string | null;
  date_mise_a_jour: string | null;
  derniere_verification: string | null;
  facture_id: string | null;
  numero_facture: string | null;
  date_facture: string | null;
  date_debut_emploi: string | null;
  date_fin_emploi: string | null;
  montant_ht: number | null;
  montant_tva: number | null;
  montant_ttc: number | null;
  montant_acompte: number | null;
  rapproche: boolean;
  montant_rapproche: number | null;
  date_rapprochement: string | null;
  info_rejet:
    | Record<string, unknown>
    | null;
  info_virement:
    | Record<string, unknown>
    | null;
};

type StatistiquesHistorique = {
  dossiers_clients: number;
  demandes_paiement: number;
  demandes_payees: number;
  demandes_impayees: number;
  virements_rapproches: number;
};

type ReponseHistorique = {
  succes?: boolean;
  historique?: LigneHistorique[];
  statistiques?:
    StatistiquesHistorique;
  pagination?: {
    total: number;
    limite: number;
    tronque: boolean;
  };
  erreur?: string;
};

type FiltreType =
  | "tous"
  | "client"
  | "demande";

function normaliser(
  valeur: string | null | undefined
) {
  return String(valeur || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function formatMontant(
  montant:
    | number
    | null
    | undefined
) {
  if (
    montant === null ||
    montant === undefined
  ) {
    return "—";
  }

  return new Intl.NumberFormat(
    "fr-FR",
    {
      style: "currency",
      currency: "EUR",
    }
  ).format(montant);
}

function formatDate(
  date:
    | string
    | null
    | undefined,
  avecHeure = false
) {
  if (!date) return "—";

  try {
    return new Intl.DateTimeFormat(
      "fr-FR",
      avecHeure
        ? {
            dateStyle: "medium",
            timeStyle: "short",
          }
        : {
            dateStyle: "medium",
          }
    ).format(new Date(date));
  } catch {
    return "—";
  }
}

function libelleType(
  type: LigneHistorique["type"]
) {
  return type === "client"
    ? "Inscription client"
    : "Demande de paiement";
}

function libelleStatut(
  statut: string
) {
  const libelles:
    Record<string, string> = {
      brouillon: "Brouillon",
      pret: "Prêt",
      prete: "Prête",
      appareillage_en_cours:
        "Activation en cours",
      actif: "Actif",
      refuse: "Refusé",
      erreur: "Erreur",
      transmise: "Transmise",
      payee: "Payée",
      impayee: "Impayée",
      annulee: "Annulée",
    };

  return (
    libelles[statut] ||
    statut ||
    "Inconnu"
  );
}

function classesStatut(
  statut: string
) {
  if (
    statut === "actif" ||
    statut === "payee"
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    statut === "transmise" ||
    statut === "pret" ||
    statut === "prete" ||
    statut ===
      "appareillage_en_cours"
  ) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (
    statut === "refuse" ||
    statut === "erreur" ||
    statut === "impayee" ||
    statut === "annulee"
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function echapperCsv(
  valeur: unknown
) {
  const texte = String(
    valeur ?? ""
  );

  return `"${texte.replace(
    /"/g,
    '""'
  )}"`;
}

export default function HistoriqueAvanceImmediatePage() {
  const [
    lignes,
    setLignes,
  ] = useState<LigneHistorique[]>([]);

  const [
    statistiques,
    setStatistiques,
  ] =
    useState<StatistiquesHistorique>({
      dossiers_clients: 0,
      demandes_paiement: 0,
      demandes_payees: 0,
      demandes_impayees: 0,
      virements_rapproches: 0,
    });

  const [
    chargement,
    setChargement,
  ] = useState(true);

  const [
    erreur,
    setErreur,
  ] = useState("");

  const [
    recherche,
    setRecherche,
  ] = useState("");

  const [
    filtreType,
    setFiltreType,
  ] =
    useState<FiltreType>("tous");

  const [
    filtreStatut,
    setFiltreStatut,
  ] = useState("tous");

  const [
    tronque,
    setTronque,
  ] = useState(false);

  useEffect(() => {
    void chargerHistorique();
  }, []);

  async function obtenirJeton() {
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
        "Session expirée. Veuillez vous reconnecter."
      );
    }

    return session.access_token;
  }

  async function chargerHistorique() {
    try {
      setChargement(true);
      setErreur("");

      const jeton =
        await obtenirJeton();

      const reponse = await fetch(
        "/api/integrations/urssaf/historique?limite=1000",
        {
          headers: {
            Authorization:
              `Bearer ${jeton}`,
          },
          cache: "no-store",
        }
      );

      const donnees =
        (await reponse.json().catch(
          () => null
        )) as
          | ReponseHistorique
          | null;

      if (
        !reponse.ok ||
        !donnees?.succes
      ) {
        setErreur(
          donnees?.erreur ||
            "Impossible de charger l’historique Avance immédiate."
        );
        return;
      }

      setLignes(
        donnees.historique || []
      );

      if (donnees.statistiques) {
        setStatistiques(
          donnees.statistiques
        );
      }

      setTronque(
        Boolean(
          donnees.pagination
            ?.tronque
        )
      );
    } catch (error) {
      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible de charger l’historique Avance immédiate."
      );
    } finally {
      setChargement(false);
    }
  }

  const statutsDisponibles =
    useMemo(() => {
      const statuts = [
        ...new Set(
          lignes
            .filter(
              (ligne) =>
                filtreType ===
                  "tous" ||
                ligne.type ===
                  filtreType
            )
            .map(
              (ligne) =>
                ligne.statut
            )
        ),
      ].sort();

      return statuts;
    }, [lignes, filtreType]);

  const lignesFiltrees =
    useMemo(() => {
      const texteRecherche =
        normaliser(recherche);

      return lignes.filter(
        (ligne) => {
          const correspondType =
            filtreType ===
              "tous" ||
            ligne.type ===
              filtreType;

          const correspondStatut =
            filtreStatut ===
              "tous" ||
            ligne.statut ===
              filtreStatut;

          const zoneRecherche =
            normaliser(
              [
                ligne.client_nom,
                ligne.client_email,
                ligne.numero_facture,
                ligne.reference_urssaf,
                ligne.message,
                ligne.statut,
              ].join(" ")
            );

          const correspondRecherche =
            !texteRecherche ||
            zoneRecherche.includes(
              texteRecherche
            );

          return (
            correspondType &&
            correspondStatut &&
            correspondRecherche
          );
        }
      );
    }, [
      lignes,
      filtreType,
      filtreStatut,
      recherche,
    ]);

  function changerType(
    type: FiltreType
  ) {
    setFiltreType(type);
    setFiltreStatut("tous");
  }

  function exporterCsv() {
    if (
      lignesFiltrees.length === 0
    ) {
      setErreur(
        "Aucune ligne à exporter avec les filtres actuels."
      );
      return;
    }

    setErreur("");

    const entetes = [
      "Type",
      "Client",
      "Email",
      "Statut",
      "Facture",
      "Date facture",
      "Période début",
      "Période fin",
      "Montant HT",
      "TVA",
      "Montant TTC",
      "Acompte",
      "Référence URSSAF",
      "Rapproché",
      "Montant rapproché",
      "Date rapprochement",
      "Dernière vérification",
      "Message",
    ];

    const lignesCsv =
      lignesFiltrees.map(
        (ligne) => [
          libelleType(
            ligne.type
          ),
          ligne.client_nom,
          ligne.client_email || "",
          libelleStatut(
            ligne.statut
          ),
          ligne.numero_facture || "",
          ligne.date_facture || "",
          ligne.date_debut_emploi || "",
          ligne.date_fin_emploi || "",
          ligne.montant_ht ?? "",
          ligne.montant_tva ?? "",
          ligne.montant_ttc ?? "",
          ligne.montant_acompte ?? "",
          ligne.reference_urssaf ||
            "",
          ligne.rapproche
            ? "Oui"
            : "Non",
          ligne.montant_rapproche ??
            "",
          ligne.date_rapprochement ||
            "",
          ligne.derniere_verification ||
            "",
          ligne.message || "",
        ]
          .map(echapperCsv)
          .join(";")
      );

    const contenu = [
      entetes
        .map(echapperCsv)
        .join(";"),
      ...lignesCsv,
    ].join("\n");

    const blob = new Blob(
      [
        "\uFEFF",
        contenu,
      ],
      {
        type:
          "text/csv;charset=utf-8",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const lien =
      document.createElement("a");

    lien.href = url;
    lien.download =
      `arboboard-historique-urssaf-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;

    document.body.appendChild(
      lien
    );
    lien.click();
    lien.remove();

    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <Link
              href="/chef/parametres/avance-immediate"
              className="text-sm font-semibold text-blue-700 hover:underline"
            >
              ← Retour à l’Avance immédiate
            </Link>

            <p className="mt-5 text-sm font-semibold text-blue-700">
              Suivi détaillé URSSAF
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              Historique Avance immédiate
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Retrouvez les inscriptions des particuliers, les demandes
              de paiement, leur statut et les virements rapprochés.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() =>
                void chargerHistorique()
              }
              disabled={chargement}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {chargement
                ? "Actualisation…"
                : "Actualiser"}
            </button>

            <button
              type="button"
              onClick={
                exporterCsv
              }
              disabled={
                chargement ||
                lignesFiltrees.length ===
                  0
              }
              className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Exporter en CSV
            </button>
          </div>
        </div>
      </header>

      {erreur ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erreur}
        </div>
      ) : null}

      {tronque ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          L’affichage est limité aux 1 000 éléments les plus récents.
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <CarteStatistique
          label="Dossiers clients"
          valeur={
            statistiques
              .dossiers_clients
          }
          variante="bleu"
        />

        <CarteStatistique
          label="Demandes"
          valeur={
            statistiques
              .demandes_paiement
          }
          variante="slate"
        />

        <CarteStatistique
          label="Payées"
          valeur={
            statistiques
              .demandes_payees
          }
          variante="vert"
        />

        <CarteStatistique
          label="Impayées"
          valeur={
            statistiques
              .demandes_impayees
          }
          variante={
            statistiques
                .demandes_impayees >
              0
              ? "rouge"
              : "vert"
          }
        />

        <CarteStatistique
          label="Virements rapprochés"
          valeur={
            statistiques
              .virements_rapproches
          }
          variante="violet"
        />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <BoutonType
              actif={
                filtreType ===
                "tous"
              }
              onClick={() =>
                changerType("tous")
              }
            >
              Tout
            </BoutonType>

            <BoutonType
              actif={
                filtreType ===
                "client"
              }
              onClick={() =>
                changerType(
                  "client"
                )
              }
            >
              Inscriptions clients
            </BoutonType>

            <BoutonType
              actif={
                filtreType ===
                "demande"
              }
              onClick={() =>
                changerType(
                  "demande"
                )
              }
            >
              Demandes de paiement
            </BoutonType>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_260px_auto]">
            <input
              value={recherche}
              onChange={(event) =>
                setRecherche(
                  event.target.value
                )
              }
              placeholder="Rechercher un client, une facture ou une référence URSSAF…"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />

            <select
              value={filtreStatut}
              onChange={(event) =>
                setFiltreStatut(
                  event.target.value
                )
              }
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
              <option value="tous">
                Tous les statuts
              </option>

              {statutsDisponibles.map(
                (statut) => (
                  <option
                    key={statut}
                    value={statut}
                  >
                    {libelleStatut(
                      statut
                    )}
                  </option>
                )
              )}
            </select>

            <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              {lignesFiltrees.length} résultat(s)
            </div>
          </div>
        </div>
      </section>

      {chargement ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="font-semibold text-slate-900">
            Chargement de l’historique…
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Récupération des données Avance immédiate.
          </p>
        </section>
      ) : lignesFiltrees.length ===
        0 ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
            ⚡
          </div>
          <p className="mt-4 font-semibold text-slate-900">
            Aucun élément trouvé
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Modifiez les filtres ou créez un premier dossier Avance immédiate.
          </p>
        </section>
      ) : (
        <>
          <section className="hidden overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:block">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-4">
                      Type
                    </th>
                    <th className="px-5 py-4">
                      Client
                    </th>
                    <th className="px-5 py-4">
                      Facture / montant
                    </th>
                    <th className="px-5 py-4">
                      Statut
                    </th>
                    <th className="px-5 py-4">
                      Référence URSSAF
                    </th>
                    <th className="px-5 py-4">
                      Mise à jour
                    </th>
                    <th className="px-5 py-4 text-right">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {lignesFiltrees.map(
                    (ligne) => (
                      <LigneTableau
                        key={`${ligne.type}-${ligne.id}`}
                        ligne={ligne}
                      />
                    )
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3 lg:hidden">
            {lignesFiltrees.map(
              (ligne) => (
                <CarteMobile
                  key={`${ligne.type}-${ligne.id}`}
                  ligne={ligne}
                />
              )
            )}
          </section>
        </>
      )}
    </main>
  );
}

function BoutonType({
  actif,
  onClick,
  children,
}: {
  actif: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
        actif
          ? "border-blue-700 bg-blue-700 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function CarteStatistique({
  label,
  valeur,
  variante,
}: {
  label: string;
  valeur: number;
  variante:
    | "bleu"
    | "slate"
    | "vert"
    | "rouge"
    | "violet";
}) {
  const classes = {
    bleu:
      "border-blue-200 bg-blue-50 text-blue-800",
    slate:
      "border-slate-200 bg-white text-slate-900",
    vert:
      "border-emerald-200 bg-emerald-50 text-emerald-800",
    rouge:
      "border-red-200 bg-red-50 text-red-800",
    violet:
      "border-violet-200 bg-violet-50 text-violet-800",
  }[variante];

  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${classes}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide opacity-75">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black">
        {valeur}
      </p>
    </div>
  );
}

function LigneTableau({
  ligne,
}: {
  ligne: LigneHistorique;
}) {
  return (
    <tr className="align-top">
      <td className="px-5 py-4">
        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
          {libelleType(
            ligne.type
          )}
        </span>
      </td>

      <td className="px-5 py-4">
        <p className="font-semibold text-slate-950">
          {ligne.client_nom}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {ligne.client_email ||
            "Email non renseigné"}
        </p>
      </td>

      <td className="px-5 py-4">
        {ligne.type ===
        "demande" ? (
          <>
            <p className="font-semibold text-slate-950">
              {ligne.numero_facture ||
                "Sans numéro"}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {formatMontant(
                ligne.montant_ttc
              )}
            </p>
            {ligne.rapproche ? (
              <p className="mt-1 text-xs font-semibold text-emerald-700">
                Rapproché le{" "}
                {formatDate(
                  ligne.date_rapprochement
                )}
              </p>
            ) : null}
          </>
        ) : (
          <span className="text-sm text-slate-400">
            —
          </span>
        )}
      </td>

      <td className="px-5 py-4">
        <span
          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${classesStatut(
            ligne.statut
          )}`}
        >
          {libelleStatut(
            ligne.statut
          )}
        </span>

        {ligne.type ===
          "demande" &&
        ligne.statut === "payee" &&
        !ligne.rapproche ? (
          <p className="mt-2 text-xs font-semibold text-blue-700">
            Virement à rapprocher
          </p>
        ) : null}
      </td>

      <td className="max-w-[220px] px-5 py-4">
        <p className="break-all font-mono text-xs text-slate-700">
          {ligne.reference_urssaf ||
            "—"}
        </p>
        {ligne.message ? (
          <p
            title={ligne.message}
            className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500"
          >
            {ligne.message}
          </p>
        ) : null}
      </td>

      <td className="px-5 py-4 text-sm text-slate-600">
        {formatDate(
          ligne.date_mise_a_jour ||
            ligne.date_creation,
          true
        )}
      </td>

      <td className="px-5 py-4 text-right">
        <Link
          href={
            ligne.type ===
            "client"
              ? "/chef/clients"
              : "/chef/factures"
          }
          className="inline-flex rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          {ligne.type ===
          "client"
            ? "Voir le client"
            : "Voir la facture"}
        </Link>
      </td>
    </tr>
  );
}

function CarteMobile({
  ligne,
}: {
  ligne: LigneHistorique;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
          {libelleType(
            ligne.type
          )}
        </span>

        <span
          className={`rounded-full border px-3 py-1 text-xs font-bold ${classesStatut(
            ligne.statut
          )}`}
        >
          {libelleStatut(
            ligne.statut
          )}
        </span>
      </div>

      <h2 className="mt-4 text-lg font-bold text-slate-950">
        {ligne.client_nom}
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        {ligne.client_email ||
          "Email non renseigné"}
      </p>

      {ligne.type ===
      "demande" ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">
              Facture
            </p>
            <p className="mt-1 font-semibold text-slate-900">
              {ligne.numero_facture ||
                "Sans numéro"}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">
              Montant TTC
            </p>
            <p className="mt-1 font-semibold text-slate-900">
              {formatMontant(
                ligne.montant_ttc
              )}
            </p>
          </div>
        </div>
      ) : null}

      {ligne.reference_urssaf ? (
        <div className="mt-4 rounded-2xl bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Référence URSSAF
          </p>
          <p className="mt-1 break-all font-mono text-xs text-slate-700">
            {ligne.reference_urssaf}
          </p>
        </div>
      ) : null}

      {ligne.message ? (
        <div className="mt-3 rounded-2xl bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Dernier message
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-700">
            {ligne.message}
          </p>
        </div>
      ) : null}

      {ligne.rapproche ? (
        <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
          Virement rapproché le{" "}
          {formatDate(
            ligne.date_rapprochement
          )}
        </div>
      ) : ligne.type ===
          "demande" &&
        ligne.statut ===
          "payee" ? (
        <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-700">
          Virement à rapprocher
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Mis à jour le{" "}
          {formatDate(
            ligne.date_mise_a_jour ||
              ligne.date_creation,
            true
          )}
        </p>

        <Link
          href={
            ligne.type ===
            "client"
              ? "/chef/clients"
              : "/chef/factures"
          }
          className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Ouvrir
        </Link>
      </div>
    </article>
  );
}