import Link from "next/link";
import PiedDePagePublic from "@/components/public/PiedDePagePublic";
import LogoArboboard, {
  MarqueArboboard,
} from "@/components/branding/LogoArboboard";

const FONCTIONNALITES = [
  {
    numero: "01",
    titre: "Devis & facturation",
    texte:
      "Créez vos devis, transformez-les en factures, suivez les règlements et conservez vos documents au même endroit.",
  },
  {
    numero: "02",
    titre: "Interventions terrain",
    texte:
      "Préparez les travaux, le matériel, les consignes et les équipes avant chaque chantier.",
  },
  {
    numero: "03",
    titre: "Planning d’équipe",
    texte:
      "Planifiez une journée ou plusieurs jours et donnez à chacun une vision claire de son emploi du temps.",
  },
  {
    numero: "04",
    titre: "Suivi de chantier",
    texte:
      "Du contrôle du matériel au PV de fin de chantier, les informations remontent directement du terrain.",
  },
];

const ETAPES = [
  {
    numero: "01",
    titre: "Devis accepté",
    texte: "Le chantier part directement de votre devis.",
  },
  {
    numero: "02",
    titre: "Intervention planifiée",
    texte: "Équipe, matériel, travaux, dates et consignes.",
  },
  {
    numero: "03",
    titre: "Équipe sur le terrain",
    texte: "Smartphone, suivi des étapes, photos et validation.",
  },
  {
    numero: "04",
    titre: "Chantier facturé",
    texte: "Le suivi revient au bureau pour terminer la facturation.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f5f7f3] text-slate-950">
      <section className="relative overflow-hidden bg-[#102a20] text-white">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-32 -top-40 h-[520px] w-[520px] rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="absolute -bottom-52 -left-28 h-[500px] w-[500px] rounded-full bg-lime-200/5 blur-3xl" />
          <div className="absolute right-[8%] top-32 opacity-[0.05]">
            <MarqueArboboard className="h-[430px] w-[430px]" />
          </div>
        </div>

        <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <header className="flex items-center justify-between gap-5 py-6">
            <Link href="/" className="inline-flex rounded-2xl bg-white px-3 py-2 shadow-lg shadow-black/10">
              <LogoArboboard subtitle="Gestion métier paysage & élagage" />
            </Link>

            <nav className="hidden items-center gap-8 text-sm font-semibold text-emerald-50/80 lg:flex">
              <a href="#solution" className="transition hover:text-white">
                La solution
              </a>
              <a href="#fonctionnement" className="transition hover:text-white">
                Fonctionnement
              </a>
              <a href="#metiers" className="transition hover:text-white">
                Pour qui ?
              </a>
            </nav>

            <div className="flex items-center gap-2">
              <Link
                href="/connexion"
                className="hidden rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10 sm:inline-flex"
              >
                Connexion
              </Link>
              <Link
                href="/inscription"
                className="inline-flex rounded-xl bg-[#d6b86a] px-4 py-2.5 text-sm font-black text-[#102a20] shadow-lg shadow-black/10 transition hover:bg-[#e3c97d]"
              >
                Créer mon espace
              </Link>
            </div>
          </header>

          <div className="grid min-h-[680px] gap-14 py-16 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:py-20">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/20 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-100">
                <span className="h-2 w-2 rounded-full bg-[#d6b86a]" />
                Pensé pour les professionnels du terrain
              </div>

              <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[0.98] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
                Votre entreprise,
                <span className="block text-[#d6b86a]">
                  du devis au terrain.
                </span>
              </h1>

              <p className="mt-7 max-w-2xl text-base leading-8 text-emerald-50/70 sm:text-lg">
                Arboboard réunit la gestion commerciale, les équipes et le
                suivi des chantiers dans un seul outil conçu pour les
                paysagistes et les élagueurs.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/inscription"
                  className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-[#d6b86a] px-7 text-sm font-black text-[#102a20] shadow-xl shadow-black/15 transition hover:-translate-y-0.5 hover:bg-[#e3c97d]"
                >
                  Découvrir Arboboard
                  <span className="ml-3 text-lg">→</span>
                </Link>

                <Link
                  href="/connexion"
                  className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-7 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  Accéder à mon espace
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm font-semibold text-emerald-50/65">
                <span>✓ Devis & factures</span>
                <span>✓ Planning équipe</span>
                <span>✓ Fiches terrain</span>
                <span>✓ PV client</span>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-5 rounded-[38px] bg-gradient-to-br from-emerald-400/15 to-[#d6b86a]/10 blur-2xl" />

              <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#f7f8f4] p-3 shadow-2xl shadow-black/30">
                <div className="rounded-[25px] bg-white p-5 text-slate-950 sm:p-6">
                  <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-5">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                        Tableau de bord
                      </p>
                      <p className="mt-1 text-xl font-black">
                        Bonjour 👋
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#102a20] px-4 py-2 text-xs font-bold text-white">
                      Aujourd’hui
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-emerald-50 p-4">
                      <p className="text-xs font-bold text-emerald-700">
                        Chantiers
                      </p>
                      <p className="mt-2 text-3xl font-black text-emerald-950">
                        4
                      </p>
                      <p className="mt-1 text-xs text-emerald-700/70">
                        planifiés aujourd’hui
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#f8f1df] p-4">
                      <p className="text-xs font-bold text-[#816820]">
                        À encaisser
                      </p>
                      <p className="mt-2 text-2xl font-black text-[#47370f]">
                        4 820 €
                      </p>
                      <p className="mt-1 text-xs text-[#816820]/70">
                        factures en cours
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                          Prochaine intervention
                        </p>
                        <p className="mt-1 font-black">
                          Taille & entretien
                        </p>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                        08:00
                      </span>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full w-2/3 rounded-full bg-emerald-600" />
                    </div>
                    <div className="mt-3 flex justify-between text-xs font-semibold text-slate-400">
                      <span>Matériel</span>
                      <span>Arrivée</span>
                      <span>Fin / PV</span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {["Devis", "Planning", "Factures"].map((item) => (
                      <div
                        key={item}
                        className="rounded-xl bg-slate-50 px-3 py-3 text-center text-xs font-black text-slate-700"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-6 -left-5 hidden rounded-2xl border border-white/10 bg-[#173d2f] px-5 py-4 shadow-xl lg:block">
                <p className="text-xs font-black uppercase tracking-wide text-emerald-200">
                  Terrain
                </p>
                <p className="mt-1 text-sm font-bold text-white">
                  Smartphone • Tablette • PC
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="solution" className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
              Une seule plateforme
            </p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              Moins d’administratif.
              <span className="block text-emerald-700">
                Plus de visibilité.
              </span>
            </h2>
          </div>
          <p className="max-w-2xl text-base leading-8 text-slate-600 lg:justify-self-end">
            Les informations ne restent plus dispersées entre le bureau, le
            téléphone et le camion. Chaque étape du chantier reste reliée à
            la précédente.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {FONCTIONNALITES.map((item) => (
            <article
              key={item.numero}
              className="group rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-950/5 sm:p-7"
            >
              <div className="flex items-start gap-5">
                <span className="text-xs font-black tracking-[0.18em] text-[#a6893d]">
                  {item.numero}
                </span>
                <div>
                  <h3 className="text-xl font-black tracking-tight">
                    {item.titre}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {item.texte}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="fonctionnement" className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
              Un flux métier continu
            </p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
              Devis → intervention → planning → terrain → facture
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-600">
              Arboboard suit le chantier du premier échange client jusqu’à
              sa clôture, sans ressaisie inutile.
            </p>
          </div>

          <div className="mt-12 grid gap-4 lg:grid-cols-4">
            {ETAPES.map((etape, index) => (
              <article
                key={etape.numero}
                className="relative rounded-[28px] bg-[#f5f7f3] p-6"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-emerald-700">
                    {etape.numero}
                  </span>
                  {index < ETAPES.length - 1 ? (
                    <span className="hidden text-xl text-slate-300 lg:block">
                      →
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-8 text-lg font-black">
                  {etape.titre}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {etape.texte}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="metiers" className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="overflow-hidden rounded-[34px] bg-[#102a20] p-7 text-white sm:p-10 lg:p-14">
          <div className="grid gap-10 lg:grid-cols-[1fr_.8fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#d6b86a]">
                Paysagistes & élagueurs
              </p>
              <h2 className="mt-4 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">
                Un logiciel qui parle le langage de vos chantiers.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-emerald-50/70">
                Planning d’équipe, travaux à réaliser, matériel à charger,
                suivi terrain et réception client : Arboboard est construit
                autour du quotidien des entreprises d’espaces verts.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {[
                "Élagage & abattage",
                "Entretien paysager",
                "Création & aménagement",
                "Gestion d’équipe",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4"
                >
                  <span className="font-bold">{item}</span>
                  <span className="text-[#d6b86a]">✓</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <div className="mx-auto max-w-7xl rounded-[34px] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-8 text-center sm:p-12">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
            Prêt à centraliser votre activité ?
          </p>
          <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">
            Le bureau et le terrain dans le même outil.
          </h2>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/inscription"
              className="inline-flex min-h-13 items-center justify-center rounded-2xl bg-[#102a20] px-7 py-3.5 text-sm font-black text-white transition hover:bg-[#183a2d]"
            >
              Créer mon espace
            </Link>
            <Link
              href="/connexion/salarie"
              className="inline-flex min-h-13 items-center justify-center rounded-2xl border border-slate-200 bg-white px-7 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Connexion salarié
            </Link>
          </div>
        </div>
      </section>

      <PiedDePagePublic />
    </main>
  );
}
