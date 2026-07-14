import Link from "next/link";

type BlocConformite = {
  id: string;
  titre: string;
  description: string;
  emoji: string;
  statut: "À configurer" | "À rédiger" | "À contrôler" | "Actif";
  details: string[];
};

const BLOCS: BlocConformite[] = [
  {
    id: "sauvegardes",
    titre: "Sauvegardes",
    description:
      "Politique de sauvegarde, restauration et continuité du service.",
    emoji: "💾",
    statut: "À configurer",
    details: [
      "Définir la fréquence des sauvegardes de la base Supabase.",
      "Documenter la restauration et les responsabilités.",
      "Prévoir un test de restauration régulier.",
    ],
  },
  {
    id: "rgpd",
    titre: "RGPD",
    description:
      "Gestion des droits, durées de conservation et demandes des utilisateurs.",
    emoji: "🇪🇺",
    statut: "À contrôler",
    details: [
      "Cartographier les données personnelles traitées.",
      "Définir les durées de conservation.",
      "Préparer l’accès, l’export et la suppression des données.",
    ],
  },
  {
    id: "mentions-legales",
    titre: "Mentions légales",
    description:
      "Informations obligatoires sur l’éditeur, l’hébergeur et l’entreprise.",
    emoji: "🏢",
    statut: "À rédiger",
    details: [
      "Identifier précisément l’éditeur du service.",
      "Renseigner l’hébergeur et les coordonnées de contact.",
      "Publier une version accessible sans connexion.",
    ],
  },
  {
    id: "confidentialite",
    titre: "Politique de confidentialité",
    description:
      "Présentation claire des données collectées et de leur utilisation.",
    emoji: "🔏",
    statut: "À rédiger",
    details: [
      "Expliquer les finalités et bases légales.",
      "Lister les sous-traitants techniques.",
      "Présenter les droits et les modalités de contact.",
    ],
  },
  {
    id: "cgu",
    titre: "Conditions générales d’utilisation",
    description:
      "Règles d’accès et d’utilisation du logiciel Arboboard.",
    emoji: "📘",
    statut: "À rédiger",
    details: [
      "Définir les comptes, rôles et responsabilités.",
      "Encadrer les usages interdits et la disponibilité.",
      "Prévoir les règles de suspension et résiliation.",
    ],
  },
  {
    id: "cgv",
    titre: "Conditions générales de vente",
    description:
      "Offres, abonnements, paiements, renouvellements et résiliations.",
    emoji: "🧾",
    statut: "À rédiger",
    details: [
      "Décrire les trois offres et leur facturation.",
      "Encadrer le renouvellement et la résiliation.",
      "Préciser les responsabilités et modalités de paiement.",
    ],
  },
  {
    id: "consentements",
    titre: "Gestion des consentements",
    description:
      "Historique des choix liés aux communications et aux traceurs.",
    emoji: "✅",
    statut: "À configurer",
    details: [
      "Séparer les consentements nécessaires et facultatifs.",
      "Enregistrer la date et la version du consentement.",
      "Permettre le retrait aussi facilement que l’acceptation.",
    ],
  },
  {
    id: "journal",
    titre: "Journal d’activité",
    description:
      "Traçabilité des actions sensibles réalisées dans l’application.",
    emoji: "📋",
    statut: "À configurer",
    details: [
      "Tracer les connexions et changements de sécurité.",
      "Tracer les suppressions et modifications sensibles.",
      "Limiter l’accès au journal aux personnes autorisées.",
    ],
  },
];

function classesStatut(statut: BlocConformite["statut"]) {
  if (statut === "Actif") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (statut === "À contrôler") {
    return "bg-amber-50 text-amber-700";
  }

  if (statut === "À rédiger") {
    return "bg-blue-50 text-blue-700";
  }

  return "bg-slate-100 text-slate-700";
}

export default function SecuriteChefPage() {
  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div>
            <p className="text-sm font-semibold text-emerald-700">
              Compte entreprise
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              Sécurité & conformité
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Cet espace centralise les éléments à finaliser avant la
              commercialisation d’Arboboard. Les documents juridiques
              définitifs devront être validés avant publication.
            </p>
          </div>

          <Link
            href="/chef/compte"
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            ← Mon compte
          </Link>
        </div>
      </header>

      <nav className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex gap-2 overflow-x-auto">
          {BLOCS.map((bloc) => (
            <a
              key={bloc.id}
              href={`#${bloc.id}`}
              className="whitespace-nowrap rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
            >
              {bloc.emoji} {bloc.titre}
            </a>
          ))}
        </div>
      </nav>

      <div className="grid gap-4 lg:grid-cols-2">
        {BLOCS.map((bloc) => (
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
          </article>
        ))}
      </div>

      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="font-bold text-amber-900">
          Validation juridique nécessaire
        </h2>
        <p className="mt-2 text-sm leading-6 text-amber-800">
          Cette page organise le travail technique et documentaire. Elle ne
          remplace pas la validation des textes définitifs par un
          professionnel compétent avant la mise en production commerciale.
        </p>
      </div>
    </section>
  );
}