import { useNavigate } from "react-router-dom";
import Screen from "../../components/Screen";
import BottomNav from "../../components/BottomNav";
import { useAuth } from "../../context/AuthContext";
export default function PlusPage(){const n=useNavigate();const {profil,deconnexion}=useAuth();return <><Screen title="Plus" subtitle={profil?.email||""}><div className="settings-list"><button onClick={()=>n("/chef/clients")}><span>👥</span><strong>Clients</strong><b>›</b></button><button onClick={()=>n("/chef/salaries")}><span>🦺</span><strong>Salariés</strong><b>›</b></button><button onClick={()=>n("/chef/interventions")}><span>🌳</span><strong>Interventions</strong><b>›</b></button><button onClick={()=>void deconnexion()}><span>↗</span><strong>Se déconnecter</strong><b>›</b></button></div></Screen><BottomNav espace="chef" active="plus"/></>}
