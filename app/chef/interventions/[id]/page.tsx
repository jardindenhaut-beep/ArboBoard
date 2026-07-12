"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { chargerContexteEntreprise } from "@/lib/entreprise";
import { supabase } from "@/lib/supabaseClient";
import BlocPhotosChantier from "@/components/interventions/BlocPhotosChantier";
import BlocPvFinChantier from "@/components/interventions/BlocPvFinChantier";
import ResumeRetourTerrainFiche from "@/components/interventions/ResumeRetourTerrainFiche";

type StatutFiche =
  | "brouillon"
  | "planifiee"
  | "en_cours"
  | "terminee"
  | "annulee"
  | "archivee";

type FicheIntervention = {
  id: string;
  entreprise_id: string;
  numero: string | null;
  devis_id: string | null;
  facture_id: string | null;
  client_id: string | null;
  client_nom: string | null;
  salarie_id: string | null;
  salarie_nom: string | null;
  titre: string | null;
  type_intervention: string | null;
  statut: string | null;

  date_intervention: string | null;
  heure_debut: string | null;
  heure_fin: string | null;

  date_prevue: string | null;
  heure_debut_prevue: string | null;
  heure_fin_prevue: string | null;
  heure_debut_reelle: string | null;
  heure_fin_reelle: string | null;

  adresse: string | null;
  code_postal: string | null;
  ville: string | null;

  adresse_chantier: string | null;
  code_postal_chantier: string | null;
  ville_chantier: string | null;
  notes_chantier: string | null;

  travaux_prevus: string | null;
  materiel_prevu: string | null;
  consignes_securite: string | null;
  notes_internes: string | null;

  etape_materiel_statut: string | null;
  etape_arrivee_statut: string | null;
  etape_fin_statut: string | null;

  materiel_valide_at: string | null;
  arrivee_validee_at: string | null;
  fin_validee_at: string | null;

  commentaire_preparation: string | null;
  commentaire_arrivee: string | null;
  commentaire_fin: string | null;

  probleme_signale: boolean | null;
  description_probleme: string | null;
  pv_fin_chantier_id: string | null;

  created_at: string | null;
  updated_at: string | null;
};

type FicheElement = {
  id: string;
  fiche_id: string;
  article_id: string | null;
  nom: string;
  categorie: string;
  icone: string | null;
  couleur: string | null;
  quantite_prevue: number | null;
  quantite_reelle: number | null;
  unite: string | null;
  obligatoire: boolean | null;
  coche_prepare: boolean | null;
  commentaire_chef: string | null;
  commentaire_salarie: string | null;
  ordre: number | null;
};

type FicheSalarie = {
  id: string;
  fiche_id: string;
  salarie_id: string | null;
  salarie_nom: string | null;
  role_chantier: string | null;
  heure_arrivee_prevue: string | null;
  heure_depart_prevue: string | null;
  heure_arrivee_reelle: string | null;
  heure_depart_reelle: string | null;
};

type Devis = {
  id: string;
  numero: string | null;
  objet: string | null;
  statut: string | null;
  total_ht: number | null;
  total_tva: number | null;
  total_ttc: number | null;
};

type Facture = {
  id: string;
  numero: string | null;
  objet: string | null;
  statut: string | null;
  total_ht: number | null;
  total_tva: number | null;
  total_ttc: number | null;
};

type Client = {
  id: string;
  type_client?: string | null;
  nom?: string | null;
  prenom?: string | null;
  entreprise?: string | null;
  email?: string | null;
  telephone?: string | null;
  adresse?: string | null;
  code_postal?: string | null;
  ville?: string | null;
};

