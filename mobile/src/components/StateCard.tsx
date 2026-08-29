export default function StateCard({
  texte,
  type = "info",
}: {
  texte: string;
  type?: "info" | "error" | "success";
}) {
  return <div className={`state-card ${type}`}>{texte}</div>;
}
