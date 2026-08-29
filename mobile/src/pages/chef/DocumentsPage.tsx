import { useNavigate } from "react-router-dom";
import Screen from "../../components/Screen";
import BottomNav from "../../components/BottomNav";
export default function DocumentsPage(){const n=useNavigate();return <><Screen title="Documents" subtitle="Devis & facturation"><div className="document-hub"><button onClick={()=>n("/chef/devis")}><span>▱</span><div><strong>Devis</strong><small>Créer, consulter et envoyer</small></div><b>›</b></button><button onClick={()=>n("/chef/factures")}><span>€</span><div><strong>Factures</strong><small>Facturer, suivre et envoyer</small></div><b>›</b></button></div></Screen><BottomNav espace="chef" active="documents"/></>}
