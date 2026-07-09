"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { supabase } from "@/lib/supabaseClient";

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

const formVide: EntrepriseParametres = {
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

export default function PageParametresChef() {
  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);
  const [form, setForm] = useState<EntrepriseParametres>(formVide);
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [uploadLogoEnCours, setUploadLogoEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    chargerParametres();
  }, []);

  async function chargerParametres() {
    try {
      setChargement(true);
      setErreur(null);
      setMessage(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error("Utilisateur non connecté.");
      }

      const { data: profil, error: profilError } = await supabase
        .from("profils_utilisateurs")
        .select("entreprise_id")
        .eq("id", user.id)
        .single();

      if (profilError) {
        throw profilError;
      }

      if (!profil?.entreprise_id) {
        throw new Error("Aucune entreprise liée à cet utilisateur.");
      }

      setEntrepriseId(profil.entreprise_id);

      const { data: parametres, error: parametresError } = await supabase
        .from("entreprise_parametres")
        .select("*")
        .eq("entreprise_id", profil.entreprise_id)
        .maybeSingle();

      if (parametresError) {
        throw parametresError;
      }

      if (parametres) {
        setForm({
          nom_entreprise: parametres.nom_entreprise || "",
          adresse: parametres.adresse || "",
          code_postal: parametres.code_postal || "",
          ville: parametres.ville || "",
          telephone: parametres.telephone || "",
          email: parametres.email || "",
          siret: parametres.siret || "",
          numero_tva_intracommunautaire:
            parametres.numero_tva_intracommunautaire || "",
          forme_juridique: parametres.forme_juridique || "",
          logo_url: parametres.logo_url || "",
          assurance_professionnelle:
            parametres.assurance_professionnelle || "",
          mentions_legales: parametres.mentions_legales || "",
          conditions_generales_devis:
            parametres.conditions_generales_devis || "",
          conditions_generales_factures:
            parametres.conditions_generales_factures || "",
          delai_paiement_defaut:
            Number(parametres.delai_paiement_defaut) || 30,
          tva_defaut: Number(parametres.tva_defaut) || 20,
          prefixe_devis: parametres.prefixe_devis || "DEV",
          prefixe_facture: parametres.prefixe_facture || "FAC",
          prefixe_avoir: parametres.prefixe_avoir || "AV",
        });
      }
    } catch (error) {
      console.error(error);
      setErreur(
        error instanceof Error
          ? error.message
          : "Erreur lors du chargement des paramètres."
      );
    } finally {
      setChargement(false);
    }
  }

  function modifierChamp(
    champ: keyof EntrepriseParametres,
    valeur: string | number
  ) {
    setForm((ancien) => ({
      ...ancien,
      [champ]: valeur,
    }));
  }

  async function uploaderLogo(event: ChangeEvent<HTMLInputElement>) {
  try {
    setErreur(null);
    setMessage(null);

    const fichier = event.target.files?.[0];

    if (!fichier) {
      return;
    }

    if (!entrepriseId) {
      throw new Error("Entreprise introuvable.");
    }

    const typesAutorises = ["image/png", "image/jpeg", "image/webp"];

    if (!typesAutorises.includes(fichier.type)) {
      throw new Error("Format non autorisé. Utilise un logo en PNG, JPG ou WEBP.");
    }

    const tailleMax = 2 * 1024 * 1024;

    if (fichier.size > tailleMax) {
      throw new Error("Le logo est trop lourd. Taille maximale : 2 Mo.");
    }

    setUploadLogoEnCours(true);

    const extension =
      fichier.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
      "png";

    const cheminLogo = `${entrepriseId}/logo-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("logos-entreprises")
      .upload(cheminLogo, fichier, {
        cacheControl: "3600",
        upsert: true,
        contentType: fichier.type,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from("logos-entreprises")
      .getPublicUrl(cheminLogo);

    if (!data.publicUrl) {
      throw new Error("Impossible de récupérer l’URL publique du logo.");
    }

    modifierChamp("logo_url", data.publicUrl);

    setMessage(
      "Logo envoyé avec succès. Clique sur Enregistrer les paramètres pour le sauvegarder."
    );
  } catch (error) {
    console.error(error);
    setErreur(
      error instanceof Error
        ? error.message
        : "Erreur lors de l’envoi du logo."
    );
  } finally {
    setUploadLogoEnCours(false);
    event.target.value = "";
  }
}

  async function enregistrerParametres() {
    try {
      setEnregistrement(true);
      setErreur(null);
      setMessage(null);

      if (!entrepriseId) {
        throw new Error("Entreprise introuvable.");
      }

      const payload = {
        entreprise_id: entrepriseId,
        nom_entreprise: form.nom_entreprise.trim(),
        adresse: form.adresse.trim(),
        code_postal: form.code_postal.trim(),
        ville: form.ville.trim(),
        telephone: form.telephone.trim(),
        email: form.email.trim(),
        siret: form.siret.trim(),
        numero_tva_intracommunautaire:
          form.numero_tva_intracommunautaire.trim(),
        forme_juridique: form.forme_juridique.trim(),
        logo_url: form.logo_url.trim(),
        assurance_professionnelle: form.assurance_professionnelle.trim(),
        mentions_legales: form.mentions_legales.trim(),
        conditions_generales_devis: form.conditions_generales_devis.trim(),
        conditions_generales_factures:
          form.conditions_generales_factures.trim(),
        delai_paiement_defaut: Number(form.delai_paiement_defaut) || 30,
        tva_defaut: Number(form.tva_defaut) || 20,
        prefixe_devis: form.prefixe_devis.trim() || "DEV",
        prefixe_facture: form.prefixe_facture.trim() || "FAC",
        prefixe_avoir: form.prefixe_avoir.trim() || "AV",
      };

      const { error } = await supabase
        .from("entreprise_parametres")
        .upsert(payload, {
          onConflict: "entreprise_id",
        });

      if (error) {
        throw error;
      }

      setMessage("Paramètres enregistrés avec succès.");
    } catch (error) {
      console.error(error);
      setErreur(
        error instanceof Error
          ? error.message
          : "Erreur lors de l’enregistrement des paramètres."
      );
    } finally {
      setEnregistrement(false);
    }
  }

  if (chargement) {
    return (
      <main className="p-6">
        <p className="text-sm text-slate-500">Chargement des paramètres...</p>
      </main>
    );
  }

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Paramètres entreprise
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Ces informations seront utilisées plus tard sur les devis, factures,
          avoirs et PDF.
        </p>
      </div>

      {erreur && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erreur}
        </div>
      )}

      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Informations générales
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <ChampTexte
            label="Nom de l’entreprise"
            value={form.nom_entreprise}
            onChange={(valeur) => modifierChamp("nom_entreprise", valeur)}
          />

          <ChampTexte
            label="Forme juridique"
            placeholder="Ex : SAS, SARL, EI..."
            value={form.forme_juridique}
            onChange={(valeur) => modifierChamp("forme_juridique", valeur)}
          />

          <ChampTexte
            label="Téléphone"
            value={form.telephone}
            onChange={(valeur) => modifierChamp("telephone", valeur)}
          />

          <ChampTexte
            label="Email"
            type="email"
            value={form.email}
            onChange={(valeur) => modifierChamp("email", valeur)}
          />

          <ChampTexte
            label="SIRET"
            value={form.siret}
            onChange={(valeur) => modifierChamp("siret", valeur)}
          />

          <ChampTexte
            label="TVA intracommunautaire"
            value={form.numero_tva_intracommunautaire}
            onChange={(valeur) =>
              modifierChamp("numero_tva_intracommunautaire", valeur)
            }
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Adresse</h2>

        <div className="mt-4 grid gap-4">
          <ChampTexte
            label="Adresse"
            value={form.adresse}
            onChange={(valeur) => modifierChamp("adresse", valeur)}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <ChampTexte
              label="Code postal"
              value={form.code_postal}
              onChange={(valeur) => modifierChamp("code_postal", valeur)}
            />

            <ChampTexte
              label="Ville"
              value={form.ville}
              onChange={(valeur) => modifierChamp("ville", valeur)}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Réglages documents
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <ChampTexte
            label="TVA par défaut (%)"
            type="number"
            value={String(form.tva_defaut)}
            onChange={(valeur) =>
              modifierChamp("tva_defaut", Number(valeur))
            }
          />

          <ChampTexte
            label="Délai de paiement par défaut"
            type="number"
            value={String(form.delai_paiement_defaut)}
            onChange={(valeur) =>
              modifierChamp("delai_paiement_defaut", Number(valeur))
            }
          />

          <ChampTexte
            label="Préfixe devis"
            value={form.prefixe_devis}
            onChange={(valeur) => modifierChamp("prefixe_devis", valeur)}
          />

          <ChampTexte
            label="Préfixe facture"
            value={form.prefixe_facture}
            onChange={(valeur) => modifierChamp("prefixe_facture", valeur)}
          />

          <ChampTexte
            label="Préfixe avoir"
            value={form.prefixe_avoir}
            onChange={(valeur) => modifierChamp("prefixe_avoir", valeur)}
          />

         <div className="md:col-span-2">
  <label className="block">
    <span className="text-sm font-medium text-slate-700">
      Logo entreprise
    </span>

    <input
      type="file"
      accept="image/png,image/jpeg,image/webp"
      onChange={uploaderLogo}
      disabled={uploadLogoEnCours}
      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-emerald-700 hover:file:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
    />

    <p className="mt-1 text-xs text-slate-500">
      Formats acceptés : PNG, JPG ou WEBP. Taille maximum : 2 Mo.
    </p>
  </label>

  {uploadLogoEnCours ? (
    <p className="mt-2 text-sm text-slate-500">Envoi du logo...</p>
  ) : null}

  {form.logo_url ? (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="mb-2 text-xs font-medium text-slate-500">
        Logo actuellement enregistré :
      </p>

      <img
        src={form.logo_url}
        alt="Logo entreprise"
        className="max-h-24 max-w-xs rounded-lg bg-white object-contain p-2"
      />
    </div>
  ) : null}
   </div>
 </div>
      </section>
    

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Mentions et conditions
        </h2>

        <div className="mt-4 grid gap-4">
          <ChampTextarea
            label="Assurance professionnelle"
            placeholder="Ex : Assurance RC Pro, compagnie, numéro de contrat..."
            value={form.assurance_professionnelle}
            onChange={(valeur) =>
              modifierChamp("assurance_professionnelle", valeur)
            }
          />

          <ChampTextarea
            label="Mentions légales"
            value={form.mentions_legales}
            onChange={(valeur) => modifierChamp("mentions_legales", valeur)}
          />

          <ChampTextarea
            label="Conditions générales devis"
            value={form.conditions_generales_devis}
            onChange={(valeur) =>
              modifierChamp("conditions_generales_devis", valeur)
            }
          />

          <ChampTextarea
            label="Conditions générales factures"
            value={form.conditions_generales_factures}
            onChange={(valeur) =>
              modifierChamp("conditions_generales_factures", valeur)
            }
          />
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={enregistrerParametres}
          disabled={enregistrement}
          className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {enregistrement ? "Enregistrement..." : "Enregistrer les paramètres"}
        </button>
      </div>
    </main>
  );
}

function ChampTexte({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (valeur: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      />
    </label>
  );
}

function ChampTextarea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (valeur: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      />
    </label>
  );
}