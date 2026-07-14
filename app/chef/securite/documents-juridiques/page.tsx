"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  INFORMATIONS_DOCUMENTS_JURIDIQUES,
  TYPES_DOCUMENTS_JURIDIQUES,
  type DocumentJuridiquePlateforme,
  type TypeDocumentJuridique,
} from "@/lib/documentsJuridiques";
import { supabase } from "@/lib/supabaseClient";

type ReponseDocuments = {
  documents?: DocumentJuridiquePlateforme[];
  document?: DocumentJuridiquePlateforme;
  succes?: boolean;
  erreur?: string;
};

function formaterDate(date: string | null | undefined) {
  if (!date) return "Jamais publié";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function contientPlaceholders(contenu: string) {
  return contenu.includes("[[") || contenu.includes("]]");
}

export default function DocumentsJuridiquesChefPage() {
  const [documents, setDocuments] = useState<
    DocumentJuridiquePlateforme[]
  >([]);
  const [typeActif, setTypeActif] =
    useState<TypeDocumentJuridique>(
      "mentions_legales"
    );
  const [brouillonInitial, setBrouillonInitial] =
    useState<DocumentJuridiquePlateforme | null>(null);
  const [brouillon, setBrouillon] =
    useState<DocumentJuridiquePlateforme | null>(null);
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] =
    useState(false);
  const [publication, setPublication] = useState(false);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");

  const modifie = useMemo(() => {
    if (!brouillon || !brouillonInitial) return false;

    return (
      brouillon.titre_brouillon !==
        brouillonInitial.titre_brouillon ||
      brouillon.contenu_brouillon !==
        brouillonInitial.contenu_brouillon ||
      brouillon.version_brouillon !==
        brouillonInitial.version_brouillon
    );
  }, [brouillon, brouillonInitial]);

  const differeVersionPubliee = useMemo(() => {
    if (!brouillon) return false;

    return (
      brouillon.titre_brouillon !==
        brouillon.titre_publie ||
      brouillon.contenu_brouillon !==
        brouillon.contenu_publie ||
      brouillon.version_brouillon !==
        brouillon.version_publie
    );
  }, [brouillon]);

  useEffect(() => {
    void chargerDocuments();
  }, []);

  useEffect(() => {
    const documentActif = documents.find(
      (document) => document.type_document === typeActif
    );

    if (!documentActif) return;

    setBrouillon(documentActif);
    setBrouillonInitial(documentActif);
    setErreur("");
    setMessage("");
  }, [documents, typeActif]);

  useEffect(() => {
    function avertir(event: BeforeUnloadEvent) {
      if (!modifie) return;
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", avertir);
    return () =>
      window.removeEventListener("beforeunload", avertir);
  }, [modifie]);

  async function obtenirJeton() {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      throw new Error(
        "Votre session a expiré. Veuillez vous reconnecter."
      );
    }

    return session.access_token;
  }

  async function chargerDocuments() {
    try {
      setChargement(true);
      setErreur("");

      const jeton = await obtenirJeton();
      const reponse = await fetch(
        "/api/securite/documents-juridiques",
        {
          headers: {
            Authorization: `Bearer ${jeton}`,
          },
          cache: "no-store",
        }
      );

      const donnees =
        (await reponse.json()) as ReponseDocuments;

      if (!reponse.ok) {
        throw new Error(
          donnees.erreur ||
            "Impossible de charger les documents."
        );
      }

      setDocuments(donnees.documents || []);
    } catch (error) {
      console.error(
        "Erreur chargement documents juridiques :",
        error
      );
      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible de charger les documents."
      );
    } finally {
      setChargement(false);
    }
  }

  function modifierBrouillon(
    champ:
      | "titre_brouillon"
      | "contenu_brouillon"
      | "version_brouillon",
    valeur: string
  ) {
    setBrouillon((ancien) =>
      ancien
        ? {
            ...ancien,
            [champ]: valeur,
          }
        : ancien
    );
    setErreur("");
    setMessage("");
  }

  function integrerDocument(
    document: DocumentJuridiquePlateforme
  ) {
    setDocuments((anciens) =>
      anciens.map((element) =>
        element.type_document === document.type_document
          ? document
          : element
      )
    );
    setBrouillon(document);
    setBrouillonInitial(document);
  }

  async function enregistrerBrouillon() {
    if (!brouillon) return;

    try {
      setEnregistrement(true);
      setErreur("");
      setMessage("");

      const jeton = await obtenirJeton();

      const reponse = await fetch(
        "/api/securite/documents-juridiques",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jeton}`,
          },
          body: JSON.stringify({
            type_document: brouillon.type_document,
            titre: brouillon.titre_brouillon,
            contenu: brouillon.contenu_brouillon,
            version: brouillon.version_brouillon,
          }),
        }
      );

      const donnees =
        (await reponse.json()) as ReponseDocuments;

      if (!reponse.ok || !donnees.document) {
        throw new Error(
          donnees.erreur ||
            "Impossible d’enregistrer le brouillon."
        );
      }

      integrerDocument(donnees.document);
      setMessage("Le brouillon a été enregistré.");
    } catch (error) {
      console.error(
        "Erreur enregistrement brouillon :",
        error
      );
      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible d’enregistrer le brouillon."
      );
    } finally {
      setEnregistrement(false);
    }
  }

  async function publierDocument() {
    if (!brouillon) return;

    if (modifie) {
      setErreur(
        "Enregistrez d’abord le brouillon avant de le publier."
      );
      return;
    }

    if (contientPlaceholders(brouillon.contenu_brouillon)) {
      setErreur(
        "Le document contient encore des champs [[A_COMPLETER]]."
      );
      return;
    }

    const confirme = window.confirm(
      `Publier la version ${brouillon.version_brouillon} de « ${brouillon.titre_brouillon} » ?`
    );

    if (!confirme) return;

    try {
      setPublication(true);
      setErreur("");
      setMessage("");

      const jeton = await obtenirJeton();

      const reponse = await fetch(
        "/api/securite/documents-juridiques",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jeton}`,
          },
          body: JSON.stringify({
            type_document: brouillon.type_document,
          }),
        }
      );

      const donnees =
        (await reponse.json()) as ReponseDocuments;

      if (!reponse.ok || !donnees.document) {
        throw new Error(
          donnees.erreur ||
            "Impossible de publier le document."
        );
      }

      integrerDocument(donnees.document);
      setMessage(
        "Le document a été publié. La page publique utilise désormais cette version."
      );
    } catch (error) {
      console.error(
        "Erreur publication document :",
        error
      );
      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible de publier le document."
      );
    } finally {
      setPublication(false);
    }
  }

  if (chargement) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="font-semibold text-slate-700">
          Chargement des documents juridiques…
        </p>
      </div>
    );
  }

  if (!brouillon) {
    return (
      <main className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-800">
          {erreur ||
            "Aucun document juridique n’a été trouvé. Exécutez le script SQL."}
        </div>
      </main>
    );
  }

  const informations =
    INFORMATIONS_DOCUMENTS_JURIDIQUES[
      brouillon.type_document
    ];

  return (
    <main className="mx-auto max-w-7xl space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <p className="text-sm font-semibold text-emerald-700">
              Administration de la plateforme
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              Documents juridiques
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Préparez les brouillons, faites-les contrôler puis
              publiez-les sans modifier la version publique tant que le
              nouveau texte n’est pas prêt.
            </p>
          </div>

          <Link
            href="/chef/securite"
            className="inline-flex rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            ← Sécurité
          </Link>
        </div>
      </header>

      {erreur ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {erreur}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {message}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-3 xl:sticky xl:top-24 xl:self-start">
          {TYPES_DOCUMENTS_JURIDIQUES.map((type) => {
            const document = documents.find(
              (element) => element.type_document === type
            );
            const actif = typeActif === type;
            const infos =
              INFORMATIONS_DOCUMENTS_JURIDIQUES[type];

            return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  if (
                    modifie &&
                    !window.confirm(
                      "Abandonner les modifications non enregistrées ?"
                    )
                  ) {
                    return;
                  }
                  setTypeActif(type);
                }}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  actif
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <p className="font-bold text-slate-950">
                  {infos.label}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {document?.publie_at
                    ? `Publié : ${document.version_publie}`
                    : "Jamais publié"}
                </p>
              </button>
            );
          })}
        </aside>

        <section className="space-y-5">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  {informations.label}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {informations.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    contientPlaceholders(
                      brouillon.contenu_brouillon
                    )
                      ? "bg-amber-50 text-amber-700"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {contientPlaceholders(
                    brouillon.contenu_brouillon
                  )
                    ? "Champs à compléter"
                    : "Aucun placeholder"}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                  {brouillon.publie_at
                    ? `Publié le ${formaterDate(
                        brouillon.publie_at
                      )}`
                    : "Jamais publié"}
                </span>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
              <label>
                <span className="text-sm font-medium text-slate-700">
                  Titre
                </span>
                <input
                  value={brouillon.titre_brouillon}
                  onChange={(event) =>
                    modifierBrouillon(
                      "titre_brouillon",
                      event.target.value
                    )
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </label>

              <label>
                <span className="text-sm font-medium text-slate-700">
                  Version
                </span>
                <input
                  value={brouillon.version_brouillon}
                  onChange={(event) =>
                    modifierBrouillon(
                      "version_brouillon",
                      event.target.value
                    )
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  placeholder="1.0"
                />
              </label>
            </div>

            <label className="mt-5 block">
              <span className="text-sm font-medium text-slate-700">
                Contenu
              </span>
              <textarea
                value={brouillon.contenu_brouillon}
                onChange={(event) =>
                  modifierBrouillon(
                    "contenu_brouillon",
                    event.target.value
                  )
                }
                rows={34}
                spellCheck
                className="mt-1.5 w-full resize-y rounded-2xl border border-slate-300 px-4 py-4 font-mono text-sm leading-6 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </label>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">
              Mise en forme acceptée : <strong># Titre</strong>,{" "}
              <strong>## Section</strong>,{" "}
              <strong>### Sous-section</strong> et{" "}
              <strong>- élément de liste</strong>. Les textes sont
              rendus sans HTML pour éviter l’injection de code.
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Etat
                label="Brouillon"
                valeur={
                  modifie
                    ? "Modifications non enregistrées"
                    : "Enregistré"
                }
                actif={!modifie}
              />
              <Etat
                label="Publication"
                valeur={
                  brouillon.publie_at
                    ? `Version ${brouillon.version_publie}`
                    : "Aucune version"
                }
                actif={Boolean(brouillon.publie_at)}
              />
              <Etat
                label="Nouvelle version"
                valeur={
                  differeVersionPubliee
                    ? "Prête après validation"
                    : "Identique au public"
                }
                actif={!differeVersionPubliee}
              />
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Link
                href={informations.cheminPublic}
                target="_blank"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Voir la page publique
              </Link>
              <button
                type="button"
                onClick={() => void enregistrerBrouillon()}
                disabled={enregistrement || !modifie}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-40"
              >
                {enregistrement
                  ? "Enregistrement…"
                  : "Enregistrer le brouillon"}
              </button>
              <button
                type="button"
                onClick={() => void publierDocument()}
                disabled={
                  publication ||
                  modifie ||
                  !differeVersionPubliee ||
                  contientPlaceholders(
                    brouillon.contenu_brouillon
                  )
                }
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
              >
                {publication
                  ? "Publication…"
                  : "Publier cette version"}
              </button>
            </div>
          </article>

          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            Les modèles sont des structures de travail. Les choix
            contractuels, durées, responsabilités, sous-traitants,
            transferts et coordonnées doivent être complétés puis
            contrôlés avant publication.
          </div>
        </section>
      </div>
    </main>
  );
}

function Etat({
  label,
  valeur,
  actif,
}: {
  label: string;
  valeur: string;
  actif: boolean;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1 text-sm font-semibold ${
          actif ? "text-emerald-700" : "text-amber-700"
        }`}
      >
        {valeur}
      </p>
    </div>
  );
}