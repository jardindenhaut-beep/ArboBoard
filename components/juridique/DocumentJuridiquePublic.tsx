import Link from "next/link";
import type { ReactNode } from "react";
import type { DocumentJuridiquePublie } from "@/lib/documentsJuridiques";

function formaterDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
  }).format(new Date(date));
}

function rendreContenu(contenu: string): ReactNode[] {
  const lignes = contenu.replace(/\r\n/g, "\n").split("\n");
  const elements: ReactNode[] = [];
  let puces: string[] = [];

  function viderPuces() {
    if (puces.length === 0) return;

    const valeurs = [...puces];
    puces = [];

    elements.push(
      <ul
        key={`liste-${elements.length}`}
        className="my-4 list-disc space-y-2 pl-6 text-sm leading-7 text-slate-700"
      >
        {valeurs.map((valeur, index) => (
          <li key={`${valeur}-${index}`}>{valeur}</li>
        ))}
      </ul>
    );
  }

  lignes.forEach((ligneBrute, index) => {
    const ligne = ligneBrute.trim();

    if (ligne.startsWith("- ")) {
      puces.push(ligne.slice(2).trim());
      return;
    }

    viderPuces();

    if (!ligne) {
      return;
    }

    if (ligne.startsWith("### ")) {
      elements.push(
        <h3
          key={`h3-${index}`}
          className="mb-2 mt-7 text-lg font-bold text-slate-950"
        >
          {ligne.slice(4)}
        </h3>
      );
      return;
    }

    if (ligne.startsWith("## ")) {
      elements.push(
        <h2
          key={`h2-${index}`}
          className="mb-3 mt-10 text-2xl font-bold tracking-tight text-slate-950"
        >
          {ligne.slice(3)}
        </h2>
      );
      return;
    }

    if (ligne.startsWith("# ")) {
      return;
    }

    elements.push(
      <p
        key={`p-${index}`}
        className="my-3 text-sm leading-7 text-slate-700"
      >
        {ligne}
      </p>
    );
  });

  viderPuces();
  return elements;
}

export default function DocumentJuridiquePublic({
  document,
  titreIndisponible,
}: {
  document: DocumentJuridiquePublie | null;
  titreIndisponible: string;
}) {
  if (!document) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-16">
        <section className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="text-4xl">📄</div>
          <h1 className="mt-4 text-2xl font-bold text-slate-950">
            {titreIndisponible}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Ce document n’a pas encore été publié. Il devra être
            disponible avant l’ouverture commerciale d’Arboboard.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Retour à l’accueil
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:py-16">
      <article className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 p-6 sm:p-10">
          <Link
            href="/"
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
          >
            ← Arboboard
          </Link>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            {document.titre}
          </h1>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1.5">
              Version {document.version}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5">
              Publié le {formaterDate(document.publie_at)}
            </span>
          </div>
        </header>

        <div className="p-6 sm:p-10">
          {rendreContenu(document.contenu)}
        </div>

        <footer className="border-t border-slate-200 bg-slate-50 p-6 sm:px-10">
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-600">
            <Link href="/mentions-legales">
              Mentions légales
            </Link>
            <Link href="/politique-confidentialite">
              Confidentialité
            </Link>
            <Link href="/cgu">CGU</Link>
            <Link href="/cgv">CGV</Link>
          </div>
        </footer>
      </article>
    </main>
  );
}