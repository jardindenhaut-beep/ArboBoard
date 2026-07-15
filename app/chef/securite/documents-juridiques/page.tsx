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

function compterPlaceholders(contenu: string) {
  const correspondances =
    contenu.match(/\[\[[^\]]+\]\]/g) || [];

  return new Set(correspondances).size;
}

function compterMots(contenu: string) {
  const texte = contenu.trim();

  if (!texte) return 0;

  return texte.split(/\s+/).filter(Boolean).length;
}

function documentComplet(
  document: DocumentJuridiquePlateforme
) {
  return Boolean(
    document.titre_brouillon.trim() &&
      document.version_brouillon.trim() &&
      document.contenu_brouillon.trim()
  );
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
  const [actualisation, setActualisation] = useState(false);
  const [enregistrement, setEnregistrement] =
    useState(false);
  const [publication, setPublication] = useState(false);
  const [modeAffichage, setModeAffichage] =
    useState<"edition" | "apercu">("edition");
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

  const statistiquesDocuments = useMemo(() => {
    const publies = documents.filter(
      (document) => Boolean(document.publie_at)
    ).length;

    return {
      total: documents.length,
      publies,
      aPublier: documents.filter(
        (document) =>
          document.titre_brouillon !==
            document.titre_publie ||
          document.contenu_brouillon !==
            document.contenu_publie ||
          document.version_brouillon !==
            document.version_publie
      ).length,
      avecPlaceholders: documents.filter(
        (document) =>
          contientPlaceholders(
            document.contenu_brouillon
          )
      ).length,
    };
  }, [documents]);

  const statistiquesBrouillon = useMemo(() => {
    if (!brouillon) {
      return {
        caracteres: 0,
        mots: 0,
        lignes: 0,
        placeholders: 0,
      };
    }

    return {
      caracteres: brouillon.contenu_brouillon.length,
      mots: compterMots(
        brouillon.contenu_brouillon
      ),
      lignes:
        brouillon.contenu_brouillon.length > 0
          ? brouillon.contenu_brouillon.split("\n")
              .length
          : 0,
      placeholders: compterPlaceholders(
        brouillon.contenu_brouillon
      ),
    };
  }, [brouillon]);

  useEffect(() => {
    void chargerDocuments(true);
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

  async function chargerDocuments(
    chargementInitial = false
  ) {
    try {
      if (chargementInitial) {
        setChargement(true);
      } else {
        setActualisation(true);
      }

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
      setActualisation(false);
    }
  }

  async function actualiserDocuments() {
    if (
      modifie &&
      !window.confirm(
        "Abandonner les modifications non enregistrées et actualiser les documents ?"
      )
    ) {
      return;
    }

    setMessage("");
    await chargerDocuments(false);
    setMessage(
      "Les documents juridiques ont été actualisés."
    );
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
    setDocuments((anciens) => {
      const existe = anciens.some(
        (element) =>
          element.type_document ===
          document.type_document
      );

      if (!existe) {
        return [...anciens, document];
      }

      return anciens.map((element) =>
        element.type_document === document.type_document
          ? document
          : element
      );
    });

    setBrouillon(document);
    setBrouillonInitial(document);
  }

  function annulerModifications() {
    if (!brouillonInitial) return;

    setBrouillon(brouillonInitial);
    setErreur("");
    setMessage(
      "Les modifications non enregistrées ont été annulées."
    );
  }

  function reprendreVersionPubliee() {
    if (
      !brouillon ||
      !brouillon.titre_publie ||
      !brouillon.contenu_publie ||
      !brouillon.version_publie
    ) {
      setErreur(
        "Aucune version publiée n’est disponible pour ce document."
      );
      return;
    }

    if (
      modifie &&
      !window.confirm(
        "Remplacer le brouillon actuel par la version publiée ?"
      )
    ) {
      return;
    }

    setBrouillon({
      ...brouillon,
      titre_brouillon: brouillon.titre_publie,
      contenu_brouillon: brouillon.contenu_publie,
      version_brouillon: brouillon.version_publie,
    });

    setErreur("");
    setMessage(
      "La version publiée a été copiée dans le brouillon. Enregistrez pour conserver ce remplacement."
    );
    setModeAffichage("edition");
  }

  async function enregistrerBrouillon() {
    if (!brouillon) return;

    if (!brouillon.titre_brouillon.trim()) {
      setErreur("Le titre du document est obligatoire.");
      return;
    }

    if (!brouillon.version_brouillon.trim()) {
      setErreur("La version du document est obligatoire.");
      return;
    }

    if (!brouillon.contenu_brouillon.trim()) {
      setErreur("Le contenu du document est obligatoire.");
      return;
    }

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
            titre: brouillon.titre_brouillon.trim(),
            contenu: brouillon.contenu_brouillon.trim(),
            version: brouillon.version_brouillon.trim(),
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

    if (!documentComplet(brouillon)) {
      setErreur(
        "Le titre, la version et le contenu doivent être renseignés avant la publication."
      );
      return;
    }

    if (modifie) {
      setErreur(
        "Enregistrez d’abord le brouillon avant de le publier."
      );
      return;
    }

    if (contientPlaceholders(brouillon.contenu_brouillon)) {
      setErreur(
        `Le document contient encore ${statistiquesBrouillon.placeholders} champ(s) [[A_COMPLETER]].`
      );
      return;
    }

    if (!differeVersionPubliee) {
      setErreur(
        "Cette version est déjà identique à la version publique."
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
      <div className="mx-auto max-w-7xl">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-2xl">
            ⏳
          </div>

          <p className="font-semibold text-slate-950">
            Chargement des documents juridiques…
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Récupération des brouillons et des versions publiées.
          </p>
        </div>
      </div>
    );
  }

  if (!brouillon) {
    return (
      <main className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-800 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-xl">
              !
            </div>

            <div>
              <h1 className="font-black text-red-950">
                Documents juridiques indisponibles
              </h1>

              <p className="mt-2 text-sm leading-6">
                {erreur ||
                  "Aucun document juridique n’a été trouvé. Vérifiez l’initialisation de la table et des modèles."}
              </p>

              <button
                type="button"
                onClick={() =>
                  void chargerDocuments(true)
                }
                className="mt-4 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800"
              >
                Réessayer
              </button>
            </div>
          </div>
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
      <header className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 bg-violet-600" />

        <div className="bg-gradient-to-br from-violet-50 via-white to-white p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-2xl text-white shadow-sm">
                ⚖️
              </div>

              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">
                  Administration de la plateforme
                </p>

                <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  Documents juridiques
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  Préparez les brouillons, faites-les contrôler puis
                  publiez-les sans modifier la version publique avant
                  validation.
                </p>
              </div>
            </div>

            <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto">
              <button
                type="button"
                onClick={() =>
                  void actualiserDocuments()
                }
                disabled={
                  actualisation ||
                  enregistrement ||
                  publication
                }
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span aria-hidden="true">↻</span>
                {actualisation
                  ? "Actualisation…"
                  : "Actualiser"}
              </button>

              <Link
                href="/chef/securite"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                ← Sécurité
              </Link>
            </div>
          </div>
        </div>
      </header>

      {erreur ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {erreur}
        </div>
      ) : null}

      {message ? (
        <div
          role="status"
          className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
        >
          {message}
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatistiqueDocument
          label="Documents"
          valeur={String(statistiquesDocuments.total)}
          description="Modèles disponibles"
        />

        <StatistiqueDocument
          label="Publiés"
          valeur={String(statistiquesDocuments.publies)}
          description="Pages publiques actives"
          positif={statistiquesDocuments.publies > 0}
        />

        <StatistiqueDocument
          label="À publier"
          valeur={String(statistiquesDocuments.aPublier)}
          description="Brouillons différents du public"
        />

        <StatistiqueDocument
          label="Avec placeholders"
          valeur={String(
            statistiquesDocuments.avecPlaceholders
          )}
          description="Documents encore incomplets"
          alerte={
            statistiquesDocuments.avecPlaceholders > 0
          }
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
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
                <div className="flex items-start justify-between gap-3">
                  <p className="font-black text-slate-950">
                    {infos.label}
                  </p>

                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                      document?.publie_at
                        ? "bg-emerald-500"
                        : "bg-amber-400"
                    }`}
                    aria-hidden="true"
                  />
                </div>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {document?.publie_at
                    ? `Publié : ${document.version_publie}`
                    : "Jamais publié"}
                </p>

                {document &&
                contientPlaceholders(
                  document.contenu_brouillon
                ) ? (
                  <p className="mt-2 text-[11px] font-bold text-amber-700">
                    Champs à compléter
                  </p>
                ) : null}
              </button>
            );
          })}
        </aside>

        <section className="space-y-5">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  {informations.label}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {informations.description}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
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

            <div className="mt-5 flex w-full rounded-2xl bg-slate-100 p-1 sm:w-fit">
              <button
                type="button"
                onClick={() =>
                  setModeAffichage("edition")
                }
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition sm:flex-none ${
                  modeAffichage === "edition"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Édition
              </button>

              <button
                type="button"
                onClick={() =>
                  setModeAffichage("apercu")
                }
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition sm:flex-none ${
                  modeAffichage === "apercu"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Aperçu sécurisé
              </button>
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
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm text-slate-950 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
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
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm text-slate-950 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                  placeholder="1.0"
                />
              </label>
            </div>

            {modeAffichage === "edition" ? (
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
                  className="mt-1.5 w-full resize-y rounded-2xl border border-slate-300 px-4 py-4 font-mono text-sm leading-6 text-slate-950 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                />
              </label>
            ) : (
              <ApercuDocument
                titre={brouillon.titre_brouillon}
                contenu={brouillon.contenu_brouillon}
                version={brouillon.version_brouillon}
              />
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MiniStatistique
                label="Caractères"
                valeur={statistiquesBrouillon.caracteres}
              />
              <MiniStatistique
                label="Mots"
                valeur={statistiquesBrouillon.mots}
              />
              <MiniStatistique
                label="Lignes"
                valeur={statistiquesBrouillon.lignes}
              />
              <MiniStatistique
                label="Placeholders"
                valeur={statistiquesBrouillon.placeholders}
                alerte={
                  statistiquesBrouillon.placeholders > 0
                }
              />
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">
              Mise en forme acceptée : <strong># Titre</strong>,{" "}
              <strong>## Section</strong>,{" "}
              <strong>### Sous-section</strong> et{" "}
              <strong>- élément de liste</strong>. Les textes sont
              rendus sans HTML pour éviter l’injection de code.
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="grid gap-3 sm:grid-cols-3">
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

            <div className="mt-6 flex flex-col gap-3">
              {modifie ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                  Des modifications ne sont pas encore enregistrées.
                </div>
              ) : null}

              <div className="grid gap-2 sm:grid-cols-2 xl:flex xl:flex-wrap xl:justify-end">
                <Link
                  href={informations.cheminPublic}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Voir la page publique
                </Link>

                <button
                  type="button"
                  onClick={reprendreVersionPubliee}
                  disabled={
                    enregistrement ||
                    publication ||
                    !brouillon.publie_at
                  }
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Reprendre la version publiée
                </button>

                <button
                  type="button"
                  onClick={annulerModifications}
                  disabled={
                    enregistrement ||
                    publication ||
                    !modifie
                  }
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-amber-200 px-4 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Annuler les modifications
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void enregistrerBrouillon()
                  }
                  disabled={enregistrement || !modifie}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {enregistrement
                    ? "Enregistrement…"
                    : "Enregistrer le brouillon"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void publierDocument()
                  }
                  disabled={
                    publication ||
                    modifie ||
                    !differeVersionPubliee ||
                    contientPlaceholders(
                      brouillon.contenu_brouillon
                    ) ||
                    !documentComplet(brouillon)
                  }
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {publication
                    ? "Publication…"
                    : "Publier cette version"}
                </button>
              </div>
            </div>
          </article>

          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-xl">
                ⚠️
              </div>

              <p className="text-sm leading-6 text-amber-900">
                Les modèles sont des structures de travail. Les choix
                contractuels, durées, responsabilités, sous-traitants,
                transferts et coordonnées doivent être complétés puis
                contrôlés avant publication.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatistiqueDocument({
  label,
  valeur,
  description,
  positif = false,
  alerte = false,
}: {
  label: string;
  valeur: string;
  description: string;
  positif?: boolean;
  alerte?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p
        className={`mt-2 text-2xl font-black ${
          alerte
            ? "text-amber-700"
            : positif
              ? "text-emerald-700"
              : "text-slate-950"
        }`}
      >
        {valeur}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function MiniStatistique({
  label,
  valeur,
  alerte = false,
}: {
  label: string;
  valeur: number;
  alerte?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-3 ${
        alerte
          ? "border-amber-200 bg-amber-50"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <p
        className={`text-[11px] font-semibold uppercase tracking-wide ${
          alerte ? "text-amber-600" : "text-slate-400"
        }`}
      >
        {label}
      </p>

      <p
        className={`mt-1 font-black ${
          alerte ? "text-amber-800" : "text-slate-900"
        }`}
      >
        {valeur}
      </p>
    </div>
  );
}

function ApercuDocument({
  titre,
  contenu,
  version,
}: {
  titre: string;
  contenu: string;
  version: string;
}) {
  const lignes = contenu.split("\n");

  return (
    <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 p-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-600">
          Aperçu public sécurisé
        </p>

        <h3 className="mt-2 text-2xl font-black text-slate-950">
          {titre || "Titre non renseigné"}
        </h3>

        <p className="mt-1 text-xs text-slate-500">
          Version {version || "non renseignée"}
        </p>
      </div>

      <div className="space-y-3 p-5 sm:p-7">
        {contenu.trim() ? (
          lignes.map((ligne, index) => {
            const cle = `${index}-${ligne.slice(0, 24)}`;

            if (ligne.startsWith("### ")) {
              return (
                <h4
                  key={cle}
                  className="pt-3 text-base font-black text-slate-900"
                >
                  {ligne.slice(4)}
                </h4>
              );
            }

            if (ligne.startsWith("## ")) {
              return (
                <h3
                  key={cle}
                  className="pt-5 text-xl font-black text-slate-950"
                >
                  {ligne.slice(3)}
                </h3>
              );
            }

            if (ligne.startsWith("# ")) {
              return (
                <h2
                  key={cle}
                  className="pt-4 text-2xl font-black text-slate-950"
                >
                  {ligne.slice(2)}
                </h2>
              );
            }

            if (ligne.startsWith("- ")) {
              return (
                <div
                  key={cle}
                  className="flex items-start gap-2 text-sm leading-6 text-slate-700"
                >
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                  <span>{ligne.slice(2)}</span>
                </div>
              );
            }

            if (!ligne.trim()) {
              return <div key={cle} className="h-2" />;
            }

            return (
              <p
                key={cle}
                className="whitespace-pre-wrap text-sm leading-7 text-slate-700"
              >
                {ligne}
              </p>
            );
          })
        ) : (
          <p className="text-sm text-slate-500">
            Aucun contenu à prévisualiser.
          </p>
        )}
      </div>
    </div>
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
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
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