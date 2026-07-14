"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { chargerContexteEntreprise } from "@/lib/entreprise";
import { supabase } from "@/lib/supabaseClient";

type ResultatContexteEntreprise = Awaited<
  ReturnType<typeof chargerContexteEntreprise>
>;

type ContexteEntrepriseBrut = NonNullable<
  ResultatContexteEntreprise["contexte"]
>;

type EntrepriseCanonique = NonNullable<
  ContexteEntrepriseBrut["entreprise"]
> & {
  id: string;
  nom_entreprise?: string | null;
  adresse?: string | null;
  code_postal?: string | null;
  ville?: string | null;
  telephone?: string | null;
  email_contact?: string | null;
  siret?: string | null;
  numero_tva?: string | null;
  forme_juridique?: string | null;
};

type EntrepriseParametres = {
  nom_entreprise: string;
  adresse: string;
  code_postal: string;
  ville: string;
  telephone: string;
  email: string;
  siret: string;
  numero_tva_intracommunautaire: string;
  forme_juridique: string;
  logo_url: string;
  assurance_professionnelle: string;
  mentions_legales: string;
  conditions_generales_devis: string;
  conditions_generales_factures: string;
  delai_paiement_defaut: number;
  tva_defaut: number;
  prefixe_devis: string;
  prefixe_facture: string;
  prefixe_avoir: string;
};

const FORMULAIRE_VIDE: EntrepriseParametres = {
  nom_entreprise: "",
  adresse: "",
  code_postal: "",
  ville: "",
  telephone: "",
  email: "",
  siret: "",
  numero_tva_intracommunautaire: "",
  forme_juridique: "",
  logo_url: "",
  assurance_professionnelle: "",
  mentions_legales: "",
  conditions_generales_devis: "",
  conditions_generales_factures: "",
  delai_paiement_defaut: 30,
  tva_defaut: 20,
  prefixe_devis: "DEV",
  prefixe_facture: "FAC",
  prefixe_avoir: "AV",
};

function texte(valeur: unknown) {
  return typeof valeur === "string" ? valeur : "";
}

function premiereValeur(...valeurs: unknown[]) {
  for (const valeur of valeurs) {
    const texteValeur = texte(valeur).trim();
    if (texteValeur) return texteValeur;
  }

  return "";
}

function nombreOuDefaut(valeur: unknown, defaut: number) {
  const nombre = Number(valeur);
  return Number.isFinite(nombre) ? nombre : defaut;
}

function obtenirMessageErreur(error: unknown, messageParDefaut: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return messageParDefaut;
}

function normaliserPrefixe(valeur: string, defaut: string) {
  const prefixe = valeur
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 10);

  return prefixe || defaut;
}

