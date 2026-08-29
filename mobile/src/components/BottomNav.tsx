import { useNavigate } from "react-router-dom";

export default function BottomNav({
  espace,
  active,
}: {
  espace: "chef" | "salarie";
  active: "accueil" | "planning" | "documents" | "chantiers" | "plus";
}) {
  const navigate = useNavigate();
  const chef = espace === "chef";

  return (
    <nav className="bottom-nav-pro">
      <button className={active === "accueil" ? "active" : ""} onClick={() => navigate(chef ? "/chef" : "/salarie")}>
        <span>⌂</span><small>Accueil</small>
      </button>
      <button className={active === "planning" ? "active" : ""} onClick={() => navigate(chef ? "/chef/planning" : "/salarie/planning")}>
        <span>▦</span><small>Planning</small>
      </button>
      {chef ? (
        <button className="nav-plus" onClick={() => navigate("/chef/nouveau")} aria-label="Créer">
          <span>＋</span>
        </button>
      ) : (
        <button className={active === "chantiers" ? "active" : ""} onClick={() => navigate("/salarie/interventions")}>
          <span>🌳</span><small>Chantiers</small>
        </button>
      )}
      <button className={active === "documents" ? "active" : ""} onClick={() => navigate(chef ? "/chef/documents" : "/salarie/demandes")}>
        <span>{chef ? "▱" : "＋"}</span><small>{chef ? "Documents" : "Demandes"}</small>
      </button>
      <button className={active === "plus" ? "active" : ""} onClick={() => navigate(chef ? "/chef/plus" : "/salarie/profil")}>
        <span>•••</span><small>Plus</small>
      </button>
    </nav>
  );
}
