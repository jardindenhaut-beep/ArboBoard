"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabaseClient";

type TypeDocumentObligatoire =
  | "cgu"
  | "politique_confidentialite";

type DocumentAValider = {
  type_document:
    TypeDocumentObligatoire;
  titre: string;
  version: string;
  publie_at?: string | null;
  chemin_public: string;
};

type ReponseVerification = {
  acceptation_requise?: boolean;
  documents?: DocumentAValider[];
  erreur?: string;
};

type ReponseAcceptation = {
  succes?: boolean;
  erreur?: string;
};

function libelleCourt(
  typeDocument: TypeDocumentObligatoire
) {
  return typeDocument === "cgu"
    ? "CGU"
    : "Politique de confidentialité";
}

export default function AcceptationsObligatoires() {
  const [documents, setDocuments] =
    useState<DocumentAValider[]>([]);
  const [choix, setChoix] = useState<
    Record<string, boolean>
  >({});
  const [chargement, setChargement] =
    useState(true);
  const [enregistrement, setEnregistrement] =
    useState(false);
  const [erreur, setErreur] =
    useState("");

  const tousAcceptes = useMemo(
    () =>
      documents.length > 0 &&
      documents.every(
        (document) =>
          choix[
            `${document.type_document}:${document.version}`
          ] === true
      ),
    [choix, documents]
  );

  const obtenirJeton =
    useCallback(async () => {
      const {
        data: { session },
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (
        sessionError ||
        !session?.access_token
      ) {
        throw new Error(
          "Votre session a expiré. Veuillez vous reconnecter."
        );
      }

      return session.access_token;
    }, []);

  const verifier =
    useCallback(async () => {
      try {
        setChargement(true);
        setErreur("");

        const jeton =
          await obtenirJeton();

        const reponse = await fetch(
          "/api/securite/acceptations-requises",
          {
            headers: {
              Authorization:
                `Bearer ${jeton}`,
            },
            cache: "no-store",
          }
        );

        const donnees =
          (await reponse.json()) as ReponseVerification;

        if (!reponse.ok) {
          throw new Error(
            donnees.erreur ||
              "Impossible de vérifier les documents juridiques."
          );
        }

        setDocuments(
          donnees.documents || []
        );
      } catch (error) {
        setErreur(
          error instanceof Error
            ? error.message
            : "Impossible de vérifier les documents juridiques."
        );
      } finally {
        setChargement(false);
      }
    }, [obtenirJeton]);

  useEffect(() => {
    void verifier();
  }, [verifier]);

  async function enregistrerTout() {
    if (!tousAcceptes) return;

    try {
      setEnregistrement(true);
      setErreur("");

      const jeton =
        await obtenirJeton();

      for (const document of documents) {
        const reponse = await fetch(
          "/api/securite/acceptations-requises",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${jeton}`,
            },
            body: JSON.stringify({
              type_document:
                document.type_document,
              version_document:
                document.version,
            }),
          }
        );

        const donnees =
          (await reponse.json()) as ReponseAcceptation;

        if (!reponse.ok) {
          throw new Error(
            donnees.erreur ||
              "Impossible d’enregistrer une acceptation."
          );
        }
      }

      setDocuments([]);
      setChoix({});
    } catch (error) {
      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible d’enregistrer les acceptations."
      );
    } finally {
      setEnregistrement(false);
    }
  }

  if (
    chargement ||
    documents.length === 0
  ) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[200] overflow-y-auto bg-slate-950/70 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="acceptations-obligatoires-titre"
    >
      <div className="mx-auto flex min-h-full max-w-2xl items-center justify-center">
        <section className="w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
          <div className="h-1.5 bg-violet-600" />

          <div className="p-5 sm:p-7">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-2xl">
                ⚖️
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">
                  Mise à jour juridique
                </p>

                <h1
                  id="acceptations-obligatoires-titre"
                  className="mt-1 text-2xl font-black text-slate-950"
                >
                  Des documents doivent être acceptés
                </h1>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Arboboard a publié une nouvelle version de documents
                  nécessaires à l’utilisation du service. Consultez-les
                  puis confirmez votre acceptation pour continuer.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {documents.map(
                (document) => {
                  const cle =
                    `${document.type_document}:${document.version}`;

                  return (
                    <article
                      key={cle}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-bold text-slate-950">
                            {document.titre}
                          </p>

                          <p className="mt-1 text-xs font-medium text-slate-500">
                            Version{" "}
                            {document.version}
                          </p>
                        </div>

                        <Link
                          href={
                            document.chemin_public
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
                        >
                          Consulter
                        </Link>
                      </div>

                      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3">
                        <input
                          type="checkbox"
                          checked={
                            choix[cle] ===
                            true
                          }
                          onChange={(
                            event
                          ) =>
                            setChoix(
                              (
                                valeurs
                              ) => ({
                                ...valeurs,
                                [cle]:
                                  event
                                    .target
                                    .checked,
                              })
                            )
                          }
                          disabled={
                            enregistrement
                          }
                          className="mt-1 h-4 w-4 rounded border-slate-300"
                        />

                        <span className="text-sm leading-6 text-slate-700">
                          J’ai consulté et
                          j’accepte la version{" "}
                          <strong>
                            {
                              document.version
                            }
                          </strong>{" "}
                          des{" "}
                          {libelleCourt(
                            document.type_document
                          )}
                          .
                        </span>
                      </label>
                    </article>
                  );
                }
              )}
            </div>

            {erreur ? (
              <div
                role="alert"
                className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
              >
                {erreur}
              </div>
            ) : null}

            <div className="mt-6">
              <button
                type="button"
                onClick={() =>
                  void enregistrerTout()
                }
                disabled={
                  !tousAcceptes ||
                  enregistrement
                }
                className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-violet-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {enregistrement
                  ? "Enregistrement…"
                  : "Accepter et continuer"}
              </button>

              <p className="mt-3 text-center text-xs leading-5 text-slate-500">
                L’acceptation est enregistrée avec la version du document
                et l’horodatage serveur.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}