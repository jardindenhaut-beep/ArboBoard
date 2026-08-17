"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { chargerContexteEntreprise } from "@/lib/entreprise";
import { journaliserActivite } from "@/lib/journalActivite";
import { supabase } from "@/lib/supabaseClient";

type Categorie = {
  id: string;
  entreprise_id: string;
  nom: string;
  prefixe_code: string;
  description: string | null;
  actif: boolean;
  ordre: number;
};

type Prestation = {
  id: string;
  entreprise_id: string;
  categorie_id: string;
  code: string;
  designation: string;
  description: string | null;
  unite_reference: string;
  prix_vente_ht: number;
  taux_tva: number;
  objectif_taux_marque_pct: number;
  prix_vente_ttc: number;
  cout_main_oeuvre_ht: number;
  cout_materiel_ht: number;
  cout_fournitures_ht: number;
  cout_deplacement_ht: number;
  cout_evacuation_ht: number;
  cout_sous_traitance_ht: number;
  autres_couts_ht: number;
  cout_reel_ht: number;
  marge_brute_ht: number;
  taux_marge_pct: number | null;
  taux_marque_pct: number | null;
  prix_conseille_ht: number;
  ecart_prix_conseille_ht: number;
  actif: boolean;
  ordre: number;
  categorie?: Categorie | null;
};

type FormPrestation = {
  categorie_id: string;
  designation: string;
  description: string;
  unite_reference: string;
  prix_vente_ht: number;
  taux_tva: number;
  objectif_taux_marque_pct: number;
  cout_main_oeuvre_ht: number;
  cout_materiel_ht: number;
  cout_fournitures_ht: number;
  cout_deplacement_ht: number;
  cout_evacuation_ht: number;
  cout_sous_traitance_ht: number;
  autres_couts_ht: number;
};

type FormCategorie = {
  nom: string;
  prefixe_code: string;
  description: string;
};


const FORM_PRESTATION_VIDE: FormPrestation = {
  categorie_id: "",
  designation: "",
  description: "",
  unite_reference: "heure",
  prix_vente_ht: 0,
  taux_tva: 20,
  objectif_taux_marque_pct: 35,
  cout_main_oeuvre_ht: 0,
  cout_materiel_ht: 0,
  cout_fournitures_ht: 0,
  cout_deplacement_ht: 0,
  cout_evacuation_ht: 0,
  cout_sous_traitance_ht: 0,
  autres_couts_ht: 0,
};

const FORM_CATEGORIE_VIDE: FormCategorie = {
  nom: "",
  prefixe_code: "",
  description: "",
};

function nombre(valeur: unknown) {
  const resultat = Number(valeur);
  return Number.isFinite(resultat) ? resultat : 0;
}

function formatEuro(valeur: number | null | undefined) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(nombre(valeur));
}

function formatPourcentage(valeur: number | null | undefined) {
  if (valeur === null || valeur === undefined || !Number.isFinite(Number(valeur))) {
    return "—";
  }

  return `${Number(valeur).toFixed(2).replace(".", ",")} %`;
}