const BLOCS_ELEMENTS = [
  {
    categorie: "travaux",
    titre: "Travaux à réaliser",
    icone: "✅",
    description: "Liste des tâches prévues sur cette intervention.",
  },
  {
    categorie: "materiel",
    titre: "Matériel à charger",
    icone: "🧰",
    description: "Machines, outils, véhicules et EPI prévus.",
  },
  {
    categorie: "materiaux",
    titre: "Matériaux / fournitures",
    icone: "🪨",
    description: "Fournitures et matériaux nécessaires au chantier.",
  },
  {
    categorie: "consigne_securite",
    titre: "Consignes sécurité",
    icone: "🦺",
    description: "Balisage, EPI, risques, sécurité générale.",
  },
  {
    categorie: "consigne_chantier",
    titre: "Consignes chantier / client",
    icone: "🏠",
    description: "Accès, voisinage, client, évacuation, remarques.",
  },
];

function formatDate(date: string | null | undefined) {
  if (!date) return "Non renseignée";

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(`${date}T00:00:00`));
  } catch {
    return date;
  }
}

function formatDateHeure(date: string | null | undefined) {
  if (!date) return "—";

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  } catch {
    return date;
  }
}

function formatHeure(heure: string | null | undefined) {
  if (!heure) return "—";
  return heure.slice(0, 5);
}

function formatMontant(montant: number | null | undefined) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(Number(montant || 0));
}

function titreFiche(fiche: FicheIntervention | null) {
  if (!fiche) return "Fiche d’intervention";
  return fiche.titre || fiche.type_intervention || "Fiche d’intervention";
}

function adresseFiche(fiche: FicheIntervention | null) {
  if (!fiche) return "Adresse non renseignée";

  const adresse = fiche.adresse_chantier || fiche.adresse || "";
  const codePostal = fiche.code_postal_chantier || fiche.code_postal || "";
  const ville = fiche.ville_chantier || fiche.ville || "";

  const villeComplete = [codePostal, ville].filter(Boolean).join(" ");

  if (!adresse && !villeComplete) return "Adresse non renseignée";

  return [adresse, villeComplete].filter(Boolean).join(", ");
}

function libelleStatut(statut: string | null | undefined) {
  if (statut === "planifiee") return "Planifiée";
  if (statut === "en_cours") return "En cours";
  if (statut === "terminee") return "Terminée";
  if (statut === "annulee") return "Annulée";
  if (statut === "archivee") return "Archivée";
  return "Brouillon";
}

function badgeStatut(statut: string | null | undefined) {
  if (statut === "planifiee") return "bg-blue-50 text-blue-700 border-blue-200";
  if (statut === "en_cours") return "bg-amber-50 text-amber-700 border-amber-200";
  if (statut === "terminee")
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (statut === "annulee") return "bg-red-50 text-red-700 border-red-200";
  if (statut === "archivee")
    return "bg-slate-100 text-slate-600 border-slate-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function libelleEtape(statut: string | null | undefined) {
  if (statut === "valide") return "Validée";
  if (statut === "en_cours") return "En cours";
  if (statut === "probleme") return "Problème";
  if (statut === "a_preparer") return "À préparer";
  return "En attente";
}

function classeEtape(statut: string | null | undefined) {
  if (statut === "valide")
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (statut === "en_cours")
    return "border-amber-200 bg-amber-50 text-amber-700";
  if (statut === "probleme") return "border-red-200 bg-red-50 text-red-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function nomClient(client: Client | null, fallback?: string | null) {
  if (!client) return fallback || "Client non renseigné";

  if (client.type_client === "particulier") {
    const complet = `${client.prenom || ""} ${client.nom || ""}`.trim();
    return complet || fallback || "Client particulier";
  }

  return (
    client.entreprise ||
    client.nom ||
    `${client.prenom || ""} ${client.nom || ""}`.trim() ||
    fallback ||
    "Client professionnel"
  );
}

