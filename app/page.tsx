import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-100">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-10">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">🌱 Arboboard</h1>
            <p className="text-sm text-slate-500">
              Logiciel SaaS pour paysagistes et élagueurs
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/connexion"
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
            >
              Connexion chef
            </Link>

            <Link
              href="/connexion/salarie"
              className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-300"
            >
              Connexion salarié
            </Link>

            <Link
              href="/inscription"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Créer mon espace
            </Link>
          </div>
        </header>

        <div className="grid flex-1 gap-10 py-16 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="mb-6 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
              Pensé pour les entreprises du paysage
            </div>

            <h2 className="text-4xl font-bold tracking-tight text-slate-900 md:text-6xl">
              Gérez votre entreprise terrain au même endroit.
            </h2>

            <p className="mt-6 max-w-xl text-lg text-slate-600">
              Arboboard centralise vos clients, devis, factures, chantiers,
              salariés, plannings et demandes internes dans une seule application
              simple à utiliser.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/inscription"
                className="rounded-xl bg-slate-900 px-6 py-3 text-center font-semibold text-white hover:bg-slate-700"
              >
                Commencer maintenant
              </Link>

              <Link
                href="/connexion"
                className="rounded-xl bg-white px-6 py-3 text-center font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
              >
                Accéder à mon espace
              </Link>
            </div>

            <div className="mt-8 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="font-semibold text-slate-900">Devis & factures</p>
                <p className="mt-1">PDF, TVA, acomptes, avoirs.</p>
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="font-semibold text-slate-900">Planning équipe</p>
                <p className="mt-1">Interventions et affectations.</p>
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="font-semibold text-slate-900">Espace salarié</p>
                <p className="mt-1">Demandes, planning et profil.</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h3 className="text-2xl font-bold text-slate-900">
              Ce que permet Arboboard
            </h3>

            <div className="mt-6 grid gap-4">
              <div className="rounded-2xl border border-slate-200 p-5">
                <h4 className="font-semibold text-slate-900">
                  Gestion commerciale
                </h4>
                <p className="mt-2 text-sm text-slate-600">
                  Clients, chantiers, devis professionnels, factures conformes,
                  suivi des statuts et documents PDF.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <h4 className="font-semibold text-slate-900">
                  Organisation terrain
                </h4>
                <p className="mt-2 text-sm text-slate-600">
                  Planning d’interventions, salariés affectés, demandes internes,
                  notes et suivi des interventions.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <h4 className="font-semibold text-slate-900">
                  Abonnement SaaS
                </h4>
                <p className="mt-2 text-sm text-slate-600">
                  Plans Essentiel, Pro et Expert avec paiement Stripe et gestion
                  des accès par entreprise.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900 p-5 text-white">
                <h4 className="font-semibold">Objectif</h4>
                <p className="mt-2 text-sm text-slate-300">
                  Faire gagner du temps aux professionnels du paysage sur
                  l’administratif, l’organisation et le suivi de leur activité.
                </p>
              </div>
            </div>
          </div>
        </div>

        <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500">
          Arboboard — L’application de gestion pour paysagistes et élagueurs.
        </footer>
      </section>
    </main>
  );
}