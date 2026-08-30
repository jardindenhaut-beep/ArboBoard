type Props = {
  inverse?: boolean;
  compact?: boolean;
  showTagline?: boolean;
};

export default function Brand({
  inverse = false,
  compact = false,
  showTagline = true,
}: Props) {
  return (
    <div className={`brand-pro ${inverse ? "inverse" : ""}`}>
      <div className={`brand-logo-shell ${compact ? "compact" : ""}`}>
        <img
          src="https://arboboard.fr/arboboard-logo.png"
          alt="Arboboard"
          className="brand-logo-img"
        />
      </div>

      <div className="brand-copy">
        <div className={`brand-name ${compact ? "compact" : ""}`}>
          <strong>Arbo</strong>
          <span>Board</span>
        </div>

        {showTagline ? (
          <div className="brand-tagline">
            Gestion métier paysage & élagage
          </div>
        ) : null}
      </div>
    </div>
  );
}
