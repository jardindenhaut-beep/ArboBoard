"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { chargerContexteEntreprise } from "@/lib/entreprise";
import { journaliserActivite } from "@/lib/journalActivite";
import { supabase } from "@/lib/supabaseClient";

type StatutConformite =
  | "À configurer"
  | "À contrôler"
  | "Actif"
  | "Publié"
  | "En préparation";

type TypeDocumentJuridique =
  | "mentions_legales"
  | "politique_confidentialite"
  | "cgu"
  | "cgv";

type BlocConformite = {
  id: string;
  titre: string;
  description: string;
  emoji: string;
  statut: StatutConformite;
  details: string[];
  typeDocument?: TypeDocumentJuridique;
  cheminPublic?: string;
};

type ResultatJournal =
  | "succes"
  | "echec"
  | "information";

type EvenementJournal = {
  id: string;
  utilisateur_id?: string | null;
  utilisateur_email?: string | null;
  utilisateur_nom?: string | null;
  action: string;
  categorie: string;
  ressource_type?: string | null;
  ressource_id?: string | null;
  resultat: ResultatJournal;
  description?: string | null;
  details?: Record<string, unknown> | null;
  created_at: string;
};

type ReponseJournal = {
  evenements?: EvenementJournal[];
  retention_jours?: number;
  erreur?: string;
};

type StatutDocumentJuridique = {
  type_document: TypeDocumentJuridique;
  titre?: string | null;
  version?: string | null;
  publie_at?: string | null;
  publie: boolean;
};

type ReponseStatutsDocuments = {
  documents?: StatutDocumentJuridique[];
  erreur?: string;
};

type ResultatContexteEntreprise = Awaited<
  ReturnType<typeof chargerContexteEntreprise>
>;

type ContexteEntrepriseBrut = NonNullable<
  ResultatContexteEntreprise["contexte"]
>;

type EntrepriseContexte = NonNullable<
  ContexteEntrepriseBrut["entreprise"]
> & {
  plan_abonnement?: string | null;
};

