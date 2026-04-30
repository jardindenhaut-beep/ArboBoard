"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { chargerContexteEntreprise } from "@/lib/entreprise";

type EntrepriseParametres = {
  id: string;
  entreprise_id: string | null;
  nom: string;
  siret: string;
  email: string;
  telephone: string;
  adresse: string;
  tva: number;
  logo_url: string;
  mentions_devis: string;
  mentions_facture: string;
  conditions_paiement: string;
  rib: string;
  iban: string;
  bic: string;
};

type FormParametres = {
  nom: string;
  siret: string;
  email: string;
  telephone: string;
  adresse: string;
  tva: string;
  logo_url: string;
  mentions_devis: string;
  mentions_facture: string;
  conditions_paiement: string;
  rib: string;
  iban: string;
  bic: string;
};

const formulaireVide: FormParametres = {
  nom: "",
  siret: "",
  email: "",
  telephone: "",
  adresse: "",
  tva: "20",
  logo_url: "",
  mentions_devis:
    "Devis valable selon la durée indiquée. Toute modification demandée après acceptation pourra faire l'objet d'un devis complémentaire.",
  mentions_facture:
    "Facture payable à réception sauf conditions particulières indiquées sur le document.",
  conditions_paiement:
    "Paiement par virement bancaire, chèque ou espèces selon accord préalable.",
  rib: "",
  iban: "",
  bic: "",
};

