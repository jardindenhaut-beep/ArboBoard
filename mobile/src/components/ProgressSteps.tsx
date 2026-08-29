export default function ProgressSteps({ current, labels }: { current: number; labels: string[] }) {
  return (
    <div className="progress-steps">
      {labels.map((label, index) => {
        const n = index + 1;
        const done = n < current;
        return (
          <div key={label} className={`progress-step ${n === current ? "active" : ""} ${done ? "done" : ""}`}>
            <span>{done ? "✓" : n}</span>
            <small>{label}</small>
          </div>
        );
      })}
    </div>
  );
}
