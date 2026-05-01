"use client";

import { useEffect, useState } from "react";
import { chargerContexteEntreprise } from "@/lib/entreprise";
import { supabase } from "@/lib/supabaseClient";

type ProfilUtilisateur = {
  id: string;
  email?: string | null;
  role?: string | null;
  statut?: string | null;
  nom?: string | null;
  prenom?: string | null;
  entreprise_id?: string | null;
};

type Salarie = {
  id: string;
  entreprise_id?: string | null;
  nom?: string | null;
  prenom?: string | null;
  email?: string | null;
  telephone?: string | null;
  statut?: string | null;
};

type FormulaireProfil = {
  nom: string;
  prenom: string;
  telephone: string;
};

function valeurTexte(valeur: string | null | undefined) {
  return valeur || "";
}

function nettoyerTexte(valeur: string) {
  const texte = valeur.trim();
  return texte.length > 0 ? texte : null;
}

function nomComplet(profil: ProfilUtilisateur | null, salarie: Salarie | null) {
  const prenom = salarie?.prenom || profil?.prenom || "";
  const nom = salarie?.nom || profil?.nom || "";
  const complet = `${prenom} ${nom}`.trim();

  return complet || profil?.email || salarie?.email || "Salarié";
}

export default function ProfilSalariePage() {
  const [entrepriseId, setEntrepriseId] = useState("");
  const [profil, setProfil] = useState<ProfilUtilisateur | null>(null);
  const [salarie, setSalarie] = useState<Salarie | null>(null);

  const [formulaire, setFormulaire] = useState<FormulaireProfil>({
    nom: "",
    prenom: "",
    telephone: "",
  });

  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);

  const [messageErreur, setMessageErreur] = useState("");
  const [messageSucces, setMessageSucces] = useState("");

  useEffect(() => {
    initialiserPage();
  }, []);

  async function initialiserPage() {
    try {
      setChargement(true);
      setMessageErreur("");

      const resultat = await chargerContexteEntreprise();

      if (resultat.erreur || !resultat.contexte?.profil || !resultat.contexte?.entreprise?.id) {
        setMessageErreur(
          "Impossible de charger votre profil. Veuillez vous reconnecter."
        );
        setChargement(false);
        return;
      }

      const profilConnecte = resultat.contexte.profil as ProfilUtilisateur;
      const idEntreprise = resultat.contexte.entreprise.id as string;

      if (profilConnecte.role !== "salarie") {
        setMessageErreur("Cette page est réservée aux salariés.");
        setChargement(false);
        return;
      }

      setEntrepriseId(idEntreprise);
      setProfil(profilConnecte);

      const salarieConnecte = await chargerSalarie(idEntreprise, profilConnecte);
      setSalarie(salarieConnecte);

      setFormulaire({
        nom: valeurTexte(salarieConnecte?.nom || profilConnecte.nom),
        prenom: valeurTexte(salarieConnecte?.prenom || profilConnecte.prenom),
        telephone: valeurTexte(salarieConnecte?.telephone),
      });
    } catch (error) {
      console.error("Erreur chargement profil salarié :", error);
      setMessageErreur("Une erreur est survenue pendant le chargement.");
    } finally {
      setChargement(false);
    }
  }

  async function chargerSalarie(
    idEntreprise: string,
    profilConnecte: ProfilUtilisateur
  ) {
    const { data: salarieParId, error: erreurParId } = await supabase
      .from("salaries")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .eq("id", profilConnecte.id)
      .maybeSingle();

    if (!erreurParId && salarieParId) {
      return salarieParId as Salarie;
    }

    if (!profilConnecte.email) {
      return null;
    }

    const { data: salarieParEmail, error: erreurParEmail } = await supabase
      .from("salaries")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .ilike("email", profilConnecte.email)
      .maybeSingle();

    if (erreurParEmail) {
      console.error("Erreur chargement fiche salarié :", erreurParEmail);
      return null;
    }

    return (salarieParEmail || null) as Salarie | null;
  }

  function modifierChamp(champ: keyof FormulaireProfil, valeur: string) {
    setFormulaire((ancien) => ({
      ...ancien,
      [champ]: valeur,
    }));
  }

  async function enregistrerProfil() {
    if (!profil?.id || !entrepriseId) {
      setMessageErreur("Profil introuvable. Veuillez vous reconnecter.");
      return;
    }

    try {
      setEnregistrement(true);
      setMessageErreur("");
      setMessageSucces("");

      const payloadProfil = {
        nom: nettoyerTexte(formulaire.nom),
        prenom: nettoyerTexte(formulaire.prenom),
      };

      const { error: erreurProfil } = await supabase
        .from("profils_utilisateurs")
        .update(payloadProfil)
        .eq("id", profil.id);

      if (erreurProfil) throw erreurProfil;

      if (salarie?.id) {
        const payloadSalarie = {
          nom: nettoyerTexte(formulaire.nom),
          prenom: nettoyerTexte(formulaire.prenom),
          telephone: nettoyerTexte(formulaire.telephone),
        };

        const { error: erreurSalarie } = await supabase
          .from("salaries")
          .update(payloadSalarie)
          .eq("id", salarie.id)
          .eq("entreprise_id", entrepriseId);

        if (erreurSalarie) throw erreurSalarie;

        setSalarie((ancien) =>
          ancien
            ? {
                ...ancien,
                ...payloadSalarie,
              }
            : ancien
        );
      }

      setProfil((ancien) =>
        ancien
          ? {
              ...ancien,
              ...payloadProfil,
            }
          : ancien
      );

      setMessageSucces("Profil salarié mis à jour avec succès.");
    } catch (error: any) {
      console.error("Erreur mise à jour profil salarié :", error);
      setMessageErreur(
        error?.message || "Impossible de mettre à jour votre profil."
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
            👤
          </div>
          <p className="text-lg font-bold text-slate-950">
            Chargement du profil...
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Récupération de vos informations salarié.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-emerald-700">Arboboard</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">Mon profil</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Gérez vos informations personnelles visibles dans l’espace salarié.
        </p>
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

      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-lg font-bold text-slate-950">
              Informations personnelles
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Ces informations permettent au chef d’entreprise d’identifier les
              interventions et validations terrain.
            </p>
          </div>

          <div className="space-y-5 p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Prénom
                </label>
                <input
                  value={formulaire.prenom}
                  onChange={(event) =>
                    modifierChamp("prenom", event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  placeholder="Votre prénom"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Nom
                </label>
                <input
                  value={formulaire.nom}
                  onChange={(event) => modifierChamp("nom", event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  placeholder="Votre nom"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Téléphone
              </label>
              <input
                value={formulaire.telephone}
                onChange={(event) =>
                  modifierChamp("telephone", event.target.value)
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                placeholder="06..."
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Email de connexion
              </label>
              <input
                value={profil?.email || salarie?.email || ""}
                disabled
                className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500"
              />
              <p className="mt-1 text-xs text-slate-500">
                L’email de connexion n’est pas modifiable ici.
              </p>
            </div>

            <button
              onClick={enregistrerProfil}
              disabled={enregistrement}
              className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {enregistrement ? "Enregistrement..." : "Enregistrer mon profil"}
            </button>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-950">Compte salarié</h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Nom affiché</span>
                <span className="font-semibold text-slate-950">
                  {nomComplet(profil, salarie)}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Rôle</span>
                <span className="font-semibold text-slate-950">Salarié</span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Statut profil</span>
                <span className="font-semibold text-slate-950">
                  {profil?.statut || "—"}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Statut salarié</span>
                <span className="font-semibold text-slate-950">
                  {salarie?.statut || "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="font-bold text-emerald-900">Information</p>
            <p className="mt-2 text-sm text-emerald-800">
              Vos informations sont utilisées pour les fiches d’intervention, le
              planning et les validations terrain.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}