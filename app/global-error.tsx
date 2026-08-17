"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erreur globale Arboboard :", error);
  }, [error]);

  return (
    <html lang="fr">
      <body>
        <main className="min-h-screen bg-[#f7f6f1] px-6 py-12">
          <div className="mx-auto flex min-h-[80vh] max-w-3xl items-center justify-center">
            <div className="w-full rounded-3xl border border-black/5 bg-white p-8 text-center shadow-sm">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef2ed] text-2xl">
                !
              </div>

              <h1 className="text-2xl font-semibold text-[#1f2d24]">
                Arboboard rencontre un problème
              </h1>

              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#667068]">
                Une erreur générale empêche momentanément l’affichage de
                l’application. Vous pouvez tenter de relancer l’interface.
              </p>

              <button
                type="button"
                onClick={reset}
                className="mt-6 rounded-xl bg-[#315c46] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Relancer Arboboard
              </button>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}