export default function ParametresChefPage() {
  const router = useRouter();

  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);
  const [nomEntrepriseSaas, setNomEntrepriseSaas] = useState("");
  const [parametresId, setParametresId] = useState<string | null>(null);

  const [form, setForm] = useState<FormParametres>(formulaireVide);

  const [chargement, setChargement] = useState(true);
  const [sauvegarde, setSauvegarde] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    chargerContexteEtParametres();
  }, []);

  async function chargerContexteEtParametres() {
    setChargement(true);
    setMessage("");

    const { contexte, erreur } = await chargerContexteEntreprise();

    if (erreur || !contexte) {
      setMessage(erreur || "Impossible de charger le contexte entreprise.");
      setChargement(false);

      setTimeout(() => {
        router.push("/connexion");
      }, 1200);

      return;
    }

    if (contexte.profil.role !== "chef") {
      setMessage("Ce compte n'est pas un compte chef.");
      setChargement(false);

      setTimeout(() => {
        router.push("/connexion");
      }, 1200);

      return;
    }

    setEntrepriseId(contexte.entreprise.id);
    setNomEntrepriseSaas(contexte.entreprise.nom_entreprise);

    await chargerParametres(contexte.entreprise.id, contexte.entreprise.nom_entreprise);

    setChargement(false);
  }

  async function chargerParametres(idEntreprise: string, nomEntreprise: string) {
    const { data, error } = await supabase
      .from("entreprise_parametres")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .limit(1)
      .maybeSingle();

    if (error) {
      setMessage(error.message || "Erreur lors du chargement des paramètres.");
      return;
    }

    if (!data) {
      setForm((ancien) => ({
        ...ancien,
        nom: nomEntreprise || ancien.nom,
      }));
      return;
    }

    const parametres = data as EntrepriseParametres;

    setParametresId(parametres.id);

    setForm({
      nom: parametres.nom || nomEntreprise || "",
      siret: parametres.siret || "",
      email: parametres.email || "",
      telephone: parametres.telephone || "",
      adresse: parametres.adresse || "",
      tva: String(parametres.tva ?? 20),
      logo_url: parametres.logo_url || "",
      mentions_devis: parametres.mentions_devis || formulaireVide.mentions_devis,
      mentions_facture:
        parametres.mentions_facture || formulaireVide.mentions_facture,
      conditions_paiement:
        parametres.conditions_paiement || formulaireVide.conditions_paiement,
      rib: parametres.rib || "",
      iban: parametres.iban || "",
      bic: parametres.bic || "",
    });
  }

  function modifierChamp(champ: keyof FormParametres, valeur: string) {
    setForm((ancien) => ({
      ...ancien,
      [champ]: valeur,
    }));
  }

  async function enregistrerParametres() {
    setSauvegarde(true);
    setMessage("");

    if (!entrepriseId) {
      setMessage("Aucune entreprise connectée. Reconnecte-toi.");
      setSauvegarde(false);
      return;
    }

    if (!form.nom.trim()) {
      setMessage("Merci de renseigner le nom de l'entreprise.");
      setSauvegarde(false);
      return;
    }

    const donnees = {
      entreprise_id: entrepriseId,
      nom: form.nom,
      siret: form.siret,
      email: form.email,
      telephone: form.telephone,
      adresse: form.adresse,
      tva: Number(form.tva) || 0,
      logo_url: form.logo_url,
      mentions_devis: form.mentions_devis,
      mentions_facture: form.mentions_facture,
      conditions_paiement: form.conditions_paiement,
      rib: form.rib,
      iban: form.iban,
      bic: form.bic,
      updated_at: new Date().toISOString(),
    };

    if (parametresId) {
      const { error } = await supabase
        .from("entreprise_parametres")
        .update(donnees)
        .eq("id", parametresId)
        .eq("entreprise_id", entrepriseId);

      if (error) {
        setMessage(error.message || "Erreur lors de la modification des paramètres.");
        setSauvegarde(false);
        return;
      }

      setMessage("Paramètres entreprise modifiés avec succès.");
      setSauvegarde(false);
      return;
    }

    const { data, error } = await supabase
      .from("entreprise_parametres")
      .insert(donnees)
      .select("id")
      .single();

    if (error || !data) {
      setMessage(error?.message || "Erreur lors de la création des paramètres.");
      setSauvegarde(false);
      return;
    }

    setParametresId(data.id);
    setMessage("Paramètres entreprise enregistrés avec succès.");
    setSauvegarde(false);
  }

  if (chargement) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <p className="text-slate-700">Chargement des paramètres...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Paramètres entreprise
          </h1>

          <p className="mt-2 text-slate-600">
            Ces informations seront utilisées sur les devis, factures et documents PDF.
          </p>

          {nomEntrepriseSaas && (
            <p className="mt-2 text-sm font-medium text-slate-500">
              Entreprise SaaS connectée : {nomEntrepriseSaas}
            </p>
          )}
        </div>

        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-slate-900">
            Informations générales
          </h2>

          <div className="grid gap-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Nom de l&apos;entreprise
                </label>

                <input
                  value={form.nom}
                  onChange={(e) => modifierChamp("nom", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="Exemple : Jardin d'en haut"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  SIRET
                </label>

                <input
                  value={form.siret}
                  onChange={(e) => modifierChamp("siret", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="Exemple : 97924720200026"
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Email
                </label>

                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => modifierChamp("email", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="contact@entreprise.fr"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Téléphone
                </label>

                <input
                  value={form.telephone}
                  onChange={(e) => modifierChamp("telephone", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="07 00 00 00 00"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  TVA par défaut %
                </label>

                <input
                  type="number"
                  value={form.tva}
                  onChange={(e) => modifierChamp("tva", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="20"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Adresse complète
              </label>

              <textarea
                value={form.adresse}
                onChange={(e) => modifierChamp("adresse", e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                placeholder="Adresse complète affichée sur les devis et factures"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                URL du logo
              </label>

              <input
                value={form.logo_url}
                onChange={(e) => modifierChamp("logo_url", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                placeholder="Optionnel : lien vers le logo"
              />

              <p className="mt-2 text-sm text-slate-500">
                On utilisera plus tard un vrai upload de logo. Pour l&apos;instant,
                tu peux laisser vide.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-slate-900">
            Coordonnées bancaires
          </h2>

          <div className="grid gap-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                RIB / Informations de paiement
              </label>

              <textarea
                value={form.rib}
                onChange={(e) => modifierChamp("rib", e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                placeholder="Exemple : Paiement par virement à l'ordre de..."
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  IBAN
                </label>

                <input
                  value={form.iban}
                  onChange={(e) => modifierChamp("iban", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="FR76..."
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  BIC
                </label>

                <input
                  value={form.bic}
                  onChange={(e) => modifierChamp("bic", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="BIC / SWIFT"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-slate-900">
            Mentions documents
          </h2>

          <div className="grid gap-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Mentions devis
              </label>

              <textarea
                value={form.mentions_devis}
                onChange={(e) =>
                  modifierChamp("mentions_devis", e.target.value)
                }
                rows={4}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                placeholder="Mentions affichées sur les devis"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Mentions facture
              </label>

              <textarea
                value={form.mentions_facture}
                onChange={(e) =>
                  modifierChamp("mentions_facture", e.target.value)
                }
                rows={4}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                placeholder="Mentions affichées sur les factures"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Conditions de paiement
              </label>

              <textarea
                value={form.conditions_paiement}
                onChange={(e) =>
                  modifierChamp("conditions_paiement", e.target.value)
                }
                rows={4}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                placeholder="Conditions de règlement, échéance, pénalités, modalités..."
              />
            </div>
          </div>
        </div>

        <div className="sticky bottom-4 rounded-2xl bg-white p-4 shadow-lg">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold text-slate-900">
                Enregistrer les paramètres
              </p>

              <p className="text-sm text-slate-500">
                Ces données seront reliées uniquement à cette entreprise.
              </p>
            </div>

            <button
              onClick={enregistrerParametres}
              disabled={sauvegarde}
              className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {sauvegarde ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>

          {message && (
            <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
              {message}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}