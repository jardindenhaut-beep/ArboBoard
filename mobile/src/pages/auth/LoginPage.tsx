import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate } from "react-router-dom";
import Brand from "../../components/Brand";
import { useAuth } from "../../context/AuthContext";

export default function LoginPage() {
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");

  if (auth.mfa) return <Navigate to="/mfa" replace />;
  if (auth.profil && auth.espace) return <Navigate to={auth.espace === "chef" ? "/chef" : "/salarie"} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    try { await auth.connexion(email, motDePasse); setMotDePasse(""); } catch {}
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <Brand />
        <div className="auth-heading">
          <p className="eyebrow">APPLICATION MOBILE</p>
          <h1>Bienvenue</h1>
          <p>Le bureau et le terrain dans la même application.</p>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <label>Adresse e-mail
            <input type="email" inputMode="email" autoComplete="email" placeholder="bonjour@entreprise.fr" value={email} onChange={e => setEmail(e.target.value)} required />
          </label>
          <label>Mot de passe
            <input type="password" autoComplete="current-password" placeholder="Votre mot de passe" value={motDePasse} onChange={e => setMotDePasse(e.target.value)} required />
          </label>
          {auth.erreur ? <div className="state error">{auth.erreur}</div> : null}
          <button className="primary tall" disabled={auth.chargement}>{auth.chargement ? "Connexion…" : "Se connecter"}</button>
        </form>
        <div className="auth-foot">🔒 Connexion sécurisée Arboboard</div>
      </section>
    </main>
  );
}
