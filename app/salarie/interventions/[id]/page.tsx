"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { chargerContexteEntreprise } from "@/lib/entreprise";
import { supabase } from "@/lib/supabaseClient";
import BlocPhotosChantier from "@/components/interventions/BlocPhotosChantier";
import BlocPvFinChantier from "@/components/interventions/BlocPvFinChantier";
import ResumeRetourTerrainFiche from "@/components/interventions/ResumeRetourTerrainFiche";

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
  entreprise_id: string;
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
  entreprise_id: string;
  fiche_id: string;
  salarie_id: string | null;
  salarie_nom: string | null;
  role_chantier: string | null;
  heure_arrivee_prevue: string | null;
  heure_depart_prevue: string | null;
  heure_arrivee_reelle: string | null;
  heure_depart_reelle: string | null;
};

type Salarie = {
  id: string;
  entreprise_id: string;
  nom: string | null;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  user_id?: string | null;
  profil_id?: string | null;
};

const BLOCS_ELEMENTS = [
  {
    categorie: "travaux",
    titre: "Travaux à réaliser",
    icone: "✅",
    description: "Tâches prévues par le chef pour ce chantier.",
  },
  {
    categorie: "materiel",
    titre: "Matériel à charger",
    icone: "🧰",
    description: "Matériel, machines, véhicules et EPI à préparer.",
  },
  {
    categorie: "materiaux",
    titre: "Matériaux / fournitures",
    icone: "🪨",
    description: "Matériaux ou fournitures à emporter.",
  },
  {
    categorie: "consigne_securite",
    titre: "Consignes sécurité",
    icone: "🦺",
    description: "Sécurité, balisage, risques, EPI obligatoires.",
  },
  {
    categorie: "consigne_chantier",
    titre: "Consignes chantier / client",
    icone: "🏠",
    description: "Accès, voisinage, client, évacuation, remarques.",
  },
];

function nettoyerTexte(valeur: string) {
  const texte = valeur.trim();
  return texte.length > 0 ? texte : null;
}

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

function heureMaintenant() {
  const maintenant = new Date();
  const heures = String(maintenant.getHours()).padStart(2, "0");
  const minutes = String(maintenant.getMinutes()).padStart(2, "0");
  return `${heures}:${minutes}`;
}

