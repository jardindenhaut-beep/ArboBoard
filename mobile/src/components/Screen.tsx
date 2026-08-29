import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

export default function Screen({
  title,
  subtitle,
  children,
  right,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  const navigate = useNavigate();

  return (
    <main className="app-screen">
      <header className="screen-header">
        <div className="screen-header-top">
          <button className="round-button" type="button" onClick={() => navigate(-1)} aria-label="Retour">←</button>
          <div className="screen-title-block">
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {right ? <div>{right}</div> : <div className="screen-header-spacer" />}
        </div>
      </header>
      <section className="screen-content">{children}</section>
    </main>
  );
}
