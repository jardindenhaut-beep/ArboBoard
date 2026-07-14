import Link from "next/link";

const LIENS_JURIDIQUES = [
  {
    label: "Mentions légales",
    href: "/mentions-legales",
  },
  {
    label: "Politique de confidentialité",
    href: "/politique-confidentialite",
  },
  {
    label: "CGU",
    href: "/cgu",
  },
  {
    label: "CGV",
    href: "/cgv",
  },
] as const;

export default function PiedDePagePublic({
  compact = false,
}: {
  compact?: boolean;
}) {
  const annee = new Date().getFullYear();

  if (compact) {
    return (
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p className="text-xs text-slate-500">
            © {annee} Arboboard. Tous droits réservés.
          </p>

          <nav
            aria-label="Liens juridiques"
            className="flex flex-wrap gap-x-4 gap-y-2"
          >
            {LIENS_JURIDIQUES.map((lien) => (
              <Link
                key={lien.href}
                href={lien.href}
                className="text-xs font-semibold text-slate-600 transition hover:text-emerald-700"
              >
                {lien.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    );
  }

  return (
    <footer className="border-t border-slate-200 bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-3"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-2xl">
                🌳
              </span>
              <span>
                <span className="block text-lg font-bold">
                  Arboboard
                </span>
                <span className="block text-xs text-slate-400">
                  Gestion des entreprises d’espaces verts
                </span>
              </span>
            </Link>

            <p className="mt-4 max-w-md text-sm leading-6 text-slate-400">
              Devis, factures, clients, équipes, planning et suivi
              d’intervention dans un espace professionnel unique.
            </p>
          </div>

          <div>
            <h2 className="text-sm font-bold text-white">
              Accès
            </h2>

            <nav
              aria-label="Accès au service"
              className="mt-4 space-y-3"
            >
              <Link
                href="/"
                className="block text-sm text-slate-400 transition hover:text-white"
              >
                Accueil
              </Link>
              <Link
                href="/connexion"
                className="block text-sm text-slate-400 transition hover:text-white"
              >
                Se connecter
              </Link>
              <a
                href="mailto:contact@arboboard.fr"
                className="block text-sm text-slate-400 transition hover:text-white"
              >
                Contacter Arboboard
              </a>
            </nav>
          </div>

          <div>
            <h2 className="text-sm font-bold text-white">
              Informations juridiques
            </h2>

            <nav
              aria-label="Informations juridiques"
              className="mt-4 space-y-3"
            >
              {LIENS_JURIDIQUES.map((lien) => (
                <Link
                  key={lien.href}
                  href={lien.href}
                  className="block text-sm text-slate-400 transition hover:text-white"
                >
                  {lien.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-slate-800 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {annee} Arboboard. Tous droits réservés.</p>
          <p>Application SaaS professionnelle française.</p>
        </div>
      </div>
    </footer>
  );
}