function formatHeure(heure: string | null | undefined) {
  if (!heure) return "—";
  return heure.slice(0, 5);
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

function nomSalarie(salarie: Salarie | null) {
  if (!salarie) return "";

  const complet = `${salarie.prenom || ""} ${salarie.nom || ""}`.trim();
  return complet || salarie.email || "";
}

export default function DetailInterventionSalariePage() {
  const params = useParams();
  const ficheId = String(params?.id || "");

  const [entrepriseId, setEntrepriseId] = useState("");
  const [profilId, setProfilId] = useState("");
  const [profilEmail, setProfilEmail] = useState("");

  const [salarie, setSalarie] = useState<Salarie | null>(null);
  const [affectation, setAffectation] = useState<FicheSalarie | null>(null);

  const [fiche, setFiche] = useState<FicheIntervention | null>(null);
  const [elements, setElements] = useState<FicheElement[]>([]);
  const [equipe, setEquipe] = useState<FicheSalarie[]>([]);

  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);

  const [messageErreur, setMessageErreur] = useState("");
  const [messageSucces, setMessageSucces] = useState("");

  const [commentairePreparation, setCommentairePreparation] = useState("");
  const [commentaireArrivee, setCommentaireArrivee] = useState("");
  const [commentaireFin, setCommentaireFin] = useState("");
  const [descriptionProbleme, setDescriptionProbleme] = useState("");
  const [signalerProbleme, setSignalerProbleme] = useState(false);

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
      const idProfil = contexte?.profil?.id || "";
      const emailProfil =
        contexte?.profil?.email || contexte?.utilisateur?.email || "";

      setEntrepriseId(idEntreprise);
      setProfilId(idProfil);
      setProfilEmail(emailProfil);

      const salarieTrouve = await chargerSalarieConnecte(
        idEntreprise,
        idProfil,
        emailProfil
      );

      await chargerFicheComplete(idEntreprise, ficheId, salarieTrouve);
    } catch (error: any) {
      console.error("Erreur chargement détail intervention salarié :", error);
      setMessageErreur(
        error?.message || "Impossible de charger la fiche d’intervention."
      );
    } finally {
      setChargement(false);
    }
  }

  async function chargerSalarieConnecte(
    idEntreprise: string,
    idProfil: string,
    emailProfil: string
  ) {
    let salarieData: Salarie | null = null;

    if (idProfil) {
      const { data, error } = await supabase
        .from("salaries")
        .select("*")
        .eq("entreprise_id", idEntreprise)
        .or(`user_id.eq.${idProfil},profil_id.eq.${idProfil}`)
        .maybeSingle();

      if (!error && data) {
        salarieData = data as Salarie;
      }
    }

    if (!salarieData && emailProfil) {
      const { data, error } = await supabase
        .from("salaries")
        .select("*")
        .eq("entreprise_id", idEntreprise)
        .eq("email", emailProfil)
        .maybeSingle();

      if (!error && data) {
        salarieData = data as Salarie;
      }
    }

    setSalarie(salarieData);
    return salarieData;
  }

  async function chargerFicheComplete(
    idEntreprise: string,
    idFiche: string,
    salarieConnecte: Salarie | null
  ) {
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

    const [elementsResult, equipeResult] = await Promise.all([
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
    ]);

    if (elementsResult.error) throw elementsResult.error;
    if (equipeResult.error) throw equipeResult.error;

    const equipeData = (equipeResult.data || []) as FicheSalarie[];

    const affectationTrouvee =
      equipeData.find((item) => item.salarie_id === salarieConnecte?.id) ||
      null;

    const affectationLegacy =
      !affectationTrouvee &&
      salarieConnecte?.id &&
      ficheChargee.salarie_id === salarieConnecte.id
        ? ({
            id: "legacy",
            entreprise_id: idEntreprise,
            fiche_id: idFiche,
            salarie_id: salarieConnecte.id,
            salarie_nom: ficheChargee.salarie_nom || nomSalarie(salarieConnecte),
            role_chantier: "Intervenant",
            heure_arrivee_prevue:
              ficheChargee.heure_debut_prevue || ficheChargee.heure_debut,
            heure_depart_prevue:
              ficheChargee.heure_fin_prevue || ficheChargee.heure_fin,
            heure_arrivee_reelle: ficheChargee.heure_debut_reelle,
            heure_depart_reelle: ficheChargee.heure_fin_reelle,
          } as FicheSalarie)
        : null;

    setFiche(ficheChargee);
    setElements((elementsResult.data || []) as FicheElement[]);
    setEquipe(equipeData);
    setAffectation(affectationTrouvee || affectationLegacy);

    setCommentairePreparation(ficheChargee.commentaire_preparation || "");
    setCommentaireArrivee(ficheChargee.commentaire_arrivee || "");
    setCommentaireFin(ficheChargee.commentaire_fin || "");
    setDescriptionProbleme(ficheChargee.description_probleme || "");
    setSignalerProbleme(ficheChargee.probleme_signale === true);
  }

  async function rafraichir() {
    if (!entrepriseId || !ficheId) return;
    await chargerFicheComplete(entrepriseId, ficheId, salarie);
  }

  const elementsParCategorie = useMemo(() => {
    const resultat: Record<string, FicheElement[]> = {};

    for (const element of elements) {
      if (!resultat[element.categorie]) resultat[element.categorie] = [];
      resultat[element.categorie].push(element);
    }

    return resultat;
  }, [elements]);

  const materielEtMateriaux = useMemo(() => {
    return elements.filter(
      (element) =>
        element.categorie === "materiel" || element.categorie === "materiaux"
    );
  }, [elements]);

  const nombreElementsPreparables = materielEtMateriaux.length;

  const nombreElementsPrepares = materielEtMateriaux.filter(
    (element) => element.coche_prepare === true
  ).length;

  const toutEstPrepare =
    nombreElementsPreparables === 0 ||
    nombreElementsPrepares === nombreElementsPreparables;

  const nomSignataireEntreprise =
    nomSalarie(salarie) || affectation?.salarie_nom || profilEmail || "";

  async function basculerPreparationElement(element: FicheElement) {
    if (!entrepriseId || !fiche || enregistrement) return;

    try {
      setMessageErreur("");
      setMessageSucces("");

      const { error } = await supabase
        .from("fiches_intervention_elements")
        .update({
          coche_prepare: !element.coche_prepare,
        })
        .eq("entreprise_id", entrepriseId)
        .eq("id", element.id);

      if (error) throw error;

      setElements((anciens) =>
        anciens.map((item) =>
          item.id === element.id
            ? {
                ...item,
                coche_prepare: !element.coche_prepare,
              }
            : item
        )
      );
    } catch (error: any) {
      console.error("Erreur préparation élément :", error);
      setMessageErreur(
        error?.message || "Impossible de modifier la préparation de l’élément."
      );
    }
  }

  async function validerMateriel() {
    if (!entrepriseId || !fiche) return;

    try {
      setEnregistrement(true);
      setMessageErreur("");
      setMessageSucces("");

      const maintenant = new Date().toISOString();

      const { error } = await supabase
        .from("fiches_intervention")
        .update({
          etape_materiel_statut: "valide",
          materiel_valide_at: maintenant,
          commentaire_preparation: nettoyerTexte(commentairePreparation),
        })
        .eq("entreprise_id", entrepriseId)
        .eq("id", fiche.id);

      if (error) throw error;

      await rafraichir();
      setMessageSucces("Matériel validé.");
    } catch (error: any) {
      console.error("Erreur validation matériel :", error);
      setMessageErreur(
        error?.message || "Impossible de valider le matériel."
      );
    } finally {
      setEnregistrement(false);
    }
  }

  async function validerArrivee() {
    if (!entrepriseId || !fiche) return;

    try {
      setEnregistrement(true);
      setMessageErreur("");
      setMessageSucces("");

      const maintenant = new Date().toISOString();
      const heure = heureMaintenant();

      const { error } = await supabase
        .from("fiches_intervention")
        .update({
          statut: "en_cours",
          etape_arrivee_statut: "valide",
          arrivee_validee_at: maintenant,
          heure_debut_reelle: fiche.heure_debut_reelle || heure,
          commentaire_arrivee: nettoyerTexte(commentaireArrivee),
        })
        .eq("entreprise_id", entrepriseId)
        .eq("id", fiche.id);

      if (error) throw error;

      if (affectation && affectation.id !== "legacy") {
        await supabase
          .from("fiches_intervention_salaries")
          .update({
            heure_arrivee_reelle: affectation.heure_arrivee_reelle || heure,
          })
          .eq("entreprise_id", entrepriseId)
          .eq("id", affectation.id);
      }

      await rafraichir();
      setMessageSucces("Arrivée chantier validée.");
    } catch (error: any) {
      console.error("Erreur validation arrivée :", error);
      setMessageErreur(
        error?.message || "Impossible de valider l’arrivée chantier."
      );
    } finally {
      setEnregistrement(false);
    }
  }

  async function validerFinChantier() {
    if (!entrepriseId || !fiche) return;

    try {
      setEnregistrement(true);
      setMessageErreur("");
      setMessageSucces("");

      const maintenant = new Date().toISOString();
      const heure = heureMaintenant();

      const statutFin = signalerProbleme ? "probleme" : "valide";

      const { error } = await supabase
        .from("fiches_intervention")
        .update({
          statut: signalerProbleme ? "en_cours" : "terminee",
          etape_fin_statut: statutFin,
          fin_validee_at: maintenant,
          heure_fin_reelle: fiche.heure_fin_reelle || heure,
          commentaire_fin: nettoyerTexte(commentaireFin),
          probleme_signale: signalerProbleme,
          description_probleme: signalerProbleme
            ? nettoyerTexte(descriptionProbleme)
            : null,
        })
        .eq("entreprise_id", entrepriseId)
        .eq("id", fiche.id);

      if (error) throw error;

      if (affectation && affectation.id !== "legacy") {
        await supabase
          .from("fiches_intervention_salaries")
          .update({
            heure_depart_reelle: affectation.heure_depart_reelle || heure,
          })
          .eq("entreprise_id", entrepriseId)
          .eq("id", affectation.id);
      }

      await rafraichir();

      setMessageSucces(
        signalerProbleme
          ? "Fin de chantier enregistrée avec problème signalé."
          : "Fin de chantier validée."
      );
    } catch (error: any) {
      console.error("Erreur validation fin chantier :", error);
      setMessageErreur(
        error?.message || "Impossible de valider la fin de chantier."
      );
    } finally {
      setEnregistrement(false);
    }
  }

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
          <p className="mt-1 text-sm">
            {libelleEtape(fiche.etape_materiel_statut)}
          </p>
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
          <p className="mt-1 text-sm">
            {libelleEtape(fiche.etape_arrivee_statut)}
          </p>
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
          <p className="mt-1 text-sm">
            {libelleEtape(fiche.etape_fin_statut)}
          </p>
          <p className="mt-2 text-xs opacity-80">
            Validation : {formatDateHeure(fiche.fin_validee_at)}
          </p>
        </div>
      </div>
    );
  }

  function renduBlocElements(
    categorie: string,
    titre: string,
    icone: string,
    description: string
  ) {
    const liste = elementsParCategorie[categorie] || [];
    const categoriePreparation =
      categorie === "materiel" || categorie === "materiaux";

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

                  {categoriePreparation && (
                    <button
                      type="button"
                      onClick={() => basculerPreparationElement(element)}
                      disabled={enregistrement}
                      className={`rounded-full px-3 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
                        element.coche_prepare
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-white text-slate-600 border border-slate-200"
                      }`}
                    >
                      {element.coche_prepare ? "Préparé" : "À préparer"}
                    </button>
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
          <p className="font-semibold text-slate-950">
            Chargement de l’intervention...
          </p>
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
          href="/salarie/planning"
          className="inline-flex rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          ← Retour au planning
        </Link>

        <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="font-bold text-red-700">Fiche introuvable</p>
          <p className="mt-2 text-sm text-red-700">
            Cette intervention n’existe pas ou n’est pas accessible.
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
            href="/salarie/planning"
            className="inline-flex rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            ← Retour au planning
          </Link>

          <p className="mt-5 text-sm font-medium text-emerald-700">
            Intervention salarié
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-950">
            {titreFiche(fiche)}
          </h1>

          <p className="mt-2 max-w-4xl text-sm text-slate-600">
            {fiche.client_nom || "Client"} · {adresseFiche(fiche)}
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

      {!affectation && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Cette fiche est visible, mais aucune affectation salarié directe n’a
          été trouvée pour votre compte. Vérifiez l’affectation côté chef si les
          boutons ne doivent pas apparaître.
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
                <h2 className="font-bold text-slate-950">
                  Informations chantier
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Adresse, accès et consignes utiles.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Adresse chantier
              </p>
              <p className="mt-2 font-bold text-slate-950">
                {adresseFiche(fiche)}
              </p>
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
                  Validez le matériel, votre arrivée et la fin de chantier.
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

          <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <h2 className="font-bold text-emerald-950">
              Étape 1 — Préparation matériel
            </h2>

            <p className="mt-2 text-sm text-emerald-800">
              Matériel / matériaux préparés : {nombreElementsPrepares} /{" "}
              {nombreElementsPreparables}
            </p>

            {!toutEstPrepare && (
              <p className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Tout le matériel n’est pas encore coché comme préparé.
              </p>
            )}

            <textarea
              value={commentairePreparation}
              onChange={(event) => setCommentairePreparation(event.target.value)}
              rows={3}
              placeholder="Commentaire préparation matériel..."
              className="mt-4 w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />

            <button
              type="button"
              onClick={validerMateriel}
              disabled={enregistrement}
              className="mt-4 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {enregistrement ? "Validation..." : "Valider matériel chargé"}
            </button>
          </section>

          <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
            <h2 className="font-bold text-blue-950">
              Étape 2 — Arrivée chantier
            </h2>

            <p className="mt-2 text-sm text-blue-800">
              En validant, l’heure réelle d’arrivée est enregistrée
              automatiquement si elle n’existe pas déjà.
            </p>

            <textarea
              value={commentaireArrivee}
              onChange={(event) => setCommentaireArrivee(event.target.value)}
              rows={3}
              placeholder="Commentaire arrivée chantier..."
              className="mt-4 w-full rounded-2xl border border-blue-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />

            <button
              type="button"
              onClick={validerArrivee}
              disabled={enregistrement}
              className="mt-4 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {enregistrement ? "Validation..." : "Valider arrivée chantier"}
            </button>
          </section>

          {BLOCS_ELEMENTS.map((bloc) =>
            renduBlocElements(
              bloc.categorie,
              bloc.titre,
              bloc.icone,
              bloc.description
            )
          )}

          <BlocPhotosChantier
            entrepriseId={entrepriseId}
            ficheId={fiche.id}
            userId={profilId || null}
          />

          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <h2 className="font-bold text-amber-950">
              Étape 3 — Fin de chantier
            </h2>

            <p className="mt-2 text-sm text-amber-800">
              En validant, l’heure réelle de départ est enregistrée
              automatiquement si elle n’existe pas déjà.
            </p>

            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-amber-200 bg-white p-4">
              <input
                type="checkbox"
                checked={signalerProbleme}
                onChange={(event) => setSignalerProbleme(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
              />

              <span>
                <span className="block text-sm font-bold text-slate-950">
                  Signaler un problème
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  À cocher si le chantier n’est pas terminé normalement ou s’il
                  y a une réserve importante.
                </span>
              </span>
            </label>

            {signalerProbleme && (
              <textarea
                value={descriptionProbleme}
                onChange={(event) => setDescriptionProbleme(event.target.value)}
                rows={4}
                placeholder="Décrivez le problème rencontré..."
                className="mt-4 w-full rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
              />
            )}

            <textarea
              value={commentaireFin}
              onChange={(event) => setCommentaireFin(event.target.value)}
              rows={4}
              placeholder="Commentaire fin de chantier..."
              className="mt-4 w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
            />

            <button
              type="button"
              onClick={validerFinChantier}
              disabled={enregistrement}
              className="mt-4 rounded-2xl bg-amber-600 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {enregistrement ? "Validation..." : "Valider fin de chantier"}
            </button>
          </section>

         <BlocPvFinChantier
  entrepriseId={entrepriseId}
  ficheId={fiche.id}
  clientId={fiche.client_id}
  clientNom={fiche.client_nom}
  signataireEntrepriseNom={nomSalarie(salarie)}
  afficherEnvoiEmail={false}
/>
        </div>

        <aside className="space-y-5">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-950">Mon affectation</h2>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-950">
                {affectation?.salarie_nom ||
                  nomSalarie(salarie) ||
                  profilEmail ||
                  "Salarié"}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Rôle : {affectation?.role_chantier || "Intervenant"}
              </p>

              <p className="mt-2 text-xs text-slate-500">
                Prévu :{" "}
                {formatHeure(
                  affectation?.heure_arrivee_prevue ||
                    fiche.heure_debut_prevue ||
                    fiche.heure_debut
                )}{" "}
                →{" "}
                {formatHeure(
                  affectation?.heure_depart_prevue ||
                    fiche.heure_fin_prevue ||
                    fiche.heure_fin
                )}
              </p>

              <p className="mt-1 text-xs font-semibold text-emerald-700">
                Réel :{" "}
                {formatHeure(
                  affectation?.heure_arrivee_reelle ||
                    fiche.heure_debut_reelle
                )}{" "}
                →{" "}
                {formatHeure(
                  affectation?.heure_depart_reelle || fiche.heure_fin_reelle
                )}
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-950">Équipe chantier</h2>

            {equipe.length === 0 ? (
              <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                Aucune équipe renseignée.
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
            <h2 className="font-bold text-emerald-950">Page terrain</h2>
            <p className="mt-2 text-sm text-emerald-800">
              Cette page détail va remplacer progressivement la grosse gestion
              directement dans le planning salarié.
            </p>
          </section>
        </aside>
      </section>
    </div>
  );
}