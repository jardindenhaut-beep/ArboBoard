import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate } from "react-router-dom";
import Brand from "../../components/Brand";
import { useAuth } from "../../context/AuthContext";

export default function MfaPage() {
  const auth = useAuth();
  const [code, setCode] = useState("");
  if (auth.profil && auth.espace) return <Navigate to={auth.espace === "chef" ? "/chef" : "/salarie"} replace />;
  if (!auth.mfa) return <Navigate to="/connexion" replace />;

  async function submit(e: FormEvent) { e.preventDefault(); try { await auth.verifierMfa(code); } catch {} }

  return (
    <main className="auth-screen light">
      <section className="auth-card verify-card">
        <Brand compact />
        <div className="verify-icon">✓</div>
        <div className="auth-heading centered">
          <p className="eyebrow">VÉRIFICATION</p><h1>Code de sécurité</h1>
          <p>Saisissez le code affiché dans votre application d’authentification.</p>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <input className="otp-input" inputMode="numeric" autoComplete="one-time-code" placeholder="000000" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))} required autoFocus />
          <label className="trust-row">
            <input type="checkbox" checked={auth.confianceDemandee} onChange={e => auth.setConfianceDemandee(e.target.checked)} />
            <span><strong>Appareil de confiance</strong><small>Ne plus demander le code pendant 90 jours sur cet appareil.</small></span>
          </label>
          {auth.erreur ? <div className="state error">{auth.erreur}</div> : null}
          <button className="primary tall" disabled={auth.chargement}>{auth.chargement ? "Vérification…" : "Vérifier"}</button>
          <button type="button" className="text-button" onClick={() => void auth.annulerMfa()}>Se connecter avec un autre compte</button>
        </form>
      </section>
    </main>
  );
}
