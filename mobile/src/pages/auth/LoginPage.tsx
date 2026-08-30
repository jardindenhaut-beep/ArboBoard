import { useState } from "react";
import type { FormEventHandler } from "react";
import Brand from "../../components/Brand";
import "./LoginPage.css";

type Props = {
  email: string;
  motDePasse: string;
  chargement: boolean;
  erreur: string;
  onEmailChange: (valeur: string) => void;
  onMotDePasseChange: (valeur: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

export default function LoginPage({
  email,
  motDePasse,
  chargement,
  erreur,
  onEmailChange,
  onMotDePasseChange,
  onSubmit,
}: Props) {
  const [afficherMotDePasse, setAfficherMotDePasse] = useState(false);

  return (
    <main className="login-mobile-screen">
      <div className="login-mobile-glow login-mobile-glow-one" />
      <div className="login-mobile-glow login-mobile-glow-two" />

      <section className="login-mobile-shell">
        <header className="login-mobile-brand">
          <Brand showTagline={false} />

          <p className="login-mobile-tagline">
            Du devis au terrain. Du terrain à la facture.
          </p>
        </header>

        <section className="login-mobile-card">
          <div className="login-mobile-heading">
            <p className="login-mobile-kicker">
              APPLICATION MOBILE
            </p>

            <h1>Bienvenue</h1>

            <p>
              Connectez-vous à votre espace Arboboard avec les mêmes
              identifiants que sur le web.
            </p>
          </div>

          <form
            className="login-mobile-form"
            onSubmit={onSubmit}
          >
            <label className="login-mobile-field">
              <span>Adresse e-mail</span>

              <div className="login-mobile-input-wrap">
                <span
                  className="login-mobile-input-icon"
                  aria-hidden="true"
                >
                  @
                </span>

                <input
                  type="email"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="email"
                  placeholder="bonjour@entreprise.fr"
                  value={email}
                  onChange={(event) =>
                    onEmailChange(event.target.value)
                  }
                  required
                />
              </div>
            </label>

            <label className="login-mobile-field">
              <span>Mot de passe</span>

              <div className="login-mobile-input-wrap">
                <span
                  className="login-mobile-input-icon"
                  aria-hidden="true"
                >
                  ●
                </span>

                <input
                  type={
                    afficherMotDePasse
                      ? "text"
                      : "password"
                  }
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="current-password"
                  placeholder="Votre mot de passe"
                  value={motDePasse}
                  onChange={(event) =>
                    onMotDePasseChange(event.target.value)
                  }
                  required
                />

                <button
                  className="login-mobile-password-toggle"
                  type="button"
                  onClick={() =>
                    setAfficherMotDePasse(
                      (valeur) => !valeur
                    )
                  }
                >
                  {afficherMotDePasse
                    ? "Masquer"
                    : "Afficher"}
                </button>
              </div>
            </label>

            {erreur ? (
              <div
                className="login-mobile-error"
                role="alert"
              >
                <span aria-hidden="true">!</span>
                <p>{erreur}</p>
              </div>
            ) : null}

            <button
              className="login-mobile-submit"
              type="submit"
              disabled={chargement}
            >
              {chargement ? (
                <>
                  <span className="login-mobile-spinner" />
                  Connexion…
                </>
              ) : (
                <>
                  Se connecter
                  <span aria-hidden="true">→</span>
                </>
              )}
            </button>
          </form>

          <div className="login-mobile-security">
            <span
              className="login-mobile-security-icon"
              aria-hidden="true"
            >
              ✓
            </span>

            <div>
              <strong>Connexion sécurisée</strong>
              <small>
                Vos données restent synchronisées avec Arboboard.
              </small>
            </div>
          </div>
        </section>

        <p className="login-mobile-footer">
          Arboboard · Paysagistes & élagueurs
        </p>
      </section>
    </main>
  );
}
