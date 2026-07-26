"use client";

import Link from "next/link";
import PiedDePagePublic from "@/components/public/PiedDePagePublic";
import {
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type DocumentPublie = {
  titre?: string | null;
  version?: string | null;
  publie_at?: string | null;
};

type ReponseVersionsJuridiques = {
  documents?: {
    cgu?: DocumentPublie;
    politique_confidentialite?: DocumentPublie;
  };
  erreur?: string;
};

export default function InscriptionPage() {
  const router = useRouter();

  const [nomEntreprise, setNomEntreprise] =
    useState("");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] =
    useState("");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] =
    useState("");
  const [
    confirmationMotDePasse,
    setConfirmationMotDePasse,
  ] = useState("");

  const [acceptationCgu, setAcceptationCgu] =
    useState(false);
  const [
    acceptationConfidentialite,
    setAcceptationConfidentialite,
  ] = useState(false);

  const [versionCgu, setVersionCgu] =
    useState("");
  const [
    versionConfidentialite,
    setVersionConfidentialite,
  ] = useState("");
  const [
    chargementDocuments,
    setChargementDocuments,
  ] = useState(true);

  const [chargement, setChargement] =
    useState(false);
  const [message, setMessage] =
    useState("");

  useEffect(() => {
    let actif = true;

    async function chargerVersions() {
      try {
        setChargementDocuments(true);

        const reponse = await fetch(
          "/api/juridique/versions",
          {
            cache: "no-store",
          }
        );

        const donnees =
          (await reponse.json()) as ReponseVersionsJuridiques;

        if (!reponse.ok) {
          throw new Error(
            donnees.erreur ||
              "Impossible de charger les documents juridiques."
          );
        }

        const cgu =
          donnees.documents?.cgu?.version;
        const confidentialite =
          donnees.documents
            ?.politique_confidentialite
            ?.version;

        if (!cgu || !confidentialite) {
          throw new Error(
            "Les CGU ou la Politique de confidentialité ne sont pas encore publiées."
          );
        }

        if (!actif) return;

        setVersionCgu(cgu);
        setVersionConfidentialite(
          confidentialite
        );
      } catch (error) {
        if (!actif) return;

        setMessage(
          error instanceof Error
            ? error.message
            : "Impossible de charger les documents juridiques."
        );
      } finally {
        if (actif) {
          setChargementDocuments(false);
        }
      }
    }

    void chargerVersions();

    return () => {
      actif = false;
    };
  }, []);

  async function creerCompte() {
    setChargement(true);
    setMessage("");

    if (!nomEntreprise.trim()) {
      setMessage(
        "Merci de renseigner le nom de l'entreprise."
      );
      setChargement(false);
      return;
    }

    if (!prenom.trim() || !nom.trim()) {
      setMessage(
        "Merci de renseigner ton prénom et ton nom."
      );
      setChargement(false);
      return;
    }

    if (!email.trim()) {
      setMessage(
        "Merci de renseigner ton email."
      );
      setChargement(false);
      return;
    }

    if (motDePasse.length < 8) {
      setMessage(
        "Le mot de passe doit contenir au moins 8 caractères."
      );
      setChargement(false);
      return;
    }

    if (
      motDePasse !==
      confirmationMotDePasse
    ) {
      setMessage(
        "Les deux mots de passe ne correspondent pas."
      );
      setChargement(false);
      return;
    }

    if (
      !versionCgu ||
      !versionConfidentialite
    ) {
      setMessage(
        "Les documents juridiques publiés sont indisponibles. Actualise la page avant de recommencer."
      );
      setChargement(false);
      return;
    }

    if (!acceptationCgu) {
      setMessage(
        "Tu dois accepter les Conditions générales d’utilisation."
      );
      setChargement(false);
      return;
    }

    if (!acceptationConfidentialite) {
      setMessage(
        "Tu dois confirmer avoir lu la Politique de confidentialité."
      );
      setChargement(false);
      return;
    }

    const {
      data: inscriptionData,
      error: erreurInscription,
    } = await supabase.auth.signUp({
      email: email.trim(),
      password: motDePasse,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          inscription_arboboard: true,
          nom_entreprise:
            nomEntreprise.trim(),
          prenom: prenom.trim(),
          nom: nom.trim(),
          telephone: telephone.trim(),
          acceptation_cgu: true,
          version_cgu: versionCgu,
          acceptation_confidentialite:
            true,
          version_confidentialite:
            versionConfidentialite,
          user_agent:
            window.navigator.userAgent.slice(
              0,
              500
            ),
        },
      },
    });

    if (erreurInscription) {
      setMessage(
        erreurInscription.message ||
          "Erreur lors de l'inscription."
      );
      setChargement(false);
      return;
    }

    if (!inscriptionData.user) {
      setMessage(
        "Impossible de créer le compte utilisateur."
      );
      setChargement(false);
      return;
    }

    if (!inscriptionData.session) {
      setMessage(
        "Compte créé. Vérifie ton email pour confirmer ton compte, puis connecte-toi."
      );
      setChargement(false);
      return;
    }

    const { error: erreurCreationSaas } =
      await supabase.rpc(
        "creer_compte_saas",
        {
          p_nom_entreprise:
            nomEntreprise.trim(),
          p_email: email.trim(),
          p_nom: nom.trim(),
          p_prenom: prenom.trim(),
          p_telephone:
            telephone.trim(),
        }
      );

    if (erreurCreationSaas) {
      setMessage(
        erreurCreationSaas.message ||
          "Compte créé, mais impossible de créer l'espace entreprise."
      );
      setChargement(false);
      return;
    }

    setMessage(
      "Compte entreprise créé avec succès."
    );

    window.setTimeout(() => {
      router.push("/chef/dashboard");
    }, 800);
  }

  const formulaireBloque =
    chargement ||
    chargementDocuments ||
    !versionCgu ||
    !versionConfidentialite;

  return (
    <main className="flex min-h-screen flex-col bg-slate-100">
      <div className="mx-auto flex w-full flex-1 max-w-2xl flex-col justify-center px-6 py-12">
        <div className="mb-6 text-center">
          <Link
            href="/"
            className="text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            ← Retour à l&apos;accueil
          </Link>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
              🌱
            </div>

            <h1 className="text-3xl font-bold text-slate-900">
              Créer mon espace Arboboard
            </h1>

            <p className="mt-2 text-slate-600">
              Crée ton compte entreprise et accède à ton espace chef.
            </p>
          </div>

          <div className="grid gap-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Nom de l&apos;entreprise
              </label>

              <input
                value={nomEntreprise}
                onChange={(event) =>
                  setNomEntreprise(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                placeholder="Exemple : Jardin d'en haut"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Prénom
                </label>

                <input
                  value={prenom}
                  onChange={(event) =>
                    setPrenom(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="Prénom"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Nom
                </label>

                <input
                  value={nom}
                  onChange={(event) =>
                    setNom(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="Nom"
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Email
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="contact@entreprise.fr"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Téléphone
                </label>

                <input
                  value={telephone}
                  onChange={(event) =>
                    setTelephone(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="07 00 00 00 00"
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Mot de passe
                </label>

                <input
                  type="password"
                  value={motDePasse}
                  onChange={(event) =>
                    setMotDePasse(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="8 caractères minimum"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Confirmer le mot de passe
                </label>

                <input
                  type="password"
                  value={
                    confirmationMotDePasse
                  }
                  onChange={(event) =>
                    setConfirmationMotDePasse(
                      event.target.value
                    )
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter"
                    ) {
                      void creerCompte();
                    }
                  }}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="Confirmer"
                />
              </div>
            </div>

            <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-900">
                Documents obligatoires
              </p>

              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={acceptationCgu}
                  onChange={(event) =>
                    setAcceptationCgu(
                      event.target.checked
                    )
                  }
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm leading-6 text-slate-700">
                  J’accepte les{" "}
                  <Link
                    href="/cgu"
                    target="_blank"
                    className="font-semibold text-slate-950 underline"
                  >
                    Conditions générales d’utilisation
                  </Link>
                  {versionCgu
                    ? ` (version ${versionCgu})`
                    : ""}.
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={
                    acceptationConfidentialite
                  }
                  onChange={(event) =>
                    setAcceptationConfidentialite(
                      event.target.checked
                    )
                  }
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm leading-6 text-slate-700">
                  Je confirme avoir lu la{" "}
                  <Link
                    href="/politique-confidentialite"
                    target="_blank"
                    className="font-semibold text-slate-950 underline"
                  >
                    Politique de confidentialité
                  </Link>
                  {versionConfidentialite
                    ? ` (version ${versionConfidentialite})`
                    : ""}.
                </span>
              </label>

              {chargementDocuments ? (
                <p className="text-xs text-slate-500">
                  Chargement des versions publiées…
                </p>
              ) : null}
            </section>

            <button
              type="button"
              onClick={() =>
                void creerCompte()
              }
              disabled={formulaireBloque}
              className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {chargement
                ? "Création du compte..."
                : "Créer mon espace"}
            </button>

            {message ? (
              <p
                role="status"
                className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700"
              >
                {message}
              </p>
            ) : null}

            <p className="text-center text-sm text-slate-500">
              Déjà un compte ?{" "}
              <Link
                href="/connexion"
                className="font-semibold text-slate-900 hover:underline"
              >
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>

      <PiedDePagePublic compact />
    </main>
  );
}