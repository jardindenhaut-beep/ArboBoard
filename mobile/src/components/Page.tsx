import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

export default function Page({
  titre,
  sousTitre,
  children,
  action,
}: {
  titre: string;
  sousTitre?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  const navigate = useNavigate();

  return (
    <main className="page">
      <header className="page-header">
        <button className="back" type="button" onClick={() => navigate(-1)}>←</button>
        <div className="page-title">
          <h1>{titre}</h1>
          {sousTitre ? <p>{sousTitre}</p> : null}
        </div>
        {action ? <div>{action}</div> : null}
      </header>
      <section className="page-body">{children}</section>
    </main>
  );
}
