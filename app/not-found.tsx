import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#f7f6f1] px-6 py-12">
      <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center">
        <div className="w-full rounded-3xl border border-black/5 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8a7650]">
            Erreur 404
          </p>

          <h1 className="mt-3 text-3xl font-semibold text-[#1f2d24]">
            Page introuvable
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#667068]">
            Cette page n’existe pas, a été déplacée ou n’est plus disponible.
          </p>

          <Link
            href="/"
            className="mt-6 inline-flex rounded-xl bg-[#315c46] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Retour à l’accueil
          </Link>
        </div>
      </div>
    </main>
  );
}