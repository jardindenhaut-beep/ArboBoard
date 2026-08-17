export default function Loading() {
  return (
    <main className="min-h-screen bg-[#f7f6f1] px-6 py-12">
      <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center">
        <div className="w-full rounded-3xl border border-black/5 bg-white p-8 text-center shadow-sm">
          <div
            className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-[#d8d4c7] border-t-[#315c46]"
            aria-hidden="true"
          />
          <h1 className="text-xl font-semibold text-[#1f2d24]">
            Chargement en cours…
          </h1>
          <p className="mt-2 text-sm text-[#667068]">
            Arboboard prépare votre espace.
          </p>
        </div>
      </div>
    </main>
  );
}