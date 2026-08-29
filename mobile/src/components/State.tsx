import type { ReactNode } from "react";
export default function State({ children, type = "info" }: { children: ReactNode; type?: "info" | "error" | "success" }) {
  return <div className={`state ${type}`}>{children}</div>;
}