function emailValide(email: string) {
  if (!email.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function siretValide(siret: string) {
  if (!siret.trim()) return true;
  return siret.replace(/\s/g, "").length === 14;
}

export default function PageParametresChef() {
  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);
  const [form, setForm] =
    useState<EntrepriseParametres>(FORMULAIRE_VIDE);
  const [formEnregistre, setFormEnregistre] =
    useState<EntrepriseParametres>(FORMULAIRE_VIDE);

  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [uploadLogoEnCours, setUploadLogoEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const formulaireModifie = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(formEnregistre),
    [form, formEnregistre]
  );

  useEffect(() => {
    void chargerParametres();
  }, []);

  useEffect(() => {
    function avertirAvantFermeture(event: BeforeUnloadEvent) {
      if (!formulaireModifie) return;

      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", avertirAvantFermeture);

    return () => {
      window.removeEventListener("beforeunload", avertirAvantFermeture);
    };
  }, [formulaireModifie]);

  async function chargerParametres() {
    try {
      setChargement(true);
      setErreur(null);
      setMessage(null);

      const resultat = await chargerContexteEntreprise();

      if (
        resultat.erreur ||
        !resultat.contexte?.profil ||
        !resultat.contexte?.entreprise
      ) {
        throw new Error(
          resultat.erreur ||
            "Impossible de charger les paramètres de l’entreprise."
        );
      }

      const entreprise =
        resultat.contexte.entreprise as EntrepriseCanonique;

      if (!entreprise.id) {
        throw new Error("Entreprise introuvable.");
      }

      setEntrepriseId(entreprise.id);

      const { data: parametres, error: parametresError } =
        await supabase
          .from("entreprise_parametres")
          .select("*")
          .eq("entreprise_id", entreprise.id)
          .maybeSingle();

      if (parametresError) throw parametresError;

      const formulaireCharge: EntrepriseParametres = {
        nom_entreprise: premiereValeur(
          entreprise.nom_entreprise,
          parametres?.nom_entreprise
        ),
        adresse: premiereValeur(
          entreprise.adresse,
          parametres?.adresse
        ),
        code_postal: premiereValeur(
          entreprise.code_postal,
          parametres?.code_postal
        ),
        ville: premiereValeur(
          entreprise.ville,
          parametres?.ville
        ),
        telephone: premiereValeur(
          entreprise.telephone,
          parametres?.telephone
        ),
        email: premiereValeur(
          entreprise.email_contact,
          parametres?.email
        ),
        siret: premiereValeur(
          entreprise.siret,
          parametres?.siret
        ),
        numero_tva_intracommunautaire: premiereValeur(
          entreprise.numero_tva,
          parametres?.numero_tva_intracommunautaire
        ),
        forme_juridique: premiereValeur(
          entreprise.forme_juridique,
          parametres?.forme_juridique
        ),
        logo_url: texte(parametres?.logo_url),
        assurance_professionnelle: texte(
          parametres?.assurance_professionnelle
        ),
        mentions_legales: texte(parametres?.mentions_legales),
        conditions_generales_devis: texte(
          parametres?.conditions_generales_devis
        ),
        conditions_generales_factures: texte(
          parametres?.conditions_generales_factures
        ),
        delai_paiement_defaut: nombreOuDefaut(
          parametres?.delai_paiement_defaut,
          30
        ),
        tva_defaut: nombreOuDefaut(parametres?.tva_defaut, 20),
        prefixe_devis:
          texte(parametres?.prefixe_devis) || "DEV",
        prefixe_facture:
          texte(parametres?.prefixe_facture) || "FAC",
        prefixe_avoir:
          texte(parametres?.prefixe_avoir) || "AV",
      };

      setForm(formulaireCharge);
      setFormEnregistre(formulaireCharge);
    } catch (error) {
      console.error("Erreur chargement paramètres :", error);
      setErreur(
        obtenirMessageErreur(
          error,
          "Erreur lors du chargement des paramètres."
        )
      );
    } finally {
      setChargement(false);
    }
  }

  function modifierChamp<K extends keyof EntrepriseParametres>(
    champ: K,
    valeur: EntrepriseParametres[K]
  ) {
    setForm((ancien) => ({
      ...ancien,
      [champ]: valeur,
    }));
    setErreur(null);
    setMessage(null);
  }

  function restaurerReglagesDocuments() {
    setForm((ancien) => ({
      ...ancien,
      delai_paiement_defaut: 30,
      tva_defaut: 20,
      prefixe_devis: "DEV",
      prefixe_facture: "FAC",
      prefixe_avoir: "AV",
    }));
    setErreur(null);
    setMessage(
      "Les réglages standards ont été restaurés. Enregistrez pour les conserver."
    );
  }

  async function uploaderLogo(event: ChangeEvent<HTMLInputElement>) {
    try {
      setErreur(null);
      setMessage(null);

      const fichier = event.target.files?.[0];

      if (!fichier) return;

      if (!entrepriseId) {
        throw new Error("Entreprise introuvable.");
      }

      const typesAutorises = [
        "image/png",
        "image/jpeg",
        "image/webp",
      ];

      if (!typesAutorises.includes(fichier.type)) {
        throw new Error(
          "Format non autorisé. Utilisez un logo en PNG, JPG ou WEBP."
        );
      }

      const tailleMax = 2 * 1024 * 1024;

      if (fichier.size > tailleMax) {
        throw new Error(
          "Le logo est trop lourd. La taille maximale est de 2 Mo."
        );
      }

      setUploadLogoEnCours(true);

      const extension =
        fichier.name
          .split(".")
          .pop()
          ?.toLowerCase()
          .replace(/[^a-z0-9]/g, "") || "png";

      const cheminLogo = `${entrepriseId}/logo-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("logos-entreprises")
        .upload(cheminLogo, fichier, {
          cacheControl: "3600",
          upsert: false,
          contentType: fichier.type,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("logos-entreprises")
        .getPublicUrl(cheminLogo);

      if (!data.publicUrl) {
        throw new Error(
          "Impossible de récupérer l’adresse publique du logo."
        );
      }

      modifierChamp("logo_url", data.publicUrl);
      setMessage(
        "Le logo a été envoyé. Enregistrez les paramètres pour le conserver."
      );
    } catch (error) {
      console.error("Erreur envoi logo :", error);
      setErreur(
        obtenirMessageErreur(
          error,
          "Erreur lors de l’envoi du logo."
        )
      );
    } finally {
      setUploadLogoEnCours(false);
      event.target.value = "";
    }
  }

  async function enregistrerParametres() {
    if (!entrepriseId) {
      setErreur("Entreprise introuvable.");
      return;
    }

    if (!form.nom_entreprise.trim()) {
      setErreur("Le nom de l’entreprise est obligatoire.");
      return;
    }

    if (!emailValide(form.email)) {
      setErreur("L’adresse email de contact n’est pas valide.");
      return;
    }

    if (!siretValide(form.siret)) {
      setErreur("Le numéro SIRET doit contenir 14 chiffres.");
      return;
    }

    if (
      !Number.isFinite(form.tva_defaut) ||
      form.tva_defaut < 0 ||
      form.tva_defaut > 100
    ) {
      setErreur("La TVA par défaut doit être comprise entre 0 et 100 %.");
      return;
    }

    if (
      !Number.isFinite(form.delai_paiement_defaut) ||
      form.delai_paiement_defaut < 0 ||
      form.delai_paiement_defaut > 365
    ) {
      setErreur(
        "Le délai de paiement doit être compris entre 0 et 365 jours."
      );
      return;
    }

    try {
      setEnregistrement(true);
      setErreur(null);
      setMessage(null);

      const formulaireNormalise: EntrepriseParametres = {
        ...form,
        nom_entreprise: form.nom_entreprise.trim(),
        adresse: form.adresse.trim(),
        code_postal: form.code_postal.trim(),
        ville: form.ville.trim(),
        telephone: form.telephone.trim(),
        email: form.email.trim(),
        siret: form.siret.replace(/\s/g, "").trim(),
        numero_tva_intracommunautaire:
          form.numero_tva_intracommunautaire.trim().toUpperCase(),
        forme_juridique: form.forme_juridique.trim(),
        logo_url: form.logo_url.trim(),
        assurance_professionnelle:
          form.assurance_professionnelle.trim(),
        mentions_legales: form.mentions_legales.trim(),
        conditions_generales_devis:
          form.conditions_generales_devis.trim(),
        conditions_generales_factures:
          form.conditions_generales_factures.trim(),
        delai_paiement_defaut: Math.round(
          Number(form.delai_paiement_defaut)
        ),
        tva_defaut: Number(form.tva_defaut),
        prefixe_devis: normaliserPrefixe(
          form.prefixe_devis,
          "DEV"
        ),
        prefixe_facture: normaliserPrefixe(
          form.prefixe_facture,
          "FAC"
        ),
        prefixe_avoir: normaliserPrefixe(
          form.prefixe_avoir,
          "AV"
        ),
      };

      const payloadParametres = {
        entreprise_id: entrepriseId,
        ...formulaireNormalise,
      };

      const { error: parametresError } = await supabase
        .from("entreprise_parametres")
        .upsert(payloadParametres, {
          onConflict: "entreprise_id",
        });

      if (parametresError) throw parametresError;

      const { error: entrepriseError } = await supabase
        .from("entreprises_abonnees")
        .update({
          nom_entreprise: formulaireNormalise.nom_entreprise || null,
          adresse: formulaireNormalise.adresse || null,
          code_postal: formulaireNormalise.code_postal || null,
          ville: formulaireNormalise.ville || null,
          telephone: formulaireNormalise.telephone || null,
          email_contact: formulaireNormalise.email || null,
          siret: formulaireNormalise.siret || null,
          numero_tva:
            formulaireNormalise.numero_tva_intracommunautaire || null,
          forme_juridique:
            formulaireNormalise.forme_juridique || null,
        })
        .eq("id", entrepriseId);

      if (entrepriseError) throw entrepriseError;

      setForm(formulaireNormalise);
      setFormEnregistre(formulaireNormalise);
      setMessage("Les paramètres ont été enregistrés avec succès.");
    } catch (error) {
      console.error("Erreur enregistrement paramètres :", error);
      setErreur(
        obtenirMessageErreur(
          error,
          "Erreur lors de l’enregistrement des paramètres."
        )
      );
    } finally {
      setEnregistrement(false);
    }
  }

  if (chargement) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-50 text-3xl">
            ⚙️
          </div>
          <p className="text-lg font-bold text-slate-950">
            Chargement des paramètres…
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Récupération des réglages de l’entreprise.
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <p className="text-sm font-semibold text-emerald-700">
              Configuration
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              Paramètres de l’entreprise
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Configurez l’identité visuelle, la numérotation et les
              informations utilisées sur les devis, factures, avoirs et PDF.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/chef/compte"
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              ← Mon compte
            </Link>
            <Link
              href="/chef/profil"
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Profil entreprise
            </Link>
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

      {formulaireModifie ? (
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center">
          <p className="text-sm font-medium text-amber-800">
            Des modifications ne sont pas encore enregistrées.
          </p>
          <button
            type="button"
            onClick={() => {
              setForm(formEnregistre);
              setErreur(null);
              setMessage(null);
            }}
            className="w-fit text-sm font-semibold text-amber-900 hover:underline"
          >
            Annuler les modifications
          </button>
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <CarteParametres
            titre="Informations générales"
            description="Coordonnées reprises sur les documents commerciaux."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <ChampTexte
                label="Nom de l’entreprise"
                value={form.nom_entreprise}
                onChange={(valeur) =>
                  modifierChamp("nom_entreprise", valeur)
                }
                autoComplete="organization"
                required
              />
              <ChampTexte
                label="Forme juridique"
                placeholder="SAS, SARL, EI…"
                value={form.forme_juridique}
                onChange={(valeur) =>
                  modifierChamp("forme_juridique", valeur)
                }
              />
              <ChampTexte
                label="Téléphone"
                type="tel"
                autoComplete="tel"
                value={form.telephone}
                onChange={(valeur) =>
                  modifierChamp("telephone", valeur)
                }
              />
              <ChampTexte
                label="Email de contact"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(valeur) => modifierChamp("email", valeur)}
              />
              <ChampTexte
                label="SIRET"
                inputMode="numeric"
                maxLength={17}
                value={form.siret}
                onChange={(valeur) => modifierChamp("siret", valeur)}
                aide="14 chiffres. Les espaces sont supprimés à l’enregistrement."
              />
              <ChampTexte
                label="TVA intracommunautaire"
                value={form.numero_tva_intracommunautaire}
                onChange={(valeur) =>
                  modifierChamp(
                    "numero_tva_intracommunautaire",
                    valeur.toUpperCase()
                  )
                }
                placeholder="FR..."
              />
            </div>
          </CarteParametres>

          <CarteParametres
            titre="Adresse"
            description="Adresse administrative affichée sur les documents."
          >
            <div className="space-y-4">
              <ChampTexte
                label="Adresse"
                autoComplete="street-address"
                value={form.adresse}
                onChange={(valeur) =>
                  modifierChamp("adresse", valeur)
                }
              />

              <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
                <ChampTexte
                  label="Code postal"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  maxLength={10}
                  value={form.code_postal}
                  onChange={(valeur) =>
                    modifierChamp("code_postal", valeur)
                  }
                />
                <ChampTexte
                  label="Ville"
                  autoComplete="address-level2"
                  value={form.ville}
                  onChange={(valeur) =>
                    modifierChamp("ville", valeur)
                  }
                />
              </div>
            </div>
          </CarteParametres>

          <CarteParametres
            titre="Identité visuelle"
            description="Logo utilisé sur les devis, factures, avoirs et autres PDF."
          >
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    Importer un logo
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={uploaderLogo}
                    disabled={uploadLogoEnCours}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-emerald-700 hover:file:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </label>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  PNG, JPG ou WEBP. Taille maximale : 2 Mo. Privilégiez
                  un fichier horizontal avec un fond transparent.
                </p>

                {uploadLogoEnCours ? (
                  <p className="mt-3 text-sm font-medium text-slate-600">
                    Envoi du logo…
                  </p>
                ) : null}

                {form.logo_url ? (
                  <button
                    type="button"
                    onClick={() => modifierChamp("logo_url", "")}
                    className="mt-4 text-sm font-semibold text-red-700 hover:text-red-800"
                  >
                    Retirer le logo des documents
                  </button>
                ) : null}
              </div>

              <div className="flex min-h-36 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                {form.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.logo_url}
                    alt="Aperçu du logo de l’entreprise"
                    className="max-h-28 max-w-full object-contain"
                  />
                ) : (
                  <div className="text-center">
                    <div className="text-3xl">🌳</div>
                    <p className="mt-2 text-xs font-medium text-slate-500">
                      Aucun logo enregistré
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CarteParametres>

          <CarteParametres
            titre="Réglages des documents"
            description="Valeurs proposées automatiquement à la création."
            action={
              <button
                type="button"
                onClick={restaurerReglagesDocuments}
                className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Restaurer les valeurs standards
              </button>
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              <ChampNombre
                label="TVA par défaut"
                valeur={form.tva_defaut}
                onChange={(valeur) =>
                  modifierChamp("tva_defaut", valeur)
                }
                min={0}
                max={100}
                step={0.1}
                suffixe="%"
              />
              <ChampNombre
                label="Délai de paiement"
                valeur={form.delai_paiement_defaut}
                onChange={(valeur) =>
                  modifierChamp("delai_paiement_defaut", valeur)
                }
                min={0}
                max={365}
                step={1}
                suffixe="jours"
              />
            </div>
          </CarteParametres>

          <CarteParametres
            titre="Numérotation"
            description="Préfixes placés devant les numéros automatiques."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <ChampTexte
                label="Préfixe devis"
                value={form.prefixe_devis}
                onChange={(valeur) =>
                  modifierChamp(
                    "prefixe_devis",
                    valeur.toUpperCase()
                  )
                }
                maxLength={10}
                placeholder="DEV"
              />
              <ChampTexte
                label="Préfixe facture"
                value={form.prefixe_facture}
                onChange={(valeur) =>
                  modifierChamp(
                    "prefixe_facture",
                    valeur.toUpperCase()
                  )
                }
                maxLength={10}
                placeholder="FAC"
              />
              <ChampTexte
                label="Préfixe avoir"
                value={form.prefixe_avoir}
                onChange={(valeur) =>
                  modifierChamp(
                    "prefixe_avoir",
                    valeur.toUpperCase()
                  )
                }
                maxLength={10}
                placeholder="AV"
              />
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              Exemple :{" "}
              <span className="font-semibold text-slate-900">
                {normaliserPrefixe(form.prefixe_devis, "DEV")}-2026-0001
              </span>
            </div>
          </CarteParametres>

          <CarteParametres
            titre="Mentions et conditions"
            description="Textes ajoutés aux documents générés par Arboboard."
          >
            <div className="space-y-5">
              <ChampTextarea
                label="Assurance professionnelle"
                placeholder="Compagnie, contrat, zone de couverture…"
                value={form.assurance_professionnelle}
                onChange={(valeur) =>
                  modifierChamp(
                    "assurance_professionnelle",
                    valeur
                  )
                }
              />
              <ChampTextarea
                label="Mentions légales des documents"
                value={form.mentions_legales}
                onChange={(valeur) =>
                  modifierChamp("mentions_legales", valeur)
                }
              />
              <ChampTextarea
                label="Conditions générales des devis"
                value={form.conditions_generales_devis}
                onChange={(valeur) =>
                  modifierChamp(
                    "conditions_generales_devis",
                    valeur
                  )
                }
                rows={7}
              />
              <ChampTextarea
                label="Conditions générales des factures"
                value={form.conditions_generales_factures}
                onChange={(valeur) =>
                  modifierChamp(
                    "conditions_generales_factures",
                    valeur
                  )
                }
                rows={7}
              />
            </div>
          </CarteParametres>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-950">
              État de la configuration
            </h2>

            <div className="mt-4 space-y-3">
              <EtatConfiguration
                termine={Boolean(form.nom_entreprise.trim())}
                label="Identité de l’entreprise"
              />
              <EtatConfiguration
                termine={Boolean(
                  form.adresse.trim() &&
                    form.code_postal.trim() &&
                    form.ville.trim()
                )}
                label="Adresse complète"
              />
              <EtatConfiguration
                termine={Boolean(form.siret.trim())}
                label="Informations légales"
              />
              <EtatConfiguration
                termine={Boolean(form.logo_url.trim())}
                label="Logo"
              />
              <EtatConfiguration
                termine={Boolean(
                  form.conditions_generales_devis.trim()
                )}
                label="Conditions des devis"
              />
              <EtatConfiguration
                termine={Boolean(
                  form.conditions_generales_factures.trim()
                )}
                label="Conditions des factures"
              />
            </div>
          </article>

          <article className="rounded-3xl border border-blue-200 bg-blue-50 p-5">
            <h2 className="font-bold text-blue-950">
              Synchronisation automatique
            </h2>
            <p className="mt-2 text-sm leading-6 text-blue-800">
              Les coordonnées communes sont également enregistrées dans la
              fiche principale de l’entreprise afin d’éviter des informations
              différentes entre le profil et les documents.
            </p>
          </article>

          <article className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="font-bold text-amber-950">
              Conditions générales
            </h2>
            <p className="mt-2 text-sm leading-6 text-amber-800">
              Faites contrôler les textes définitifs avant la
              commercialisation du logiciel et leur utilisation sur les
              documents clients.
            </p>
            <Link
              href="/chef/securite"
              className="mt-4 inline-flex text-sm font-semibold text-amber-900 hover:underline"
            >
              Voir la conformité →
            </Link>
          </article>

          <button
            type="button"
            onClick={enregistrerParametres}
            disabled={enregistrement || !formulaireModifie}
            className="w-full rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {enregistrement
              ? "Enregistrement…"
              : "Enregistrer tous les paramètres"}
          </button>
        </aside>
      </section>

      <div className="sticky bottom-4 z-20 xl:hidden">
        <button
          type="button"
          onClick={enregistrerParametres}
          disabled={enregistrement || !formulaireModifie}
          className="w-full rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-bold text-white shadow-xl transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {enregistrement
            ? "Enregistrement…"
            : "Enregistrer tous les paramètres"}
        </button>
      </div>
    </main>
  );
}

function CarteParametres({
  titre,
  description,
  action,
  children,
}: {
  titre: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="text-lg font-bold text-slate-950">{titre}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        {action}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </article>
  );
}

function ChampTexte({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  aide,
  required = false,
  autoComplete,
  inputMode,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (valeur: string) => void;
  type?: string;
  placeholder?: string;
  aide?: string;
  required?: boolean;
  autoComplete?: string;
  inputMode?: "text" | "search" | "tel" | "url" | "email" | "numeric" | "decimal";
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
      />
      {aide ? (
        <span className="mt-1.5 block text-xs leading-5 text-slate-500">
          {aide}
        </span>
      ) : null}
    </label>
  );
}

function ChampNombre({
  label,
  valeur,
  onChange,
  min,
  max,
  step,
  suffixe,
}: {
  label: string;
  valeur: number;
  onChange: (valeur: number) => void;
  min: number;
  max: number;
  step: number;
  suffixe: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="relative mt-1.5">
        <input
          type="number"
          value={Number.isFinite(valeur) ? valeur : ""}
          min={min}
          max={max}
          step={step}
          onChange={(event) => {
            const nombre = event.target.valueAsNumber;
            onChange(Number.isFinite(nombre) ? nombre : 0);
          }}
          className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 pr-16 text-sm text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-slate-500">
          {suffixe}
        </span>
      </div>
    </label>
  );
}

function ChampTextarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (valeur: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <textarea
        value={value}
        placeholder={placeholder}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full resize-y rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
      />
    </label>
  );
}

function EtatConfiguration({
  termine,
  label,
}: {
  termine: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <span
        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
          termine
            ? "bg-emerald-100 text-emerald-700"
            : "bg-slate-200 text-slate-600"
        }`}
      >
        {termine ? "Complété" : "À compléter"}
      </span>
    </div>
  );
}