export default function DetailFicheInterventionPage() {
  const params = useParams();
  const router = useRouter();

  const ficheId = String(params?.id || "");

  const [entrepriseId, setEntrepriseId] = useState("");
  const [signataireEntrepriseNom, setSignataireEntrepriseNom] = useState("");

  const [fiche, setFiche] = useState<FicheIntervention | null>(null);
  const [elements, setElements] = useState<FicheElement[]>([]);
  const [equipe, setEquipe] = useState<FicheSalarie[]>([]);
  const [devis, setDevis] = useState<Devis | null>(null);
  const [facture, setFacture] = useState<Facture | null>(null);
  const [client, setClient] = useState<Client | null>(null);

  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [messageErreur, setMessageErreur] = useState("");
  const [messageSucces, setMessageSucces] = useState("");

  useEffect(() => {
    initialiserPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ficheId]);

  async function initialiserPage() {
    if (!ficheId) {
      setMessageErreur("Identifiant de fiche manquant.");
      setChargement(false);
      return;
    }

    try {
      setChargement(true);
      setMessageErreur("");
      setMessageSucces("");

      const resultat = await chargerContexteEntreprise();

      if (resultat.erreur || !resultat.contexte?.entreprise?.id) {
        setMessageErreur(
          "Impossible de charger votre entreprise. Veuillez vous reconnecter."
        );
        setChargement(false);
        return;
      }

      const contexte: any = resultat.contexte;
      const idEntreprise = contexte.entreprise.id;

      setEntrepriseId(idEntreprise);
      setSignataireEntrepriseNom(
        contexte?.profil?.nom ||
          contexte?.profil?.email ||
          contexte?.utilisateur?.email ||
          ""
      );

      await chargerFicheComplete(idEntreprise, ficheId);
    } catch (error: any) {
      console.error("Erreur chargement détail fiche intervention :", error);
      setMessageErreur(
        error?.message || "Impossible de charger la fiche d’intervention."
      );
    } finally {
      setChargement(false);
    }
  }

  async function chargerFicheComplete(idEntreprise: string, idFiche: string) {
    const { data: ficheData, error: erreurFiche } = await supabase
      .from("fiches_intervention")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .eq("id", idFiche)
      .maybeSingle();

    if (erreurFiche) throw erreurFiche;

    if (!ficheData) {
      setFiche(null);
      setMessageErreur("Fiche d’intervention introuvable.");
      return;
    }

    const ficheChargee = ficheData as FicheIntervention;
    setFiche(ficheChargee);

    const [elementsResult, equipeResult, clientResult, devisResult, factureResult] =
      await Promise.all([
        supabase
          .from("fiches_intervention_elements")
          .select("*")
          .eq("entreprise_id", idEntreprise)
          .eq("fiche_id", idFiche)
          .order("ordre", { ascending: true }),

        supabase
          .from("fiches_intervention_salaries")
          .select("*")
          .eq("entreprise_id", idEntreprise)
          .eq("fiche_id", idFiche)
          .order("created_at", { ascending: true }),

        ficheChargee.client_id
          ? supabase
              .from("clients")
              .select("*")
              .eq("entreprise_id", idEntreprise)
              .eq("id", ficheChargee.client_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),

        ficheChargee.devis_id
          ? supabase
              .from("devis")
              .select("id, numero, objet, statut, total_ht, total_tva, total_ttc")
              .eq("entreprise_id", idEntreprise)
              .eq("id", ficheChargee.devis_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),

        ficheChargee.facture_id
          ? supabase
              .from("factures")
              .select("id, numero, objet, statut, total_ht, total_tva, total_ttc")
              .eq("entreprise_id", idEntreprise)
              .eq("id", ficheChargee.facture_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

    if (elementsResult.error) throw elementsResult.error;
    if (equipeResult.error) throw equipeResult.error;
    if (clientResult.error) throw clientResult.error;
    if (devisResult.error) throw devisResult.error;
    if (factureResult.error) throw factureResult.error;

    setElements((elementsResult.data || []) as FicheElement[]);
    setEquipe((equipeResult.data || []) as FicheSalarie[]);
    setClient((clientResult.data || null) as Client | null);
    setDevis((devisResult.data || null) as Devis | null);
    setFacture((factureResult.data || null) as Facture | null);
  }

  async function rafraichir() {
    if (!entrepriseId || !ficheId) return;
    await chargerFicheComplete(entrepriseId, ficheId);
  }

  async function changerStatut(nouveauStatut: StatutFiche) {
    if (!entrepriseId || !fiche) return;

    try {
      setEnregistrement(true);
      setMessageErreur("");
      setMessageSucces("");

      const { error } = await supabase
        .from("fiches_intervention")
        .update({
          statut: nouveauStatut,
        })
        .eq("entreprise_id", entrepriseId)
        .eq("id", fiche.id);

      if (error) throw error;

      await rafraichir();
      setMessageSucces(`Statut mis à jour : ${libelleStatut(nouveauStatut)}.`);
    } catch (error: any) {
      console.error("Erreur changement statut fiche :", error);
      setMessageErreur(
        error?.message || "Impossible de modifier le statut de la fiche."
      );
    } finally {
      setEnregistrement(false);
    }
  }

  const elementsParCategorie = useMemo(() => {
    const resultat: Record<string, FicheElement[]> = {};

    for (const element of elements) {
      if (!resultat[element.categorie]) resultat[element.categorie] = [];
      resultat[element.categorie].push(element);
    }

    return resultat;
  }, [elements]);

  const travauxSimples = useMemo(() => {
    return [
      fiche?.travaux_prevus,
      fiche?.materiel_prevu,
      fiche?.consignes_securite,
    ]
      .filter(Boolean)
      .join("\n\n");
  }, [fiche]);

  function renduEtapes() {
    if (!fiche) return null;

    return (
      <div className="grid gap-3 md:grid-cols-3">
        <div
          className={`rounded-2xl border p-4 ${classeEtape(
            fiche.etape_materiel_statut
          )}`}
        >
          <p className="text-sm font-bold">1. Matériel chargé</p>
          <p className="mt-1 text-sm">{libelleEtape(fiche.etape_materiel_statut)}</p>
          <p className="mt-2 text-xs opacity-80">
            Validation : {formatDateHeure(fiche.materiel_valide_at)}
          </p>
        </div>

        <div
          className={`rounded-2xl border p-4 ${classeEtape(
            fiche.etape_arrivee_statut
          )}`}
        >
          <p className="text-sm font-bold">2. Arrivée chantier</p>
          <p className="mt-1 text-sm">{libelleEtape(fiche.etape_arrivee_statut)}</p>
          <p className="mt-2 text-xs opacity-80">
            Validation : {formatDateHeure(fiche.arrivee_validee_at)}
          </p>
        </div>

        <div
          className={`rounded-2xl border p-4 ${classeEtape(
            fiche.etape_fin_statut
          )}`}
        >
          <p className="text-sm font-bold">3. Fin / PV</p>
          <p className="mt-1 text-sm">{libelleEtape(fiche.etape_fin_statut)}</p>
          <p className="mt-2 text-xs opacity-80">
            Validation : {formatDateHeure(fiche.fin_validee_at)}
          </p>
        </div>
      </div>
    );
  }

  function renduBlocElements(categorie: string, titre: string, icone: string, description: string) {
    const liste = elementsParCategorie[categorie] || [];

    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-xl">
            {icone}
          </div>

          <div>
            <h2 className="font-bold text-slate-950">{titre}</h2>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>
        </div>

        {liste.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
            Aucun élément renseigné.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {liste.map((element) => (
              <div
                key={element.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-slate-950">
                    {element.icone || "•"} {element.nom}
                  </p>

                  {element.coche_prepare && (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      Préparé
                    </span>
                  )}
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  Prévu : {Number(element.quantite_prevue || 1)}{" "}
                  {element.unite || "u"}
                  {element.quantite_reelle !== null &&
                  element.quantite_reelle !== undefined
                    ? ` · Réel : ${Number(element.quantite_reelle)} ${
                        element.unite || "u"
                      }`
                    : ""}
                </p>

                {element.commentaire_chef && (
                  <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs text-slate-600">
                    Chef : {element.commentaire_chef}
                  </p>
                )}

                {element.commentaire_salarie && (
                  <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    Salarié : {element.commentaire_salarie}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    );
  }

  if (chargement) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
            📋
          </div>
          <p className="font-semibold text-slate-950">Chargement de la fiche...</p>
          <p className="mt-1 text-sm text-slate-500">
            Récupération des données chantier.
          </p>
        </div>
      </div>
    );
  }

  if (!fiche) {
    return (
      <div className="space-y-6">
        <Link
          href="/chef/interventions"
          className="inline-flex rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          ← Retour aux fiches
        </Link>

        <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="font-bold text-red-700">Fiche introuvable</p>
          <p className="mt-2 text-sm text-red-700">
            Cette fiche n’existe pas ou n’appartient pas à votre entreprise.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            href="/chef/interventions"
            className="inline-flex rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            ← Retour aux fiches
          </Link>

          <p className="mt-5 text-sm font-medium text-emerald-700">
            Fiche d’intervention
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-950">
            {titreFiche(fiche)}
          </h1>

          <p className="mt-2 max-w-4xl text-sm text-slate-600">
            {fiche.client_nom || nomClient(client)} · {adresseFiche(fiche)}
          </p>

          {fiche.numero && (
            <p className="mt-1 text-xs font-semibold text-slate-400">
              Numéro fiche : {fiche.numero}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={rafraichir}
            disabled={enregistrement}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Actualiser
          </button>

          <button
            type="button"
            onClick={() => changerStatut("en_cours")}
            disabled={enregistrement}
            className="rounded-2xl border border-amber-200 px-4 py-3 text-sm font-semibold text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Passer en cours
          </button>

          <button
            type="button"
            onClick={() => changerStatut("terminee")}
            disabled={enregistrement}
            className="rounded-2xl border border-emerald-200 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Marquer terminée
          </button>
        </div>
      </section>

      {messageErreur && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {messageErreur}
        </div>
      )}

      {messageSucces && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {messageSucces}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Statut
          </p>
          <span
            className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${badgeStatut(
              fiche.statut
            )}`}
          >
            {libelleStatut(fiche.statut)}
          </span>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Date prévue
          </p>
          <p className="mt-3 text-lg font-bold text-slate-950">
            {formatDate(fiche.date_prevue || fiche.date_intervention)}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Horaires prévus
          </p>
          <p className="mt-3 text-lg font-bold text-slate-950">
            {formatHeure(fiche.heure_debut_prevue || fiche.heure_debut)} →{" "}
            {formatHeure(fiche.heure_fin_prevue || fiche.heure_fin)}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Horaires réels
          </p>
          <p className="mt-3 text-lg font-bold text-slate-950">
            {formatHeure(fiche.heure_debut_reelle)} →{" "}
            {formatHeure(fiche.heure_fin_reelle)}
          </p>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <div className="space-y-5">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-xl">
                📍
              </div>

              <div>
                <h2 className="font-bold text-slate-950">Informations chantier</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Adresse, notes et informations principales de la fiche.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Client
                </p>
                <p className="mt-2 font-bold text-slate-950">
                  {nomClient(client, fiche.client_nom)}
                </p>

                {client?.email && (
                  <p className="mt-1 text-sm text-slate-500">{client.email}</p>
                )}

                {client?.telephone && (
                  <p className="mt-1 text-sm text-slate-500">
                    {client.telephone}
                  </p>
                )}
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Adresse chantier
                </p>
                <p className="mt-2 font-bold text-slate-950">
                  {adresseFiche(fiche)}
                </p>
              </div>
            </div>

            {fiche.notes_chantier && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-bold text-amber-950">
                  Notes chantier / accès
                </p>
                <p className="mt-2 whitespace-pre-line text-sm text-amber-800">
                  {fiche.notes_chantier}
                </p>
              </div>
            )}

            {fiche.notes_internes && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-950">
                  Notes internes chef
                </p>
                <p className="mt-2 whitespace-pre-line text-sm text-slate-600">
                  {fiche.notes_internes}
                </p>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-xl">
                🧭
              </div>

              <div>
                <h2 className="font-bold text-slate-950">
                  Suivi terrain en 3 étapes
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Préparation matériel, arrivée chantier et validation de fin.
                </p>
              </div>
            </div>

            <div className="mt-5">{renduEtapes()}</div>

            <ResumeRetourTerrainFiche
              entrepriseId={entrepriseId}
              ficheId={fiche.id}
              problemeSignale={fiche.probleme_signale}
              descriptionProbleme={fiche.description_probleme}
            />
          </section>

          {BLOCS_ELEMENTS.map((bloc) =>
            renduBlocElements(
              bloc.categorie,
              bloc.titre,
              bloc.icone,
              bloc.description
            )
          )}

          {travauxSimples && elements.length === 0 && (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-bold text-slate-950">
                Informations préparées
              </h2>
              <p className="mt-3 whitespace-pre-line text-sm text-slate-600">
                {travauxSimples}
              </p>
            </section>
          )}

          <BlocPhotosChantier
            entrepriseId={entrepriseId}
            ficheId={fiche.id}
            userId={null}
          />

          <BlocPvFinChantier
            entrepriseId={entrepriseId}
            ficheId={fiche.id}
            clientId={fiche.client_id}
            clientNom={fiche.client_nom || nomClient(client)}
            signataireEntrepriseNom={signataireEntrepriseNom}
          />
        </div>

        <aside className="space-y-5">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-950">Équipe affectée</h2>

            {equipe.length === 0 ? (
              <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                Aucun salarié affecté à cette fiche.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {equipe.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="font-bold text-slate-950">
                      {item.salarie_nom || "Salarié"}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Rôle : {item.role_chantier || "Intervenant"}
                    </p>

                    <p className="mt-2 text-xs text-slate-500">
                      Prévu : {formatHeure(item.heure_arrivee_prevue)} →{" "}
                      {formatHeure(item.heure_depart_prevue)}
                    </p>

                    {(item.heure_arrivee_reelle ||
                      item.heure_depart_reelle) && (
                      <p className="mt-1 text-xs font-semibold text-emerald-700">
                        Réel : {formatHeure(item.heure_arrivee_reelle)} →{" "}
                        {formatHeure(item.heure_depart_reelle)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-950">Documents liés</h2>

            <div className="mt-4 space-y-3">
              {devis ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                    Devis
                  </p>
                  <p className="mt-2 font-bold text-emerald-950">
                    {devis.numero || "Devis sans numéro"}
                  </p>
                  <p className="mt-1 text-sm text-emerald-700">
                    {devis.objet || "Sans objet"}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-emerald-800">
                    {formatMontant(devis.total_ttc)}
                  </p>
                  <Link
                    href="/chef/devis"
                    className="mt-3 inline-flex rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                  >
                    Voir les devis
                  </Link>
                </div>
              ) : (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                  Aucun devis lié.
                </p>
              )}

              {facture ? (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                    Facture
                  </p>
                  <p className="mt-2 font-bold text-blue-950">
                    {facture.numero || "Facture sans numéro"}
                  </p>
                  <p className="mt-1 text-sm text-blue-700">
                    {facture.objet || "Sans objet"}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-blue-800">
                    {formatMontant(facture.total_ttc)}
                  </p>
                  <Link
                    href="/chef/factures"
                    className="mt-3 inline-flex rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                  >
                    Voir les factures
                  </Link>
                </div>
              ) : (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                  Aucune facture liée.
                </p>
              )}
            </div>
          </section>

          {fiche.probleme_signale && (
            <section className="rounded-3xl border border-red-200 bg-red-50 p-5 shadow-sm">
              <h2 className="font-bold text-red-700">Problème signalé</h2>
              <p className="mt-2 whitespace-pre-line text-sm text-red-700">
                {fiche.description_probleme ||
                  "Un problème a été signalé sur cette intervention."}
              </p>
            </section>
          )}

          <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <h2 className="font-bold text-emerald-950">Page détail</h2>
            <p className="mt-2 text-sm text-emerald-800">
              Cette page remplace progressivement la grosse modale. Elle sera
              ensuite reliée directement depuis les cartes fiches et depuis les
              plannings.
            </p>
          </section>
        </aside>
      </section>
    </div>
  );
}