const BLOCS: BlocConformite[] = [
  {
    id: "securite-compte",
    titre: "Sécurité du compte",
    description:
      "Mot de passe, informations de connexion et gestion des sessions.",
    emoji: "🔐",
    statut: "Actif",
    details: [
      "Modification sécurisée du mot de passe connecté.",
      "Révocation des sessions ouvertes sur les autres appareils.",
      "Journalisation des opérations sensibles du compte.",
    ],
  },
  {
    id: "sauvegardes",
    titre: "Sauvegardes",
    description:
      "Export manuel des données de l’entreprise et historique de contrôle.",
    emoji: "💾",
    statut: "Actif",
    details: [
      "Export JSON isolé pour chaque entreprise.",
      "Empreinte SHA-256 et taille enregistrées dans l’historique.",
      "Sauvegardes physiques de la plateforme gérées séparément.",
    ],
  },
  {
    id: "rgpd",
    titre: "RGPD",
    description:
      "Export personnel et suivi des demandes d’exercice de droits.",
    emoji: "🇪🇺",
    statut: "Actif",
    details: [
      "Téléchargement JSON des données personnelles du compte.",
      "Demandes d’accès, rectification, effacement, limitation, opposition et portabilité.",
      "Suivi des échéances, réponses et éventuelles prolongations.",
    ],
  },
  {
    id: "mentions-legales",
    titre: "Mentions légales",
    description:
      "Informations officielles concernant l’éditeur et l’hébergement d’Arboboard.",
    emoji: "🏢",
    statut: "En préparation",
    typeDocument: "mentions_legales",
    cheminPublic: "/mentions-legales",
    details: [
      "Document rédigé et publié par l’éditeur Arboboard.",
      "Accessible sans connexion depuis le site public.",
      "Aucune modification n’est demandée aux entreprises clientes.",
    ],
  },
  {
    id: "confidentialite",
    titre: "Politique de confidentialité",
    description:
      "Informations relatives aux données traitées par la plateforme Arboboard.",
    emoji: "🔏",
    statut: "En préparation",
    typeDocument: "politique_confidentialite",
    cheminPublic: "/politique-confidentialite",
    details: [
      "Document commun à tous les utilisateurs d’Arboboard.",
      "Présente les traitements, les prestataires et les droits.",
      "Publié et maintenu uniquement par l’éditeur.",
    ],
  },
  {
    id: "cgu",
    titre: "Conditions générales d’utilisation",
    description:
      "Règles d’accès et d’utilisation du logiciel Arboboard.",
    emoji: "📘",
    statut: "En préparation",
    typeDocument: "cgu",
    cheminPublic: "/cgu",
    details: [
      "Conditions communes à l’utilisation de la plateforme.",
      "Consultables par tous les utilisateurs autorisés.",
      "La publication est administrée uniquement par Arboboard.",
    ],
  },
  {
    id: "cgv",
    titre: "Conditions générales de vente",
    description:
      "Offres, abonnements, paiements, renouvellements et résiliations Arboboard.",
    emoji: "🧾",
    statut: "En préparation",
    typeDocument: "cgv",
    cheminPublic: "/cgv",
    details: [
      "Conditions applicables aux abonnements Arboboard.",
      "Les chefs clients peuvent uniquement les consulter.",
      "Les modifications et publications sont réservées à l’éditeur.",
    ],
  },
  {
    id: "consentements",
    titre: "Gestion des consentements",
    description:
      "Choix facultatifs, preuve horodatée et retrait depuis le compte.",
    emoji: "✅",
    statut: "Actif",
    details: [
      "Séparation claire des traitements nécessaires et facultatifs.",
      "Historique de chaque accord, refus et retrait.",
      "Version du texte et signaux techniques minimisés enregistrés.",
    ],
  },
  {
    id: "acceptations-contractuelles",
    titre: "Acceptations contractuelles",
    description:
      "Preuves d’acceptation des CGU, de la Politique de confidentialité et des CGV.",
    emoji: "✍️",
    statut: "Actif",
    details: [
      "Version exacte du document acceptée par l’utilisateur.",
      "Horodatage serveur de l’inscription ou de la souscription.",
      "Historique en lecture seule et exportable au format CSV.",
    ],
  },
  {
    id: "journal",
    titre: "Journal d’activité",
    description:
      "Traçabilité sécurisée des actions sensibles réalisées dans l’application.",
    emoji: "📋",
    statut: "Actif",
    details: [
      "Écritures réalisées uniquement par une route serveur sécurisée.",
      "Lecture limitée aux chefs de la même entreprise.",
      "Conservation technique prévue sur 365 jours.",
    ],
  },
];

const CATEGORIES = [
  { valeur: "toutes", label: "Toutes les catégories" },
  { valeur: "authentification", label: "Authentification" },
  { valeur: "clients", label: "Clients" },
  { valeur: "devis", label: "Devis" },
  { valeur: "factures", label: "Factures" },
  { valeur: "interventions", label: "Interventions" },
  { valeur: "planning", label: "Planning" },
  { valeur: "parametres", label: "Paramètres" },
  { valeur: "securite", label: "Sécurité" },
  { valeur: "systeme", label: "Système" },
];

function classesStatut(statut: StatutConformite) {
  if (statut === "Actif" || statut === "Publié") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (
    statut === "À contrôler" ||
    statut === "En préparation"
  ) {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-slate-100 text-slate-700";
}

function normaliserTexte(valeur: string | null | undefined) {
  return String(valeur || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function formatDatePublication(
  date: string | null | undefined
) {
  if (!date) return null;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  }).format(new Date(date));
}

function classesResultat(resultat: ResultatJournal) {
  if (resultat === "echec") {
    return "bg-red-50 text-red-700";
  }

  if (resultat === "information") {
    return "bg-blue-50 text-blue-700";
  }

  return "bg-emerald-50 text-emerald-700";
}

function libelleResultat(resultat: ResultatJournal) {
  if (resultat === "echec") return "Échec";
  if (resultat === "information") return "Information";
  return "Succès";
}

function libelleCategorie(categorie: string) {
  return (
    CATEGORIES.find((item) => item.valeur === categorie)
      ?.label || categorie
  );
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(date));
}