function normaliserRecherche(valeur: string) {
  return valeur
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function couleurRentabilite(tauxMarque: number | null | undefined) {
  const taux = Number(tauxMarque);

  if (!Number.isFinite(taux)) {
    return {
      fond: "bg-slate-50",
      texte: "text-slate-700",
      bordure: "border-slate-200",
      libelle: "À calculer",
    };
  }

  if (taux >= 35) {
    return {
      fond: "bg-emerald-50",
      texte: "text-emerald-700",
      bordure: "border-emerald-200",
      libelle: "Bonne",
    };
  }

  if (taux >= 20) {
    return {
      fond: "bg-amber-50",
      texte: "text-amber-700",
      bordure: "border-amber-200",
      libelle: "À surveiller",
    };
  }

  return {
    fond: "bg-red-50",
    texte: "text-red-700",
    bordure: "border-red-200",
    libelle: "Faible",
  };
}

export default function PrestationsTarifsPage() {
  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [prestations, setPrestations] = useState<Prestation[]>([]);
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [messageErreur, setMessageErreur] = useState("");
  const [messageSucces, setMessageSucces] = useState("");

  const [recherche, setRecherche] = useState("");
  const [filtreCategorie, setFiltreCategorie] = useState("toutes");
  const [filtreStatut, setFiltreStatut] = useState<"actives" | "archivees" | "toutes">("actives");

  const [modalPrestation, setModalPrestation] = useState(false);
  const [prestationEdition, setPrestationEdition] = useState<Prestation | null>(null);
  const [formPrestation, setFormPrestation] = useState<FormPrestation>(FORM_PRESTATION_VIDE);

  const [modalCategories, setModalCategories] = useState(false);
  const [formCategorie, setFormCategorie] = useState<FormCategorie>(FORM_CATEGORIE_VIDE);
  const [categorieEdition, setCategorieEdition] = useState<Categorie | null>(null);

  useEffect(() => {
    void initialiser();
  }, []);

  async function initialiser() {
    try {
      setChargement(true);
      setMessageErreur("");

      const resultat = await chargerContexteEntreprise();

      if (
        resultat.erreur ||
        !resultat.contexte?.entreprise?.id ||
        !resultat.contexte?.profil
      ) {
        throw new Error(resultat.erreur || "Impossible de charger l’entreprise.");
      }

      const id = resultat.contexte.entreprise.id;
      setEntrepriseId(id);
      await chargerDonnees(id);
    } catch (error) {
      console.error("Erreur initialisation prestations & tarifs :", error);
      setMessageErreur(
        error instanceof Error
          ? error.message
          : "Impossible de charger les prestations et tarifs."
      );
    } finally {
      setChargement(false);
    }
  }

  async function chargerDonnees(id = entrepriseId) {
    if (!id) return;

    const [categoriesResultat, prestationsResultat] = await Promise.all([
      supabase
        .from("prestations_categories")
        .select("id, entreprise_id, nom, prefixe_code, description, actif, ordre")
        .eq("entreprise_id", id)
        .order("ordre", { ascending: true })
        .order("nom", { ascending: true }),

      supabase
        .from("prestations_tarifs")
        .select(
          "id, entreprise_id, categorie_id, code, designation, description, unite_reference, prix_vente_ht, taux_tva, prix_vente_ttc, cout_main_oeuvre_ht, cout_materiel_ht, cout_fournitures_ht, cout_deplacement_ht, cout_evacuation_ht, cout_sous_traitance_ht, autres_couts_ht, cout_reel_ht, marge_brute_ht, taux_marge_pct, taux_marque_pct, objectif_taux_marque_pct, prix_conseille_ht, ecart_prix_conseille_ht, actif, ordre"
        )
        .eq("entreprise_id", id)
        .order("ordre", { ascending: true })
        .order("code", { ascending: true }),
    ]);

    if (categoriesResultat.error) throw categoriesResultat.error;
    if (prestationsResultat.error) throw prestationsResultat.error;

    const categoriesChargees = (categoriesResultat.data || []) as Categorie[];
    const mapCategories = new Map(
      categoriesChargees.map((categorie) => [categorie.id, categorie])
    );

    setCategories(categoriesChargees);
    setPrestations(
      ((prestationsResultat.data || []) as Prestation[]).map((prestation) => ({
        ...prestation,
        categorie: mapCategories.get(prestation.categorie_id) || null,
      }))
    );
  }

  const prestationsFiltrees = useMemo(() => {
    const rechercheNormalisee = normaliserRecherche(recherche);

    return prestations.filter((prestation) => {
      if (filtreStatut === "actives" && !prestation.actif) return false;
      if (filtreStatut === "archivees" && prestation.actif) return false;

      if (
        filtreCategorie !== "toutes" &&
        prestation.categorie_id !== filtreCategorie
      ) {
        return false;
      }

      if (rechercheNormalisee) {
        const contenu = normaliserRecherche(
          [
            prestation.code,
            prestation.designation,
            prestation.description || "",
            prestation.categorie?.nom || "",
          ].join(" ")
        );

        if (!contenu.includes(rechercheNormalisee)) return false;
      }

      return true;
    });
  }, [prestations, recherche, filtreCategorie, filtreStatut]);

  const statistiques = useMemo(() => {
    const actives = prestations.filter((prestation) => prestation.actif);

    const moyenne = (valeurs: number[]) => {
      if (valeurs.length === 0) return 0;
      return valeurs.reduce((total, valeur) => total + nombre(valeur), 0) / valeurs.length;
    };

    return {
      total: actives.length,
      prixMoyenHt: moyenne(actives.map((item) => item.prix_vente_ht)),
      coutMoyenHt: moyenne(actives.map((item) => item.cout_reel_ht)),
      margeMoyenne: moyenne(
        actives
          .map((item) => item.taux_marque_pct)
          .filter((valeur): valeur is number => valeur !== null)
      ),
    };
  }, [prestations]);

  const calculFormulaire = useMemo(() => {
    const coutReel =
      nombre(formPrestation.cout_main_oeuvre_ht) +
      nombre(formPrestation.cout_materiel_ht) +
      nombre(formPrestation.cout_fournitures_ht) +
      nombre(formPrestation.cout_deplacement_ht) +
      nombre(formPrestation.cout_evacuation_ht) +
      nombre(formPrestation.cout_sous_traitance_ht) +
      nombre(formPrestation.autres_couts_ht);

    const prixHt = nombre(formPrestation.prix_vente_ht);
    const prixTtc = prixHt * (1 + nombre(formPrestation.taux_tva) / 100);
    const marge = prixHt - coutReel;
    const objectifMarque = Math.min(99.99, Math.max(0, nombre(formPrestation.objectif_taux_marque_pct)));
    const prixConseille =
      coutReel > 0 && objectifMarque < 100
        ? coutReel / (1 - objectifMarque / 100)
        : 0;
    const ecartPrixConseille = prixHt - prixConseille;

    return {
      coutReel,
      prixTtc,
      marge,
      prixConseille,
      ecartPrixConseille,
      tauxMarge: coutReel > 0 ? (marge / coutReel) * 100 : null,
      tauxMarque: prixHt > 0 ? (marge / prixHt) * 100 : null,
    };
  }, [formPrestation]);

  function ouvrirCreation() {
    const premiereCategorie =
      categories.find((categorie) => categorie.actif) || categories[0];

    setPrestationEdition(null);
    setFormPrestation({
      ...FORM_PRESTATION_VIDE,
      categorie_id: premiereCategorie?.id || "",
    });
    setMessageErreur("");
    setMessageSucces("");
    setModalPrestation(true);
  }

  function ouvrirEdition(prestation: Prestation) {
    setPrestationEdition(prestation);
    setFormPrestation({
      categorie_id: prestation.categorie_id,
      designation: prestation.designation,
      description: prestation.description || "",
      unite_reference: "heure",
      prix_vente_ht: nombre(prestation.prix_vente_ht),
      taux_tva: nombre(prestation.taux_tva),
      objectif_taux_marque_pct: nombre(prestation.objectif_taux_marque_pct),
      cout_main_oeuvre_ht: nombre(prestation.cout_main_oeuvre_ht),
      cout_materiel_ht: nombre(prestation.cout_materiel_ht),
      cout_fournitures_ht: nombre(prestation.cout_fournitures_ht),
      cout_deplacement_ht: nombre(prestation.cout_deplacement_ht),
      cout_evacuation_ht: nombre(prestation.cout_evacuation_ht),
      cout_sous_traitance_ht: nombre(prestation.cout_sous_traitance_ht),
      autres_couts_ht: nombre(prestation.autres_couts_ht),
    });
    setMessageErreur("");
    setMessageSucces("");
    setModalPrestation(true);
  }

  async function enregistrerPrestation() {
    if (!entrepriseId) return;

    if (!formPrestation.categorie_id) {
      setMessageErreur("Sélectionnez une catégorie.");
      return;
    }

    if (!formPrestation.designation.trim()) {
      setMessageErreur("La désignation est obligatoire.");
      return;
    }

    if (
      formPrestation.objectif_taux_marque_pct < 0 ||
      formPrestation.objectif_taux_marque_pct >= 100
    ) {
      setMessageErreur("L’objectif de marge doit être compris entre 0 et 99,99 %.");
      return;
    }

    try {
      setEnregistrement(true);
      setMessageErreur("");
      setMessageSucces("");

      const payload = {
        entreprise_id: entrepriseId,
        categorie_id: formPrestation.categorie_id,
        designation: formPrestation.designation.trim(),
        description: formPrestation.description.trim() || null,
        unite_reference: "heure",
        prix_vente_ht: nombre(formPrestation.prix_vente_ht),
        taux_tva: nombre(formPrestation.taux_tva),
        objectif_taux_marque_pct: Math.min(99.99, Math.max(0, nombre(formPrestation.objectif_taux_marque_pct))),
        cout_main_oeuvre_ht: nombre(formPrestation.cout_main_oeuvre_ht),
        cout_materiel_ht: nombre(formPrestation.cout_materiel_ht),
        cout_fournitures_ht: nombre(formPrestation.cout_fournitures_ht),
        cout_deplacement_ht: nombre(formPrestation.cout_deplacement_ht),
        cout_evacuation_ht: nombre(formPrestation.cout_evacuation_ht),
        cout_sous_traitance_ht: nombre(formPrestation.cout_sous_traitance_ht),
        autres_couts_ht: nombre(formPrestation.autres_couts_ht),
      };

      if (prestationEdition) {
        const { error } = await supabase
          .from("prestations_tarifs")
          .update(payload)
          .eq("id", prestationEdition.id)
          .eq("entreprise_id", entrepriseId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("prestations_tarifs").insert(payload);
        if (error) throw error;
      }

      await journaliserActivite({
        action: prestationEdition
          ? "prestation_tarif_modifiee"
          : "prestation_tarif_creee",
        categorie: "parametres",
        resultat: "succes",
        ressource_type: "prestation_tarif",
        ressource_id: prestationEdition?.id || null,
        description: prestationEdition
          ? "Modification d’une prestation de la base tarifaire."
          : "Création d’une prestation dans la base tarifaire.",
        details: {
          designation: payload.designation,
          categorie_id: payload.categorie_id,
          unite_reference: payload.unite_reference,
          prix_vente_ht: payload.prix_vente_ht,
        },
      });

      await chargerDonnees(entrepriseId);
      setModalPrestation(false);
      setPrestationEdition(null);
      setMessageSucces(
        prestationEdition
          ? "La prestation a été modifiée."
          : "La prestation a été créée avec son code automatique."
      );
    } catch (error) {
      console.error("Erreur enregistrement prestation :", error);
      setMessageErreur(
        error instanceof Error
          ? error.message
          : "Impossible d’enregistrer la prestation."
      );
    } finally {
      setEnregistrement(false);
    }
  }

  async function basculerArchivage(prestation: Prestation) {
    if (!entrepriseId) return;

    try {
      setMessageErreur("");
      setMessageSucces("");

      const { error } = await supabase
        .from("prestations_tarifs")
        .update({ actif: !prestation.actif })
        .eq("id", prestation.id)
        .eq("entreprise_id", entrepriseId);

      if (error) throw error;

      await chargerDonnees(entrepriseId);
      setMessageSucces(
        prestation.actif
          ? `${prestation.code} a été archivée.`
          : `${prestation.code} a été réactivée.`
      );
    } catch (error) {
      console.error("Erreur archivage prestation :", error);
      setMessageErreur(
        error instanceof Error
          ? error.message
          : "Impossible de modifier le statut de la prestation."
      );
    }
  }

  function nouvelleCategorie() {
    setCategorieEdition(null);
    setFormCategorie(FORM_CATEGORIE_VIDE);
  }

  function modifierCategorie(categorie: Categorie) {
    setCategorieEdition(categorie);
    setFormCategorie({
      nom: categorie.nom,
      prefixe_code: categorie.prefixe_code,
      description: categorie.description || "",
    });
  }

  async function enregistrerCategorie() {
    if (!entrepriseId) return;

    const nom = formCategorie.nom.trim();
    const prefixe = formCategorie.prefixe_code
      .trim()
      .toUpperCase()
      .replace(/[^A-Z]/g, "")
      .slice(0, 5);

    if (!nom) {
      setMessageErreur("Le nom de la catégorie est obligatoire.");
      return;
    }

    if (prefixe.length < 2) {
      setMessageErreur("Le préfixe doit contenir entre 2 et 5 lettres.");
      return;
    }

    try {
      setEnregistrement(true);
      setMessageErreur("");

      const payload = {
        entreprise_id: entrepriseId,
        nom,
        prefixe_code: prefixe,
        description: formCategorie.description.trim() || null,
      };

      if (categorieEdition) {
        const { error } = await supabase
          .from("prestations_categories")
          .update(payload)
          .eq("id", categorieEdition.id)
          .eq("entreprise_id", entrepriseId);

        if (error) throw error;
      } else {
        const prochainOrdre =
          Math.max(0, ...categories.map((categorie) => categorie.ordre || 0)) + 10;

        const { error } = await supabase.from("prestations_categories").insert({
          ...payload,
          ordre: prochainOrdre,
        });

        if (error) throw error;
      }

      await chargerDonnees(entrepriseId);
      nouvelleCategorie();
      setMessageSucces(
        categorieEdition
          ? "La catégorie a été modifiée."
          : "La catégorie a été créée."
      );
    } catch (error) {
      console.error("Erreur enregistrement catégorie :", error);
      setMessageErreur(
        error instanceof Error
          ? error.message
          : "Impossible d’enregistrer la catégorie."
      );
    } finally {
      setEnregistrement(false);
    }
  }

  async function basculerCategorie(categorie: Categorie) {
    if (!entrepriseId) return;

    const { error } = await supabase
      .from("prestations_categories")
      .update({ actif: !categorie.actif })
      .eq("id", categorie.id)
      .eq("entreprise_id", entrepriseId);

    if (error) {
      setMessageErreur(error.message);
      return;
    }

    await chargerDonnees(entrepriseId);
  }

  if (chargement) {
    return (
      <main className="mx-auto max-w-7xl">
        <section className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
            ⏳
          </div>
          <p className="font-semibold text-slate-950">
            Chargement des prestations & tarifs…
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6">
      <header className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 bg-emerald-600" />
        <div className="bg-gradient-to-br from-emerald-50 via-white to-white p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-2xl text-white">
                🧮
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
                  Base métier
                </p>
                <h1 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">
                  Prestations & tarifs
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  Codes prestations, tarifs de référence, coûts réels et marges.
                </p>
              </div>
            </div>

            <div className="grid w-full gap-2 sm:grid-cols-3 lg:w-auto">
              <button
                type="button"
                onClick={() => entrepriseId && void chargerDonnees(entrepriseId)}
                className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                ↻ Actualiser
              </button>
              <button
                type="button"
                onClick={() => {
                  nouvelleCategorie();
                  setModalCategories(true);
                }}
                className="min-h-12 rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                Catégories
              </button>
              <button
                type="button"
                onClick={ouvrirCreation}
                className="min-h-12 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700"
              >
                + Nouvelle prestation
              </button>
            </div>
          </div>
        </div>
      </header>

      {messageErreur && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {messageErreur}
        </div>
      )}

      {messageSucces && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {messageSucces}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CarteStatistique label="Prestations actives" valeur={String(statistiques.total)} />
        <CarteStatistique label="Prix moyen HT" valeur={formatEuro(statistiques.prixMoyenHt)} />
        <CarteStatistique label="Coût réel moyen" valeur={formatEuro(statistiques.coutMoyenHt)} />
        <CarteStatistique label="Marge moyenne" valeur={formatPourcentage(statistiques.margeMoyenne)} />
      </section>

      <section className="sticky top-3 z-20 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
          <input
            type="search"
            value={recherche}
            onChange={(event) => setRecherche(event.target.value)}
            placeholder="Rechercher un code, une désignation…"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
          />

          <select
            value={filtreCategorie}
            onChange={(event) => setFiltreCategorie(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            <option value="toutes">Toutes les catégories</option>
            {categories.map((categorie) => (
              <option key={categorie.id} value={categorie.id}>
                {categorie.prefixe_code} — {categorie.nom}
              </option>
            ))}
          </select>

          <select
            value={filtreStatut}
            onChange={(event) =>
              setFiltreStatut(event.target.value as "actives" | "archivees" | "toutes")
            }
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            <option value="actives">Actives</option>
            <option value="archivees">Archivées</option>
            <option value="toutes">Toutes</option>
          </select>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>{prestationsFiltrees.length} prestation(s)</span>
          <Link href="/chef/parametres" className="font-semibold text-emerald-700">
            ← Retour aux paramètres
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        {prestationsFiltrees.map((prestation) => {
          const rentabilite = couleurRentabilite(prestation.taux_marque_pct);

          return (
            <article
              key={prestation.id}
              className={`rounded-3xl border bg-white p-5 shadow-sm ${
                prestation.actif ? "border-slate-200" : "border-slate-200 opacity-70"
              }`}
            >
              <div className="flex flex-col gap-5 xl:flex-row xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                      {prestation.code}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                      {prestation.categorie?.nom || "Catégorie"}
                    </span>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${rentabilite.fond} ${rentabilite.texte} ${rentabilite.bordure}`}
                    >
                      Marge {rentabilite.libelle}
                    </span>
                  </div>

                  <h2 className="mt-3 text-lg font-black text-slate-950">
                    {prestation.designation}
                  </h2>

                  {prestation.description && (
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {prestation.description}
                    </p>
                  )}

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                    <MiniValeur label="Tarif HT / h" valeur={formatEuro(prestation.prix_vente_ht)} />
                    <MiniValeur label="Tarif TTC" valeur={formatEuro(prestation.prix_vente_ttc)} />
                    <MiniValeur label="Coût réel / h" valeur={formatEuro(prestation.cout_reel_ht)} />
                    <MiniValeur label="Prix conseillé HT" valeur={formatEuro(prestation.prix_conseille_ht)} />
                    <MiniValeur label="Marge brute" valeur={formatEuro(prestation.marge_brute_ht)} />
                    <MiniValeur label="Taux de marque" valeur={formatPourcentage(prestation.taux_marque_pct)} />
                  </div>

                  <p className="mt-3 text-xs font-medium text-slate-400">
                    Référence horaire · Objectif de marque {formatPourcentage(prestation.objectif_taux_marque_pct)} · Écart au prix conseillé {prestation.ecart_prix_conseille_ht >= 0 ? "+" : ""}{formatEuro(prestation.ecart_prix_conseille_ht)}
                  </p>
                </div>

                <div className="grid w-full gap-2 sm:grid-cols-2 xl:w-52 xl:grid-cols-1">
                  <button
                    type="button"
                    onClick={() => ouvrirEdition(prestation)}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => void basculerArchivage(prestation)}
                    className="rounded-xl border border-amber-200 px-4 py-2.5 text-sm font-semibold text-amber-700"
                  >
                    {prestation.actif ? "Archiver" : "Réactiver"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {prestationsFiltrees.length === 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="font-bold text-slate-950">Aucune prestation trouvée.</p>
        </section>
      )}

      {modalPrestation && (
        <div className="fixed inset-0 z-[100] bg-slate-950/55 p-3 sm:p-6">
          <div className="mx-auto flex h-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs font-bold uppercase text-emerald-600">
                  {prestationEdition ? prestationEdition.code : "Code automatique"}
                </p>
                <h2 className="text-xl font-black text-slate-950">
                  {prestationEdition ? "Modifier la prestation" : "Créer une prestation"}
                </h2>
              </div>
              <button type="button" onClick={() => setModalPrestation(false)} className="text-2xl">
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
                <div className="space-y-6">
                  <section className="rounded-3xl border border-slate-200 p-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label>
                        <span className="text-sm font-medium text-slate-700">Catégorie</span>
                        <select
                          value={formPrestation.categorie_id}
                          onChange={(event) =>
                            setFormPrestation((ancien) => ({
                              ...ancien,
                              categorie_id: event.target.value,
                            }))
                          }
                          className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5"
                        >
                          <option value="">Choisir…</option>
                          {categories.filter((c) => c.actif).map((categorie) => (
                            <option key={categorie.id} value={categorie.id}>
                              {categorie.prefixe_code} — {categorie.nom}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div>
                        <span className="text-sm font-medium text-slate-700">Tarif de référence</span>
                        <div className="mt-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm font-bold text-emerald-800">
                          €/heure
                        </div>
                        <p className="mt-1.5 text-xs leading-5 text-slate-500">
                          L’unité de la base tarifaire reste horaire. Le forfait, m², ml, passage, etc. sera choisi dans le devis ou la facture.
                        </p>
                      </div>
                    </div>

                    <label className="mt-4 block">
                      <span className="text-sm font-medium text-slate-700">Désignation</span>
                      <input
                        value={formPrestation.designation}
                        onChange={(event) =>
                          setFormPrestation((ancien) => ({
                            ...ancien,
                            designation: event.target.value,
                          }))
                        }
                        className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5"
                      />
                    </label>

                    <label className="mt-4 block">
                      <span className="text-sm font-medium text-slate-700">Description</span>
                      <textarea
                        rows={4}
                        value={formPrestation.description}
                        onChange={(event) =>
                          setFormPrestation((ancien) => ({
                            ...ancien,
                            description: event.target.value,
                          }))
                        }
                        className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5"
                      />
                    </label>
                  </section>

                  <section className="rounded-3xl border border-slate-200 p-5">
                    <h3 className="font-black text-slate-950">Tarif de référence</h3>
                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                      <ChampMontant
                        label="Prix de vente HT / heure"
                        valeur={formPrestation.prix_vente_ht}
                        onChange={(valeur) =>
                          setFormPrestation((ancien) => ({ ...ancien, prix_vente_ht: valeur }))
                        }
                      />
                      <ChampNombre
                        label="TVA"
                        valeur={formPrestation.taux_tva}
                        onChange={(valeur) =>
                          setFormPrestation((ancien) => ({ ...ancien, taux_tva: valeur }))
                        }
                      />
                      <ChampNombre
                        label="Objectif de marge"
                        valeur={formPrestation.objectif_taux_marque_pct}
                        onChange={(valeur) =>
                          setFormPrestation((ancien) => ({ ...ancien, objectif_taux_marque_pct: valeur }))
                        }
                      />
                    </div>
                  </section>

                  <section className="rounded-3xl border border-slate-200 p-5">
                    <h3 className="font-black text-slate-950">Composition du coût réel HT</h3>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      {[
                        ["Main-d’œuvre", "cout_main_oeuvre_ht"],
                        ["Matériel", "cout_materiel_ht"],
                        ["Fournitures", "cout_fournitures_ht"],
                        ["Déplacement", "cout_deplacement_ht"],
                        ["Évacuation", "cout_evacuation_ht"],
                        ["Sous-traitance", "cout_sous_traitance_ht"],
                        ["Autres coûts", "autres_couts_ht"],
                      ].map(([label, cle]) => (
                        <ChampMontant
                          key={cle}
                          label={label}
                          valeur={nombre(formPrestation[cle as keyof FormPrestation])}
                          onChange={(valeur) =>
                            setFormPrestation((ancien) => ({
                              ...ancien,
                              [cle]: valeur,
                            }))
                          }
                        />
                      ))}
                    </div>
                  </section>
                </div>

                <aside className="lg:sticky lg:top-0 lg:self-start">
                  <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
                    <p className="text-xs font-bold uppercase text-emerald-600">Calcul instantané</p>
                    <div className="mt-4 space-y-3">
                      <ResumeCalcul label="Prix HT / heure" valeur={formatEuro(formPrestation.prix_vente_ht)} />
                      <ResumeCalcul label="Prix TTC / heure" valeur={formatEuro(calculFormulaire.prixTtc)} />
                      <ResumeCalcul label="Besoin réel HT / heure" valeur={formatEuro(calculFormulaire.coutReel)} />
                      <ResumeCalcul label="Objectif de marque" valeur={formatPourcentage(formPrestation.objectif_taux_marque_pct)} />
                      <ResumeCalcul label="Prix HT conseillé" valeur={formatEuro(calculFormulaire.prixConseille)} />
                      <ResumeCalcul
                        label="Écart au conseillé"
                        valeur={`${calculFormulaire.ecartPrixConseille >= 0 ? "+" : ""}${formatEuro(calculFormulaire.ecartPrixConseille)}`}
                      />
                      <ResumeCalcul label="Marge brute HT" valeur={formatEuro(calculFormulaire.marge)} />
                      <ResumeCalcul label="Taux de marge" valeur={formatPourcentage(calculFormulaire.tauxMarge)} />
                      <ResumeCalcul label="Taux de marque" valeur={formatPourcentage(calculFormulaire.tauxMarque)} />
                    </div>
                  </section>
                </aside>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 p-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setModalPrestation(false)}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void enregistrerPrestation()}
                disabled={enregistrement}
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {enregistrement ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalCategories && (
        <div className="fixed inset-0 z-[110] bg-slate-950/55 p-3 sm:p-6">
          <div className="mx-auto flex h-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-xl font-black text-slate-950">Catégories de prestations</h2>
              <button type="button" onClick={() => setModalCategories(false)} className="text-2xl">×</button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_150px]">
                  <input
                    value={formCategorie.nom}
                    onChange={(event) =>
                      setFormCategorie((ancien) => ({ ...ancien, nom: event.target.value }))
                    }
                    placeholder="Nom de la catégorie"
                    className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5"
                  />
                  <input
                    value={formCategorie.prefixe_code}
                    onChange={(event) =>
                      setFormCategorie((ancien) => ({
                        ...ancien,
                        prefixe_code: event.target.value
                          .toUpperCase()
                          .replace(/[^A-Z]/g, "")
                          .slice(0, 5),
                      }))
                    }
                    placeholder="ELA"
                    className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 font-black uppercase"
                  />
                </div>

                <input
                  value={formCategorie.description}
                  onChange={(event) =>
                    setFormCategorie((ancien) => ({ ...ancien, description: event.target.value }))
                  }
                  placeholder="Description"
                  className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5"
                />

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void enregistrerCategorie()}
                    className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white"
                  >
                    {categorieEdition ? "Enregistrer" : "Ajouter"}
                  </button>
                  {categorieEdition && (
                    <button
                      type="button"
                      onClick={nouvelleCategorie}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold"
                    >
                      Annuler
                    </button>
                  )}
                </div>
              </section>

              <div className="mt-5 space-y-2">
                {categories.map((categorie) => (
                  <div
                    key={categorie.id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <span className="rounded-lg bg-slate-950 px-2.5 py-1 text-xs font-black text-white">
                        {categorie.prefixe_code}
                      </span>{" "}
                      <strong>{categorie.nom}</strong>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => modifierCategorie(categorie)}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => void basculerCategorie(categorie)}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
                      >
                        {categorie.actif ? "Archiver" : "Réactiver"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function CarteStatistique({ label, valeur }: { label: string; valeur: string }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{valeur}</p>
    </article>
  );
}

function MiniValeur({ label, valeur }: { label: string; valeur: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-900">{valeur}</p>
    </div>
  );
}

function ChampMontant({
  label,
  valeur,
  onChange,
}: {
  label: string;
  valeur: number;
  onChange: (valeur: number) => void;
}) {
  return (
    <label>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="relative mt-1.5">
        <input
          type="number"
          min={0}
          step={0.01}
          value={Number.isFinite(valeur) ? valeur : 0}
          onChange={(event) =>
            onChange(Number.isFinite(event.target.valueAsNumber) ? event.target.valueAsNumber : 0)
          }
          className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 pr-10"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-bold text-slate-400">€</span>
      </div>
    </label>
  );
}

function ChampNombre({
  label,
  valeur,
  onChange,
}: {
  label: string;
  valeur: number;
  onChange: (valeur: number) => void;
}) {
  return (
    <label>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="relative mt-1.5">
        <input
          type="number"
          min={0}
          max={100}
          step={0.1}
          value={Number.isFinite(valeur) ? valeur : 0}
          onChange={(event) =>
            onChange(Number.isFinite(event.target.valueAsNumber) ? event.target.valueAsNumber : 0)
          }
          className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 pr-10"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-bold text-slate-400">%</span>
      </div>
    </label>
  );
}

function ResumeCalcul({ label, valeur }: { label: string; valeur: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-emerald-100 pb-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-emerald-800">{label}</span>
      <span className="font-bold text-emerald-950">{valeur}</span>
    </div>
  );
}