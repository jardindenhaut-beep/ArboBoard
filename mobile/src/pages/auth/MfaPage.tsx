import type { FormEventHandler } from "react";
import Brand from "../../components/Brand";
import "./MfaPage.css";

type Props = {
  code: string;
  faireConfianceAppareil: boolean;
  chargement: boolean;
  erreur: string;
  applicationNative: boolean;
  onCodeChange: (valeur: string) => void;
  onConfianceChange: (valeur: boolean) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onAnnuler: () => void;
};

export default function MfaPage({
  code,
  faireConfianceAppareil,
  chargement,
  erreur,
  applicationNative,
  onCodeChange,
  onConfianceChange,
  onSubmit,
  onAnnuler,
}: Props) {
  return (
    <main className="mfa-mobile-screen">
      <div className="mfa-mobile-glow mfa-mobile-glow-one" />
      <div className="mfa-mobile-glow mfa-mobile-glow-two" />

      <section className="mfa-mobile-shell">
        <header className="mfa-mobile-brand">
          <Brand showTagline={false} />

          <p className="mfa-mobile-tagline">
            Votre espace Arboboard est protégé par une double authentification.
          </p>
        </header>

        <section className="mfa-mobile-card">
          <div className="mfa-mobile-icon" aria-hidden="true">
            <span>✓</span>
          </div>

          <div className="mfa-mobile-heading">
            <p className="mfa-mobile-kicker">VÉRIFICATION DE SÉCURITÉ</p>

            <h1>Entrez votre code</h1>

            <p>
              Ouvrez votre application d’authentification puis saisissez le
              code à 6 chiffres affiché à l’écran.
            </p>
          </div>

          <form className="mfa-mobile-form" onSubmit={onSubmit}>
            <label className="mfa-mobile-code-field">
              <span>Code de vérification</span>

              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                enterKeyHint="done"
                placeholder="000000"
                value={code}
                onChange={(event) =>
                  onCodeChange(event.target.value)
                }
                maxLength={6}
                pattern="[0-9]{6}"
                required
                autoFocus
                aria-label="Code de vérification à 6 chiffres"
              />

              <small>6 chiffres</small>
            </label>

            {applicationNative ? (
              <label className="mfa-mobile-trust">
                <input
                  type="checkbox"
                  checked={faireConfianceAppareil}
                  onChange={(event) =>
                    onConfianceChange(event.target.checked)
                  }
                  disabled={chargement}
                />

                <span className="mfa-mobile-check" aria-hidden="true">
                  {faireConfianceAppareil ? "✓" : ""}
                </span>

                <span className="mfa-mobile-trust-copy">
                  <strong>Faire confiance à cet iPhone</strong>

                  <small>
                    Ne plus demander ce code pendant 90 jours sur cet appareil.
                  </small>
                </span>
              </label>
            ) : (
              <div className="mfa-mobile-info">
                <span aria-hidden="true">i</span>

                <p>
                  La mémorisation de cet appareil pendant 90 jours est
                  disponible dans l’application Arboboard installée.
                </p>
              </div>
            )}

            {erreur ? (
              <div className="mfa-mobile-error" role="alert">
                <span aria-hidden="true">!</span>
                <p>{erreur}</p>
              </div>
            ) : null}

            <button
              className="mfa-mobile-submit"
              type="submit"
              disabled={chargement || code.length !== 6}
            >
              {chargement ? (
                <>
                  <span className="mfa-mobile-spinner" />
                  Vérification…
                </>
              ) : (
                <>
                  Vérifier le code
                  <span aria-hidden="true">→</span>
                </>
              )}
            </button>

            <button
              className="mfa-mobile-cancel"
              type="button"
              onClick={onAnnuler}
              disabled={chargement}
            >
              Revenir à la connexion
            </button>
          </form>

          <div className="mfa-mobile-security">
            <span aria-hidden="true">🔒</span>

            <p>
              Cette vérification protège les données de votre entreprise et de
              vos clients.
            </p>
          </div>
        </section>

        <p className="mfa-mobile-footer">
          Arboboard · Connexion sécurisée
        </p>
      </section>
    </main>
  );
}
