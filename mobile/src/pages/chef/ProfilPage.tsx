import Page from "../../components/Page";
import { useAuth } from "../../context/AuthContext";

export default function ProfilPage() {
  const { profil, deconnexion } = useAuth();

  return (
    <Page titre="Profil" sousTitre="Compte Chef">
      <div className="panel">
        <p><b>Nom :</b> {[profil?.prenom, profil?.nom].filter(Boolean).join(" ") || "—"}</p>
        <p><b>E-mail :</b> {profil?.email || "—"}</p>
        <p><b>Rôle :</b> {profil?.role || "—"}</p>
        <button className="secondary" onClick={() => void deconnexion()}>Se déconnecter</button>
      </div>
    </Page>
  );
}
