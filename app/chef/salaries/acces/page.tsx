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
  statut: string;
};

type FormAcces = {
  salarie_id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
};

const formulaireVide: FormAcces = {
  salarie_id: "",
  prenom: "",
  nom: "",
  email: "",
  telephone: "",
};

export default function AccesSalariesPage() {
  const router = useRouter();

  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);
  const [nomEntreprise, setNomEntreprise] = useState("");

  const [salaries, setSalaries] = useState<Salarie[]>([]);
  const [form, setForm] = useState<FormAcces>(formulaireVide);

  const [chargement, setChargement] = useState(true);
  const [creation, setCreation] = useState(false);
  const [message, setMessage] = useState("");
  const [recherche, setRecherche] = useState("");

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

    if (contexte.profil.role !== "chef") {
      setMessage("Ce compte n'est pas un compte chef.");
      setChargement(false);

      setTimeout(() => {
        router.push("/connexion");
      }, 1200);

      return;
    }

    setEntrepriseId(contexte.entreprise.id);
    setNomEntreprise(contexte.entreprise.nom_entreprise);

    await chargerSalaries(contexte.entreprise.id);

    setChargement(false);
  }

  async function chargerSalaries(idEntreprise: string) {
    const { data, error } = await supabase
      .from("salaries")
      .select(
        "id, entreprise_id, nom, prenom, email, telephone, poste, statut"
      )
      .eq("entreprise_id", idEntreprise)
      .order("nom", { ascending: true })
      .order("prenom", { ascending: true });

    if (error) {
      setMessage(error.message || "Erreur lors du chargement des salariés.");
    } else {
      setSalaries(data || []);
    }
  }

  function modifierChamp(champ: keyof FormAcces, valeur: string) {
    setForm((ancien) => ({
      ...ancien,
      [champ]: valeur,
    }));
  }

  function choisirSalarie(id: string) {
    if (!id) {
      setForm(formulaireVide);
      return;
    }

    const salarie = salaries.find((item) => item.id === id);

    if (!salarie) {
      return;
    }

    setForm({
      salarie_id: salarie.id,
      prenom: salarie.prenom || "",
      nom: salarie.nom || "",
      email: salarie.email || "",
      telephone: salarie.telephone || "",
    });
  }

  function nomComplet(salarie: Salarie) {
    const complet = `${salarie.prenom || ""} ${salarie.nom || ""}`.trim();

    if (complet) {
      return complet;
    }

    return salarie.email || "Salarié sans nom";
  }

  async function envoyerInvitationSalarie() {
    setCreation(true);
    setMessage("");

    if (!entrepriseId) {
      setMessage("Aucune entreprise connectée. Reconnecte-toi.");
      setCreation(false);
      return;
    }

    if (!form.email.trim()) {
      setMessage("Merci de renseigner l'email du salarié.");
      setCreation(false);
      return;
    }

    if (!form.prenom.trim() && !form.nom.trim()) {
      setMessage("Merci de renseigner le prénom ou le nom du salarié.");
      setCreation(false);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setMessage("Session chef introuvable. Reconnecte-toi.");
      setCreation(false);
      return;
    }

    const response = await fetch("/api/creer-compte-salarie", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        salarieId: form.salarie_id || undefined,
        email: form.email,
        nom: form.nom,
        prenom: form.prenom,
        telephone: form.telephone,
      }),
    });

    const resultat = await response.json();

    if (!response.ok) {
      setMessage(resultat.error || "Erreur lors de l'envoi de l'invitation.");
      setCreation(false);
      return;
    }

    setMessage(
      "Invitation envoyée. Le salarié doit ouvrir le mail et créer son mot de passe."
    );

    setForm(formulaireVide);

    if (entrepriseId) {
      await chargerSalaries(entrepriseId);
    }

    setCreation(false);
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
        ${salarie.statut}
      `;

      return contenu.toLowerCase().includes(texte);
    });
  }, [salaries, recherche]);

  if (chargement) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <p className="text-slate-700">Chargement des accès salariés...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Accès salariés
          </h1>

          <p className="mt-2 text-slate-600">
            Envoie une invitation au salarié pour qu&apos;il crée lui-même son mot de passe.
          </p>

          {nomEntreprise && (
            <p className="mt-2 text-sm font-medium text-slate-500">
              Entreprise connectée : {nomEntreprise}
            </p>
          )}
        </div>

        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-slate-900">
            Inviter un salarié
          </h2>

          <div className="grid gap-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Choisir une fiche salarié existante
              </label>

              <select
                value={form.salarie_id}
                onChange={(e) => choisirSalarie(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              >
                <option value="">Invitation sans fiche sélectionnée</option>

                {salaries.map((salarie) => (
                  <option key={salarie.id} value={salarie.id}>
                    {nomComplet(salarie)} —{" "}
                    {salarie.poste || "Poste non renseigné"}
                  </option>
                ))}
              </select>
            </div>

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

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Email salarié
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
            </div>

            <button
              onClick={envoyerInvitationSalarie}
              disabled={creation}
              className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {creation ? "Envoi en cours..." : "Envoyer l'invitation salarié"}
            </button>

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
            placeholder="Recherche par nom, email, téléphone, poste..."
          />
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-slate-900">
            Salariés disponibles
          </h2>

          {salariesFiltres.length === 0 ? (
            <p className="text-slate-600">Aucun salarié trouvé.</p>
          ) : (
            <div className="grid gap-4">
              {salariesFiltres.map((salarie) => (
                <div
                  key={salarie.id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {nomComplet(salarie)}
                      </h3>

                      <p className="text-sm text-slate-600">
                        {salarie.poste || "Poste non renseigné"} —{" "}
                        {salarie.statut || "Statut non renseigné"}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Email : {salarie.email || "Non renseigné"}
                      </p>

                      <p className="text-sm text-slate-500">
                        Téléphone : {salarie.telephone || "Non renseigné"}
                      </p>
                    </div>

                    <button
                      onClick={() => choisirSalarie(salarie.id)}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                    >
                      Utiliser ce salarié
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