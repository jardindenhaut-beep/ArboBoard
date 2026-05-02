"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { chargerContexteEntreprise } from "@/lib/entreprise";

type Salarie = {
  id: string;
  entreprise_id: string | null;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  poste: string;
  type_contrat: string;
  date_entree: string | null;
  salaire_brut: number;
  statut: string;
  notes: string;
  created_at: string;
};

type FormSalarie = {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  poste: string;
  type_contrat: string;
  date_entree: string;
  salaire_brut: string;
  statut: string;
  notes: string;
};

const formulaireVide: FormSalarie = {
  nom: "",
  prenom: "",
  email: "",
  telephone: "",
  poste: "",
  type_contrat: "CDI",
  date_entree: "",
  salaire_brut: "",
  statut: "Actif",
  notes: "",
};

export default function SalariesChefPage() {
  const router = useRouter();

  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);
  const [nomEntreprise, setNomEntreprise] = useState("");

  const [salaries, setSalaries] = useState<Salarie[]>([]);
  const [chargement, setChargement] = useState(true);
  const [sauvegarde, setSauvegarde] = useState(false);
  const [message, setMessage] = useState("");
  const [recherche, setRecherche] = useState("");
  const [idEdition, setIdEdition] = useState<string | null>(null);

  const [form, setForm] = useState<FormSalarie>(formulaireVide);

  useEffect(() => {
    chargerContexteEtSalaries();
  }, []);

  async function chargerContexteEtSalaries() {
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

    setEntrepriseId(contexte.entreprise.id);
   setNomEntreprise(contexte.entreprise.nom_entreprise || "");
   
    await chargerSalaries(contexte.entreprise.id);
    setChargement(false);
  }

  async function chargerSalaries(idEntreprise: string) {
    const { data, error } = await supabase
      .from("salaries")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .order("nom", { ascending: true })
      .order("prenom", { ascending: true });

    if (error) {
      setMessage(error.message || "Erreur lors du chargement des salariés.");
    } else {
      setSalaries(data || []);
    }
  }

  function modifierChamp(champ: keyof FormSalarie, valeur: string) {
    setForm((ancien) => ({
      ...ancien,
      [champ]: valeur,
    }));
  }

  function nomComplet(salarie: Salarie) {
    const complet = `${salarie.prenom || ""} ${salarie.nom || ""}`.trim();
    return complet || "Salarié sans nom";
  }

  function formatPrix(nombre: number) {
    return Number(nombre || 0).toLocaleString("fr-FR", {
      style: "currency",
      currency: "EUR",
    });
  }

  function afficherDate(date: string | null) {
    if (!date) {
      return "—";
    }

    return new Date(date + "T00:00:00").toLocaleDateString("fr-FR");
  }

  async function enregistrerSalarie() {
    setSauvegarde(true);
    setMessage("");

    if (!entrepriseId) {
      setMessage("Aucune entreprise connectée. Reconnecte-toi.");
      setSauvegarde(false);
      return;
    }

    if (!form.nom.trim() && !form.prenom.trim()) {
      setMessage("Merci de remplir au minimum le nom ou le prénom.");
      setSauvegarde(false);
      return;
    }

    if (idEdition) {
      const { error } = await supabase
        .from("salaries")
        .update({
          nom: form.nom,
          prenom: form.prenom,
          email: form.email,
          telephone: form.telephone,
          poste: form.poste,
          type_contrat: form.type_contrat,
          date_entree: form.date_entree || null,
          salaire_brut: Number(form.salaire_brut) || 0,
          statut: form.statut,
          notes: form.notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", idEdition)
        .eq("entreprise_id", entrepriseId);

      if (error) {
        setMessage(error.message || "Erreur : le salarié n'a pas été modifié.");
      } else {
        setMessage("Salarié modifié avec succès.");
        annulerEdition();
        await chargerSalaries(entrepriseId);
      }
    } else {
      const { error } = await supabase.from("salaries").insert({
        entreprise_id: entrepriseId,
        nom: form.nom,
        prenom: form.prenom,
        email: form.email,
        telephone: form.telephone,
        poste: form.poste,
        type_contrat: form.type_contrat,
        date_entree: form.date_entree || null,
        salaire_brut: Number(form.salaire_brut) || 0,
        statut: form.statut,
        notes: form.notes,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        setMessage(error.message || "Erreur : le salarié n'a pas été ajouté.");
      } else {
        setMessage("Salarié ajouté avec succès.");
        setForm(formulaireVide);
        await chargerSalaries(entrepriseId);
      }
    }

    setSauvegarde(false);
  }

  function lancerEdition(salarie: Salarie) {
    setIdEdition(salarie.id);

    setForm({
      nom: salarie.nom || "",
      prenom: salarie.prenom || "",
      email: salarie.email || "",
      telephone: salarie.telephone || "",
      poste: salarie.poste || "",
      type_contrat: salarie.type_contrat || "CDI",
      date_entree: salarie.date_entree || "",
      salaire_brut: String(salarie.salaire_brut || ""),
      statut: salarie.statut || "Actif",
      notes: salarie.notes || "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function annulerEdition() {
    setIdEdition(null);
    setForm(formulaireVide);
  }

  async function changerStatut(id: string, statut: string) {
    if (!entrepriseId) {
      setMessage("Aucune entreprise connectée.");
      return;
    }

    const { error } = await supabase
      .from("salaries")
      .update({
        statut,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("entreprise_id", entrepriseId);

    if (error) {
      setMessage(error.message || "Erreur lors du changement de statut.");
    } else {
      setMessage("Statut du salarié mis à jour.");
      await chargerSalaries(entrepriseId);
    }
  }

  async function supprimerSalarie(id: string) {
    if (!entrepriseId) {
      setMessage("Aucune entreprise connectée.");
      return;
    }

    const confirmation = confirm(
      "Supprimer ce salarié ? Cette action est définitive."
    );

    if (!confirmation) {
      return;
    }

    const { error } = await supabase
      .from("salaries")
      .delete()
      .eq("id", id)
      .eq("entreprise_id", entrepriseId);

    if (error) {
      setMessage(error.message || "Erreur lors de la suppression du salarié.");
    } else {
      setMessage("Salarié supprimé.");
      await chargerSalaries(entrepriseId);
    }
  }

  const salariesFiltres = useMemo(() => {
    const texte = recherche.toLowerCase().trim();

    if (!texte) {
      return salaries;
    }

    return salaries.filter((salarie) => {
      const contenu = `
        ${salarie.nom}
        ${salarie.prenom}
        ${salarie.email}
        ${salarie.telephone}
        ${salarie.poste}
        ${salarie.type_contrat}
        ${salarie.statut}
        ${salarie.notes}
      `;

      return contenu.toLowerCase().includes(texte);
    });
  }, [salaries, recherche]);

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Gestion des salariés
          </h1>

          <p className="mt-2 text-slate-600">
            Ajoute et gère les salariés rattachés à ton entreprise.
          </p>

          {nomEntreprise && (
            <p className="mt-2 text-sm font-medium text-slate-500">
              Entreprise connectée : {nomEntreprise}
            </p>
          )}
        </div>

        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-slate-900">
            {idEdition ? "Modifier un salarié" : "Ajouter un salarié"}
          </h2>

          <div className="grid gap-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Prénom
                </label>
                <input
                  value={form.prenom}
                  onChange={(e) => modifierChamp("prenom", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="Prénom"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Nom
                </label>
                <input
                  value={form.nom}
                  onChange={(e) => modifierChamp("nom", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="Nom"
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
                  placeholder="salarie@mail.fr"
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
                  placeholder="06 00 00 00 00"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Poste
                </label>
                <input
                  value={form.poste}
                  onChange={(e) => modifierChamp("poste", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="Ouvrier paysagiste, grimpeur..."
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Type de contrat
                </label>
                <select
                  value={form.type_contrat}
                  onChange={(e) => modifierChamp("type_contrat", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                >
                  <option>CDI</option>
                  <option>CDD</option>
                  <option>Apprentissage</option>
                  <option>Intérim</option>
                  <option>Stage</option>
                  <option>Autre</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Date d&apos;entrée
                </label>
                <input
                  type="date"
                  value={form.date_entree}
                  onChange={(e) => modifierChamp("date_entree", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Salaire brut mensuel
                </label>
                <input
                  type="number"
                  value={form.salaire_brut}
                  onChange={(e) => modifierChamp("salaire_brut", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="2060"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Statut
                </label>
                <select
                  value={form.statut}
                  onChange={(e) => modifierChamp("statut", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                >
                  <option>Actif</option>
                  <option>Inactif</option>
                  <option>En arrêt</option>
                  <option>Sorti</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Notes internes
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => modifierChamp("notes", e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                placeholder="Informations utiles : compétences, contraintes, habilitations, remarques..."
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={enregistrerSalarie}
                disabled={sauvegarde}
                className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {sauvegarde
                  ? "Enregistrement..."
                  : idEdition
                  ? "Modifier le salarié"
                  : "Ajouter le salarié"}
              </button>

              {idEdition && (
                <button
                  onClick={annulerEdition}
                  className="rounded-xl bg-slate-200 px-5 py-3 font-semibold text-slate-800 hover:bg-slate-300"
                >
                  Annuler la modification
                </button>
              )}
            </div>

            {message && (
              <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                {message}
              </p>
            )}
          </div>
        </div>

        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Rechercher un salarié
          </label>
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            placeholder="Recherche par nom, poste, téléphone, statut..."
          />
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-slate-900">
            Liste des salariés
          </h2>

          {chargement ? (
            <p className="text-slate-600">Chargement...</p>
          ) : salariesFiltres.length === 0 ? (
            <p className="text-slate-600">Aucun salarié trouvé.</p>
          ) : (
            <div className="grid gap-4">
              {salariesFiltres.map((salarie) => (
                <div
                  key={salarie.id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {nomComplet(salarie)}
                      </h3>

                      <p className="text-sm text-slate-600">
                        {salarie.poste || "Poste non renseigné"} —{" "}
                        {salarie.type_contrat || "Contrat non renseigné"}
                      </p>
                    </div>

                    <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                      {salarie.statut}
                    </span>
                  </div>

                  <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                    <p>
                      <span className="font-medium">Téléphone :</span>{" "}
                      {salarie.telephone || "—"}
                    </p>

                    <p>
                      <span className="font-medium">Email :</span>{" "}
                      {salarie.email || "—"}
                    </p>

                    <p>
                      <span className="font-medium">Entrée :</span>{" "}
                      {afficherDate(salarie.date_entree)}
                    </p>

                    <p>
                      <span className="font-medium">Salaire brut :</span>{" "}
                      {formatPrix(Number(salarie.salaire_brut) || 0)}
                    </p>
                  </div>

                  {salarie.notes && (
                    <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                      {salarie.notes}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => lancerEdition(salarie)}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                    >
                      Modifier
                    </button>

                    <button
                      onClick={() =>
                        changerStatut(
                          salarie.id,
                          salarie.statut === "Actif" ? "Inactif" : "Actif"
                        )
                      }
                      className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600"
                    >
                      {salarie.statut === "Actif" ? "Désactiver" : "Réactiver"}
                    </button>

                    <button
                      onClick={() => supprimerSalarie(salarie.id)}
                      className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}