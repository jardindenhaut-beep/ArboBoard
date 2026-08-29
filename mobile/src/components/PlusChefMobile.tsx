type Props = {
  prenom?: string | null;

  onFermer: () => void;

  onProfil: () => void;

  onSalaries: () => void;

  onDemandes: () => void;

  onDeconnexion: () => void;

  nombreSalariesActifs?: number;

  nombreDemandes?: number;
};

import "./PlusChefMobile.css";

export default function PlusChefMobile({
  prenom,
  onFermer,
  onProfil,
  onSalaries,
  onDemandes,
  onDeconnexion,
  nombreSalariesActifs = 0,
  nombreDemandes = 0,
}: Props) {
  function confirmerDeconnexion() {
    const confirmation =
      window.confirm(
        "Voulez-vous vous déconnecter d’Arboboard ?"
      );

    if (
      !confirmation
    ) {
      return;
    }

    onDeconnexion();
  }

  return (
    <main className="plus-chef-mobile">
      <header className="plus-chef-mobile-header">
        <button
          type="button"
          className="plus-chef-mobile-back"
          onClick={
            onFermer
          }
          aria-label="Retour"
        >
          ‹
        </button>

        <div>
          <small>
            ARBOBOARD
          </small>

          <h1>
            Plus
          </h1>
        </div>

        <div />
      </header>

      <section className="plus-chef-mobile-content">
        <section className="plus-chef-mobile-hero">
          <div className="plus-chef-mobile-avatar">
            {prenom
              ?.trim()
              .charAt(
                0
              )
              .toUpperCase() ||
              "A"}
          </div>

          <div>
            <small>
              ESPACE CHEF
            </small>

            <h2>
              {prenom
                ?.trim()
                ? `Bonjour ${prenom.trim()}`
                : "Mon espace"}
            </h2>

            <p>
              Gérez votre compte et votre équipe.
            </p>
          </div>
        </section>

        <section className="plus-chef-mobile-section">
          <div className="plus-chef-mobile-section-title">
            <small>
              MON COMPTE
            </small>

            <h3>
              Profil & sécurité
            </h3>
          </div>

          <button
            type="button"
            className="plus-chef-mobile-item"
            onClick={
              onProfil
            }
          >
            <span className="plus-chef-mobile-icon">
              👤
            </span>

            <span className="plus-chef-mobile-item-content">
              <strong>
                Mon profil
              </strong>

              <small>
                Coordonnées, compte et MFA
              </small>
            </span>

            <span className="plus-chef-mobile-arrow">
              ›
            </span>
          </button>
        </section>

        <section className="plus-chef-mobile-section">
          <div className="plus-chef-mobile-section-title">
            <small>
              ÉQUIPE
            </small>

            <h3>
              Gestion des salariés
            </h3>
          </div>

          <button
            type="button"
            className="plus-chef-mobile-item"
            onClick={
              onSalaries
            }
          >
            <span className="plus-chef-mobile-icon">
              🦺
            </span>

            <span className="plus-chef-mobile-item-content">
              <strong>
                Salariés
              </strong>

              <small>
                Fiches et accès Arboboard
              </small>
            </span>

            <span className="plus-chef-mobile-count">
              {nombreSalariesActifs}
            </span>

            <span className="plus-chef-mobile-arrow">
              ›
            </span>
          </button>

          <button
            type="button"
            className="plus-chef-mobile-item"
            onClick={
              onDemandes
            }
          >
            <span className="plus-chef-mobile-icon">
              📩
            </span>

            <span className="plus-chef-mobile-item-content">
              <strong>
                Demandes salariés
              </strong>

              <small>
                Congés, RDV et absences
              </small>
            </span>

            {nombreDemandes >
            0 ? (
              <span className="plus-chef-mobile-count alert">
                {nombreDemandes}
              </span>
            ) : (
              <span className="plus-chef-mobile-count">
                0
              </span>
            )}

            <span className="plus-chef-mobile-arrow">
              ›
            </span>
          </button>
        </section>

        <section className="plus-chef-mobile-info">
          <span>
            🌳
          </span>

          <div>
            <strong>
              Arboboard Mobile
            </strong>

            <p>
              Votre activité, votre équipe et vos chantiers dans une seule application.
            </p>
          </div>
        </section>

        <section className="plus-chef-mobile-logout">
          <div>
            <small>
              SESSION
            </small>

            <h3>
              Se déconnecter
            </h3>

            <p>
              Ferme votre session Arboboard sur cet appareil.
            </p>
          </div>

          <button
            type="button"
            onClick={
              confirmerDeconnexion
            }
          >
            Déconnexion
          </button>
        </section>
      </section>
    </main>
  );
}