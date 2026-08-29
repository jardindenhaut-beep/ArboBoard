import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { preparerMfaApresConnexion, verifierCodeMfa } from "../lib/mfa";
import { enregistrerAppareilConfiance, verifierAppareilConfiance } from "../lib/appareilConfiance";

export type ProfilUtilisateur = {
  id: string;
  email: string | null;
  role: string | null;
  nom: string | null;
  prenom: string | null;
  statut: string | null;
  entreprise_id: string | null;
};
export type Espace = "chef" | "salarie";

type MfaState = { user: User; facteurId: string; challengeId: string } | null;
type AuthValue = {
  profil: ProfilUtilisateur | null;
  espace: Espace | null;
  chargement: boolean;
  erreur: string;
  mfa: MfaState;
  confianceDemandee: boolean;
  setConfianceDemandee: (value: boolean) => void;
  connexion: (email: string, motDePasse: string) => Promise<void>;
  verifierMfa: (code: string) => Promise<void>;
  annulerMfa: () => Promise<void>;
  deconnexion: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

function normaliser(v: string | null | undefined) {
  return String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}
function roleVersEspace(role: string | null | undefined): Espace | null {
  const v = normaliser(role);
  if (["chef", "admin", "administrateur", "gerant", "dirigeant", "patron"].includes(v)) return "chef";
  if (["salarie", "employe", "employee", "ouvrier", "collaborateur"].includes(v)) return "salarie";
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profil, setProfil] = useState<ProfilUtilisateur | null>(null);
  const [espace, setEspace] = useState<Espace | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [mfa, setMfa] = useState<MfaState>(null);
  const [confianceDemandee, setConfianceDemandee] = useState(true);

  async function chargerProfil(user: User) {
    const { data, error } = await supabase.from("profils_utilisateurs")
      .select("id,email,role,nom,prenom,statut,entreprise_id").eq("id", user.id).maybeSingle();
    if (error || !data) throw new Error("Profil Arboboard introuvable.");
    const p = data as ProfilUtilisateur;
    const e = roleVersEspace(p.role);
    if (!e) throw new Error(`Rôle non reconnu : ${p.role || "non renseigné"}.`);
    setProfil(p); setEspace(e);
  }

  async function apresConnexion(user: User) {
    const { data: niveau, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) throw error;

    if (niveau.currentLevel === "aal2" || niveau.nextLevel !== "aal2") {
      await chargerProfil(user); return;
    }

    // Utilise le système de confiance 90 jours déjà présent côté Arboboard web.
    // En WebView native, ce point devra être validé car le cookie HttpOnly dépend du contexte Capacitor.
    const confiance = await verifierAppareilConfiance();
    if (confiance) { await chargerProfil(user); return; }

    const prep = await preparerMfaApresConnexion();
    if (!prep.necessaire) { await chargerProfil(user); return; }
    if (!prep.facteurId || !prep.challengeId) throw new Error("Impossible de préparer la MFA.");
    setMfa({ user, facteurId: prep.facteurId, challengeId: prep.challengeId });
  }

  useEffect(() => {
    let actif = true;
    async function restaurer() {
      try {
        setChargement(true); setErreur("");
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session?.user || !actif) return;
        await apresConnexion(data.session.user);
      } catch (e) {
        if (actif) setErreur(e instanceof Error ? e.message : "Session impossible.");
      } finally { if (actif) setChargement(false); }
    }
    void restaurer();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) { setProfil(null); setEspace(null); setMfa(null); }
    });
    return () => { actif = false; listener.subscription.unsubscribe(); };
  }, []);

  async function connexion(email: string, motDePasse: string) {
    try {
      setChargement(true); setErreur("");
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: motDePasse });
      if (error || !data.user) throw error || new Error("Connexion impossible.");
      await apresConnexion(data.user);
    } catch (e) {
      const msg = e instanceof Error && e.message === "Invalid login credentials"
        ? "Adresse e-mail ou mot de passe incorrect."
        : e instanceof Error ? e.message : "Connexion impossible.";
      setErreur(msg); await supabase.auth.signOut(); throw e;
    } finally { setChargement(false); }
  }

  async function verifierMfa(code: string) {
    if (!mfa) throw new Error("Session MFA absente.");
    try {
      setChargement(true); setErreur("");
      await verifierCodeMfa(mfa.facteurId, mfa.challengeId, code);
      if (confianceDemandee) {
        try { await enregistrerAppareilConfiance(); } catch { /* on ne bloque pas l'accès */ }
      }
      await chargerProfil(mfa.user); setMfa(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Code de sécurité invalide."); throw e;
    } finally { setChargement(false); }
  }

  async function annulerMfa() { await supabase.auth.signOut(); setMfa(null); setProfil(null); setEspace(null); setErreur(""); }
  async function deconnexion() { setChargement(true); await supabase.auth.signOut(); setProfil(null); setEspace(null); setMfa(null); setErreur(""); setChargement(false); }

  const value = useMemo<AuthValue>(() => ({
    profil, espace, chargement, erreur, mfa, confianceDemandee, setConfianceDemandee,
    connexion, verifierMfa, annulerMfa, deconnexion,
  }), [profil, espace, chargement, erreur, mfa, confianceDemandee]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const v = useContext(AuthContext); if (!v) throw new Error("AuthProvider manquant."); return v; }
