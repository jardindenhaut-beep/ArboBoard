import type { ReactNode } from "react";

export default function ListCard({
  titre,
  meta,
  badge,
  onClick,
  children,
}: {
  titre: string;
  meta?: string;
  badge?: string;
  onClick?: () => void;
  children?: ReactNode;
}) {
  return (
    <button className="list-card" type="button" onClick={onClick}>
      <div className="list-card-top">
        <strong>{titre}</strong>
        {badge ? <span className="badge">{badge}</span> : null}
      </div>
      {meta ? <small>{meta}</small> : null}
      {children}
    </button>
  );
}
