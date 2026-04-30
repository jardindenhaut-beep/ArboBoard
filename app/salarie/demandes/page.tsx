"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { chargerContexteEntreprise } from "@/lib/entreprise";

type DemandeSalarie = {
  id: string;
  entreprise_id: string | null;
  nom_salarie: string;
  type_demande: string;
  titre: string;
  description: string;
  date_debut: string | null;
  date_fin: string | null;
  statut: string;
  reponse_chef: string;
  created_at: string;
};

type FormDemande = {
  nom_salarie: string;
  type_demande: string;
  titre: string;
  description: string;
  date_debut: string;
  date_fin: string;
};

const formulaireVide: FormDemande = {
  nom_salarie: "",
  type_demande: "Congé",
  titre: "",
  description: "",
  date_debut: "",
  date_fin: "",
};

export default function DemandesSalariePage() {
  const router = useRouter();

  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);
  const [nomEntreprise, setNomEntreprise] = useState("");
  const [nomSalarieConnecte, setNomSalarieConnecte] = useState("");

  const [demandes, setDemandes] = useState<DemandeSalarie[]>([]);
  const [form, setForm] = useState<FormDemande>(formulaireVide);

  const [chargement, setChargement] = useState(true);
  const [sauvegarde, setSauvegarde] = useState(false);
  const [message, setMessage] = useState("");
  const [recherche, setRecherche] = useState("");

  useEffect(() => {
    chargerContexteEtDemandes();
  }, []);

  async function chargerContexteEtDemandes() {
    setChargement(true);
    setMessage("");

    const { contexte, erreur } = await chargerContexteEntreprise();

    if (erreur || !contexte) {
      setMessage(erreur || "Impossible de charger le contexte salarié.");
      setChargement(false);

      setTimeout(() => {
        router.push("/connexion/salarie");
      }, 1200);

      return;
    }

    if (contexte.profil.role !== "salarie") {
      setMessage("Ce compte n'est pas un compte salarié.");
      setChargement(false);

      setTimeout(() => {
        router.push("/connexion/salarie");
      }, 1200);

      return;
    }

    const nomComplet = `${contexte.profil.prenom || ""} ${
      contexte.profil.nom || ""
    }`.trim();

    const nomFinal =
      nomComplet || contexte.profil.email || "Salarié non renseigné";

    setEntrepriseId(contexte.entreprise.id);
    setNomEntreprise(contexte.entreprise.nom_entreprise);
    setNomSalarieConnecte(nomFinal);

    setForm((ancien) => ({
      ...ancien,
      nom_salarie: nomFinal,
    }));

    await chargerDemandes(contexte.entreprise.id, nomFinal);

    setChargement(false);
  }

  async function chargerDemandes(idEntreprise: string, nomSalarie: string) {
    const { data, error } = await supabase
      .from("demandes_salaries")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .eq("nom_salarie", nomSalarie)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message || "Erreur lors du chargement des demandes.");
    } else {
      setDemandes(data || []);
    }
  }

  function modifierChamp(champ: keyof FormDemande, valeur: string) {
    setForm((ancien) => ({
      ...ancien,
      [champ]: valeur,
    }));
  }

  function afficherDate(date: string | null) {
    if (!date) {
      return "—";
    }

    return new Date(date + "T00:00:00").toLocaleDateString("fr-FR");
  }

  function afficherDateCreation(date: string) {
    if (!date) {
      return "—";
    }

    return new Date(date).toLocaleDateString("fr-FR");
  }

  async function envoyerDemande() {
    setSauvegarde(true);
    setMessage("");

    if (!entrepriseId) {
      setMessage("Aucune entreprise connectée. Reconnecte-toi.");
      setSauvegarde(false);
      return;
    }

    if (!form.nom_salarie.trim()) {
      setMessage("Nom salarié introuvable. Reconnecte-toi.");
      setSauvegarde(false);
      return;
    }

    if (!form.titre.trim()) {
      setMessage("Merci de remplir le titre de la demande.");
      setSauvegarde(false);
      return;
    }

    const { error } = await supabase.from("demandes_salaries").insert({
      entreprise_id: entrepriseId,
      nom_salarie: form.nom_salarie,
      type_demande: form.type_demande,
      titre: form.titre,
      description: form.description,
      date_debut: form.date_debut || null,
      date_fin: form.date_fin || null,
      statut: "En attente",
      reponse_chef: "",
      updated_at: new Date().toISOString(),
    });

    if (error) {
      setMessage(error.message || "Erreur : la demande n'a pas été envoyée.");
      setSauvegarde(false);
      return;
    }

    setMessage("Demande envoyée avec succès.");

    setForm({
      ...formulaireVide,
      nom_salarie: form.nom_salarie,
    });

    await chargerDemandes(entrepriseId, form.nom_salarie);

    setSauvegarde(false);
  }

  const demandesFiltrees = useMemo(() => {
    const texte = recherche.toLowerCase().trim();

    if (!texte) {
      return demandes;
    }

    return demandes.filter((demande) => {
      const contenu = `
        ${demande.nom_salarie}
        ${demande.type_demande}
        ${demande.titre}
        ${demande.description}
        ${demande.statut}
        ${demande.reponse_chef}
      `;

      return contenu.toLowerCase().includes(texte);
    });
  }, [demandes, recherche]);

  const demandesEnAttente = demandes.filter(
    (demande) => demande.statut === "En attente"
  ).length;

  const demandesAcceptees = demandes.filter(
    (demande) => demande.statut === "Acceptée"
  ).length;

  const demandesRefusees = demandes.filter(
    (demande) => demande.statut === "Refusée"
  ).length;

  if (chargement) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <p className="text-slate-700">Chargement des demandes salarié...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Mes demandes
          </h1>

          <p className="mt-2 text-slate-600">
            Envoie une demande au chef et suis son traitement.
          </p>

          {nomEntreprise && (
            <p className="mt-2 text-sm font-medium text-slate-500">
              Entreprise connectée : {nomEntreprise}
            </p>
          )}

          {nomSalarieConnecte && (
            <p className="mt-1 text-sm font-medium text-slate-500">
              Salarié connecté : {nomSalarieConnecte}
            </p>
          )}
        </div>

        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-slate-900">
            Nouvelle demande
          </h2>

          <div className="grid gap-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Nom salarié
                </label>

                <input
                  value={form.nom_salarie}
                  onChange={(e) =>
                    modifierChamp("nom_salarie", e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="Nom du salarié"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Type de demande
                </label>

                <select
                  value={form.type_demande}
                  onChange={(e) =>
                    modifierChamp("type_demande", e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                >
                  <option>Congé</option>
                  <option>Absence</option>
                  <option>Matériel</option>
                  <option>Planning</option>
                  <option>Renseignement</option>
                  <option>Autre</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Titre
              </label>

              <input
                value={form.titre}
                onChange={(e) => modifierChamp("titre", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                placeholder="Exemple : Demande de congé le vendredi"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Date début
                </label>

                <input
                  type="date"
                  value={form.date_debut}
                  onChange={(e) =>
                    modifierChamp("date_debut", e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Date fin
                </label>

                <input
                  type="date"
                  value={form.date_fin}
                  onChange={(e) => modifierChamp("date_fin", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Description
              </label>

              <textarea
                value={form.description}
                onChange={(e) =>
                  modifierChamp("description", e.target.value)
                }
                rows={4}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                placeholder="Détail de ta demande..."
              />
            </div>

            <button
              onClick={envoyerDemande}
              disabled={sauvegarde}
              className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {sauvegarde ? "Envoi en cours..." : "Envoyer la demande"}
            </button>

            {message && (
              <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                {message}
              </p>
            )}
          </div>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total demandes</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {demandes.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">En attente</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {demandesEnAttente}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Acceptées</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {demandesAcceptees}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Refusées</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {demandesRefusees}
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Rechercher dans mes demandes
          </label>

          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            placeholder="Recherche par titre, type, statut..."
          />
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-slate-900">
            Historique de mes demandes
          </h2>

          {demandesFiltrees.length === 0 ? (
            <p className="text-slate-600">Aucune demande trouvée.</p>
          ) : (
            <div className="grid gap-4">
              {demandesFiltrees.map((demande) => (
                <div
                  key={demande.id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {demande.titre || "Demande sans titre"}
                      </h3>

                      <p className="text-sm text-slate-600">
                        {demande.type_demande || "Autre"} — créée le{" "}
                        {afficherDateCreation(demande.created_at)}
                      </p>
                    </div>

                    <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                      {demande.statut}
                    </span>
                  </div>

                  <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                    <p>
                      <span className="font-medium">Date début :</span>{" "}
                      {afficherDate(demande.date_debut)}
                    </p>

                    <p>
                      <span className="font-medium">Date fin :</span>{" "}
                      {afficherDate(demande.date_fin)}
                    </p>
                  </div>

                  {demande.description && (
                    <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                      {demande.description}
                    </p>
                  )}

                  {demande.reponse_chef && (
                    <p className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
                      Réponse chef : {demande.reponse_chef}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}