function echapperCsv(valeur: unknown) {
  const texte =
    valeur === null || valeur === undefined
      ? ""
      : String(valeur);

  return `"${texte.replace(/"/g, '""')}"`;
}

export default function SecuriteChefPage() {
  const [evenements, setEvenements] =
    useState<EvenementJournal[]>([]);
  const [chargementJournal, setChargementJournal] =
    useState(true);
  const [erreurJournal, setErreurJournal] = useState("");
  const [categorie, setCategorie] = useState("toutes");
  const [resultat, setResultat] = useState("tous");
  const [retentionJours, setRetentionJours] = useState(365);
  const [compteDeveloppeur, setCompteDeveloppeur] =
    useState(false);
  const [statutsDocuments, setStatutsDocuments] = useState<
    StatutDocumentJuridique[]
  >([]);
  const [chargementConformite, setChargementConformite] =
    useState(true);
  const [erreurConformite, setErreurConformite] = useState("");
  const [actualisationGlobale, setActualisationGlobale] =
    useState(false);
  const [exportEnCours, setExportEnCours] = useState(false);
  const [rechercheJournal, setRechercheJournal] = useState("");
  const [messageSucces, setMessageSucces] = useState("");

  const evenementsAffiches = useMemo(() => {
    const recherche = normaliserTexte(rechercheJournal);

    if (!recherche) {
      return evenements;
    }

    return evenements.filter((evenement) => {
      const contenu = normaliserTexte(
        [
          evenement.action,
          evenement.description,
          evenement.utilisateur_nom,
          evenement.utilisateur_email,
          evenement.categorie,
          evenement.ressource_type,
          evenement.ressource_id,
        ]
          .filter(Boolean)
          .join(" ")
      );

      return contenu.includes(recherche);
    });
  }, [evenements, rechercheJournal]);

  const statistiques = useMemo(() => {
    return {
      total: evenementsAffiches.length,
      succes: evenementsAffiches.filter(
        (evenement) => evenement.resultat === "succes"
      ).length,
      echecs: evenementsAffiches.filter(
        (evenement) => evenement.resultat === "echec"
      ).length,
      informations: evenementsAffiches.filter(
        (evenement) =>
          evenement.resultat === "information"
      ).length,
    };
  }, [evenementsAffiches]);

  const blocsAffiches = useMemo(() => {
    return BLOCS.map((bloc) => {
      if (!bloc.typeDocument) return bloc;

      const document = statutsDocuments.find(
        (element) =>
          element.type_document === bloc.typeDocument
      );

      if (!document?.publie) {
        return {
          ...bloc,
          statut: "En préparation" as StatutConformite,
        };
      }

      const datePublication = formatDatePublication(
        document.publie_at
      );

      return {
        ...bloc,
        statut: "Publié" as StatutConformite,
        details: [
          `Version publiée : ${document.version || "non renseignée"}.`,
          datePublication
            ? `Dernière publication : ${datePublication}.`
            : "Document disponible publiquement.",
          "Le document est maintenu par l’éditeur Arboboard.",
        ],
      };
    });
  }, [statutsDocuments]);

  const statistiquesConformite = useMemo(() => {
    const conformes = blocsAffiches.filter(
      (bloc) =>
        bloc.statut === "Actif" ||
        bloc.statut === "Publié"
    ).length;

    const documentsJuridiques = blocsAffiches.filter(
      (bloc) => Boolean(bloc.typeDocument)
    );

    const documentsPublies = documentsJuridiques.filter(
      (bloc) => bloc.statut === "Publié"
    ).length;

    return {
      conformes,
      total: blocsAffiches.length,
      pourcentage:
        blocsAffiches.length > 0
          ? Math.round(
              (conformes / blocsAffiches.length) * 100
            )
          : 0,
      documentsPublies,
      documentsTotal: documentsJuridiques.length,
    };
  }, [blocsAffiches]);

  useEffect(() => {
    void initialiserConformite();
  }, []);

  useEffect(() => {
    void chargerJournal();
  }, [categorie, resultat]);

  async function initialiserConformite() {
    try {
      setChargementConformite(true);
      setErreurConformite("");

      const resultatContexte =
        await chargerContexteEntreprise();

      const entreprise =
        resultatContexte.contexte?.entreprise as
          | EntrepriseContexte
          | null
          | undefined;

      setCompteDeveloppeur(
        normaliserTexte(entreprise?.plan_abonnement) ===
          "dev"
      );

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        setErreurConformite(
          "La session ne permet pas de vérifier les documents juridiques publiés."
        );
        return;
      }

      const reponse = await fetch(
        "/api/documents-juridiques-publics",
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        }
      );

      const donnees =
        (await reponse.json()) as ReponseStatutsDocuments;

      if (!reponse.ok) {
        const message =
          donnees.erreur ||
          "Les statuts des documents juridiques sont indisponibles.";

        setErreurConformite(message);
        return;
      }

      setStatutsDocuments(donnees.documents || []);
    } catch (error) {
      setErreurConformite(
        error instanceof Error
          ? error.message
          : "Impossible de vérifier la conformité."
      );
    } finally {
      setChargementConformite(false);
    }
  }

  async function actualiserTout() {
    try {
      setActualisationGlobale(true);
      setMessageSucces("");

      await Promise.all([
        initialiserConformite(),
        chargerJournal(),
      ]);

      setMessageSucces(
        "Les informations de sécurité et de conformité ont été actualisées."
      );
    } finally {
      setActualisationGlobale(false);
    }
  }

  async function chargerJournal() {
    try {
      setChargementJournal(true);
      setErreurJournal("");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error(
          "Votre session a expiré. Veuillez vous reconnecter."
        );
      }

      const parametres = new URLSearchParams({
        limite: "50",
        categorie,
        resultat,
      });

      const reponse = await fetch(
        `/api/securite/journal-activite?${parametres.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        }
      );

      const donnees =
        (await reponse.json()) as ReponseJournal;

      if (!reponse.ok) {
        throw new Error(
          donnees.erreur ||
            "Impossible de charger le journal d’activité."
        );
      }

      setEvenements(donnees.evenements || []);
      setRetentionJours(donnees.retention_jours || 365);
    } catch (error) {
      console.error("Erreur chargement journal :", error);
      setEvenements([]);
      setErreurJournal(
        error instanceof Error
          ? error.message
          : "Impossible de charger le journal d’activité."
      );
    } finally {
      setChargementJournal(false);
    }
  }

  async function exporterJournalCsv() {
    if (evenementsAffiches.length === 0) return;

    try {
      setExportEnCours(true);
      setErreurJournal("");
      setMessageSucces("");

      const entetes = [
        "Date",
        "Utilisateur",
        "Email",
        "Catégorie",
        "Action",
        "Résultat",
        "Ressource",
        "Identifiant ressource",
        "Description",
      ];

      const lignes = evenementsAffiches.map((evenement) => [
        formatDate(evenement.created_at),
        evenement.utilisateur_nom || "",
        evenement.utilisateur_email || "",
        libelleCategorie(evenement.categorie),
        evenement.action,
        libelleResultat(evenement.resultat),
        evenement.ressource_type || "",
        evenement.ressource_id || "",
        evenement.description || "",
      ]);

      const contenu = [
      entetes.map(echapperCsv).join(";"),
      ...lignes.map((ligne) =>
        ligne.map(echapperCsv).join(";")
      ),
    ].join("\n");

      const blob = new Blob(
        [`\uFEFF${contenu}`],
        {
          type: "text/csv;charset=utf-8",
        }
      );

      const url = URL.createObjectURL(blob);
      const lien = document.createElement("a");

      lien.href = url;
      lien.download = `journal-activite-arboboard-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;

      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      URL.revokeObjectURL(url);

      await journaliserActivite({
        action: "journal_activite_exporte",
        categorie: "securite",
        resultat: "succes",
        ressource_type: "journal_activite",
        description:
          "Export CSV du journal d’activité depuis l’espace Sécurité.",
        details: {
          nombre_evenements: evenementsAffiches.length,
          filtre_categorie: categorie,
          filtre_resultat: resultat,
          recherche: rechercheJournal.trim() || null,
        },
      });

      setMessageSucces(
        `${evenementsAffiches.length} événement(s) exporté(s) au format CSV.`
      );

      await chargerJournal();
    } catch (error) {
      console.error("Erreur export journal :", error);

      setErreurJournal(
        error instanceof Error
          ? error.message
          : "Impossible d’exporter le journal d’activité."
      );
    } finally {
      setExportEnCours(false);
    }
  }

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <header className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 bg-emerald-600" />

        <div className="bg-gradient-to-br from-emerald-50 via-white to-white p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-2xl text-white shadow-sm">
                🛡️
              </div>

              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
                  Compte entreprise
                </p>

                <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  Sécurité & conformité
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  Centralisez les contrôles techniques, les documents
                  juridiques, les consentements et la traçabilité des
                  opérations sensibles d’Arboboard.
                </p>
              </div>
            </div>

            <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto">
              <button
                type="button"
                onClick={() => void actualiserTout()}
                disabled={actualisationGlobale}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span aria-hidden="true">↻</span>
                {actualisationGlobale
                  ? "Actualisation…"
                  : "Tout actualiser"}
              </button>

              <Link
                href="/chef/compte"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                ← Mon compte
              </Link>
            </div>
          </div>
        </div>
      </header>

      {messageSucces ? (
        <div
          role="status"
          className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
        >
          {messageSucces}
        </div>
      ) : null}

      {erreurConformite ? (
        <div
          role="alert"
          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800"
        >
          {erreurConformite}
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
            Conformité suivie
          </p>

          <p className="mt-2 text-2xl font-black text-emerald-950">
            {statistiquesConformite.pourcentage} %
          </p>

          <p className="mt-1 text-xs text-emerald-700">
            {statistiquesConformite.conformes} bloc(s) actif(s) ou publié(s)
            sur {statistiquesConformite.total}
          </p>
        </div>

        <div className="rounded-3xl border border-violet-200 bg-violet-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
            Documents juridiques
          </p>

          <p className="mt-2 text-2xl font-black text-violet-950">
            {statistiquesConformite.documentsPublies}/
            {statistiquesConformite.documentsTotal}
          </p>

          <p className="mt-1 text-xs text-violet-700">
            Documents actuellement publiés
          </p>
        </div>

        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Journal chargé
          </p>

          <p className="mt-2 text-2xl font-black text-blue-950">
            {evenements.length}
          </p>

          <p className="mt-1 text-xs text-blue-700">
            Événements correspondant aux filtres serveur
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Conservation
          </p>

          <p className="mt-2 text-2xl font-black text-slate-950">
            {retentionJours} jours
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Durée technique communiquée par le serveur
          </p>
        </div>
      </section>

      {compteDeveloppeur ? (
        <section className="rounded-3xl border border-violet-200 bg-violet-50 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <p className="text-sm font-bold text-violet-950">
                Administration Arboboard
              </p>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-violet-800">
                Ton compte développeur peut préparer, enregistrer et
                publier les documents juridiques communs à toute la
                plateforme. Cette fonction n’apparaît pas pour les
                entreprises clientes.
              </p>
            </div>

            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <Link
                href="/chef/securite/documents-juridiques"
                className="inline-flex items-center justify-center rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800"
              >
                Administrer les documents
              </Link>

              <Link
                href="/chef/securite/demandes-rgpd-admin"
                className="inline-flex items-center justify-center rounded-xl border border-violet-300 bg-white px-4 py-2.5 text-sm font-semibold text-violet-800 transition hover:bg-violet-100"
              >
                Traiter les demandes RGPD
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <nav
        aria-label="Accès rapides sécurité"
        className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="flex gap-2 overflow-x-auto pb-1">
          {blocsAffiches.map((bloc) => (
            <a
              key={bloc.id}
              href={`#${bloc.id}`}
              className="inline-flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
            >
              {bloc.emoji} {bloc.titre}
            </a>
          ))}
        </div>
      </nav>

      {chargementConformite ? (
        <p className="text-sm text-slate-500">
          Vérification des documents publiés…
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {blocsAffiches.map((bloc) => (
          <article
            key={bloc.id}
            id={bloc.id}
            className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-xl">
                  {bloc.emoji}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    {bloc.titre}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {bloc.description}
                  </p>
                </div>
              </div>

              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${classesStatut(
                  bloc.statut
                )}`}
              >
                {bloc.statut}
              </span>
            </div>

            <ul className="mt-5 space-y-2">
              {bloc.details.map((detail) => (
                <li
                  key={detail}
                  className="flex items-start gap-2 text-sm leading-6 text-slate-600"
                >
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <span>{detail}</span>
                </li>
              ))}
            </ul>

            {bloc.id === "sauvegardes" ? (
              <Link
                href="/chef/securite/sauvegardes"
                className="mt-5 inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Gérer mes sauvegardes
              </Link>
            ) : null}

            {bloc.id === "securite-compte" ? (
              <Link
                href="/chef/securite/compte"
                className="mt-5 inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Sécuriser mon compte
              </Link>
            ) : null}

            {bloc.id === "rgpd" ? (
              <Link
                href="/chef/securite/donnees-personnelles"
                className="mt-5 inline-flex rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Gérer mes données et demandes
              </Link>
            ) : null}

            {bloc.id === "consentements" ? (
              <Link
                href="/chef/securite/consentements"
                className="mt-5 inline-flex rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Gérer mes consentements
              </Link>
            ) : null}

            {bloc.id === "acceptations-contractuelles" ? (
              <Link
                href="/chef/securite/acceptations-contractuelles"
                className="mt-5 inline-flex rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800"
              >
                Voir les acceptations
              </Link>
            ) : null}

            {bloc.typeDocument && bloc.cheminPublic ? (
              <Link
                href={bloc.cheminPublic}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {bloc.statut === "Publié"
                  ? "Consulter le document"
                  : "Voir la page publique"}
              </Link>
            ) : null}
          </article>
        ))}
      </div>

      <section className="scroll-mt-24 space-y-4" id="journal-detail">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <div>
              <p className="text-sm font-semibold text-emerald-700">
                Traçabilité
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-950">
                Journal d’activité
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Les événements sont isolés par entreprise. Le navigateur
                peut les consulter, mais il ne peut ni les modifier ni les
                supprimer.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void chargerJournal()}
                disabled={chargementJournal}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {chargementJournal
                  ? "Actualisation…"
                  : "Actualiser"}
              </button>

              <button
                type="button"
                onClick={() => void exporterJournalCsv()}
                disabled={
                  chargementJournal ||
                  exportEnCours ||
                  evenementsAffiches.length === 0
                }
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {exportEnCours
                  ? "Export en cours…"
                  : "Exporter en CSV"}
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <CarteStatistique
              label="Événements chargés"
              valeur={statistiques.total}
            />
            <CarteStatistique
              label="Succès"
              valeur={statistiques.succes}
            />
            <CarteStatistique
              label="Échecs"
              valeur={statistiques.echecs}
            />
            <CarteStatistique
              label="Informations"
              valeur={statistiques.informations}
            />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <label>
              <span className="text-sm font-medium text-slate-700">
                Catégorie
              </span>
              <select
                value={categorie}
                onChange={(event) =>
                  setCategorie(event.target.value)
                }
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              >
                {CATEGORIES.map((item) => (
                  <option
                    key={item.valeur}
                    value={item.valeur}
                  >
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="text-sm font-medium text-slate-700">
                Résultat
              </span>
              <select
                value={resultat}
                onChange={(event) =>
                  setResultat(event.target.value)
                }
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              >
                <option value="tous">Tous les résultats</option>
                <option value="succes">Succès</option>
                <option value="echec">Échecs</option>
                <option value="information">Informations</option>
              </select>
            </label>

            <label>
              <span className="text-sm font-medium text-slate-700">
                Recherche
              </span>

              <input
                type="search"
                value={rechercheJournal}
                onChange={(event) =>
                  setRechercheJournal(event.target.value)
                }
                placeholder="Action, utilisateur, ressource…"
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </label>
          </div>

          {rechercheJournal.trim() ? (
            <p className="mt-3 text-xs font-medium text-slate-600">
              {evenementsAffiches.length} résultat(s) parmi{" "}
              {evenements.length} événement(s) chargé(s).
            </p>
          ) : null}

          <p className="mt-4 text-xs leading-5 text-slate-500">
            Durée technique configurée : {retentionJours} jours.
            Le journal ne doit pas contenir de mot de passe, de jeton
            d’accès ni de document client complet.
          </p>
        </div>

        {erreurJournal ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {erreurJournal}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {chargementJournal ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Chargement du journal d’activité…
            </div>
          ) : evenementsAffiches.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-3xl">📋</div>
              <p className="mt-3 font-semibold text-slate-900">
                Aucun événement pour ces critères
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Les prochaines actions sensibles raccordées au journal
                apparaîtront ici.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {evenementsAffiches.map((evenement) => (
                <article
                  key={evenement.id}
                  className="p-5 sm:p-6"
                >
                  <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-words font-bold text-slate-950">
                          {evenement.action}
                        </h3>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${classesResultat(
                            evenement.resultat
                          )}`}
                        >
                          {libelleResultat(evenement.resultat)}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                          {libelleCategorie(
                            evenement.categorie
                          )}
                        </span>
                      </div>

                      {evenement.description ? (
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {evenement.description}
                        </p>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                        <span>
                          Utilisateur :{" "}
                          <strong className="font-semibold text-slate-700">
                            {evenement.utilisateur_nom ||
                              evenement.utilisateur_email ||
                              "Utilisateur supprimé"}
                          </strong>
                        </span>

                        {evenement.ressource_type ? (
                          <span>
                            Ressource :{" "}
                            <strong className="font-semibold text-slate-700">
                              {evenement.ressource_type}
                              {evenement.ressource_id
                                ? ` · ${evenement.ressource_id}`
                                : ""}
                            </strong>
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <time
                      dateTime={evenement.created_at}
                      className="shrink-0 text-xs font-medium text-slate-500"
                    >
                      {formatDate(evenement.created_at)}
                    </time>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-xl">
            ⚖️
          </div>

          <div>
            <h2 className="font-black text-amber-950">
              Validation juridique nécessaire
            </h2>

            <p className="mt-2 text-sm leading-6 text-amber-800">
              La structure technique ne remplace pas la validation des
              durées, des documents et des procédures définitives par un
              professionnel compétent avant la commercialisation.
            </p>
          </div>
        </div>
      </section>
    </section>
  );
}

function CarteStatistique({
  label,
  valeur,
}: {
  label: string;
  valeur: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-slate-950">
        {valeur}
      </p>
    </div>
  );
}