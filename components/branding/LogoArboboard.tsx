import Image from "next/image";

type LogoArboboardProps = {
  subtitle?: string;
  compact?: boolean;
  inverse?: boolean;
  className?: string;
  showSubtitle?: boolean;
};

export function MarqueArboboard({
  className = "",
}: {
  className?: string;
  inverse?: boolean;
}) {
  return (
    <span
      className={`relative inline-flex shrink-0 overflow-hidden rounded-2xl border border-emerald-100 bg-[#f7f6ef] shadow-sm ${className}`}
    >
      <Image
        src="/arboboard-logo.png"
        alt=""
        fill
        sizes="64px"
        className="object-cover"
        priority
      />
    </span>
  );
}

export default function LogoArboboard({
  subtitle = "Gestion terrain & entreprise",
  compact = false,
  inverse = false,
  className = "",
  showSubtitle = true,
}: LogoArboboardProps) {
  const titre = inverse ? "text-white" : "text-slate-950";
  const sousTitre = inverse ? "text-slate-400" : "text-slate-500";

  return (
    <span
      className={`inline-flex min-w-0 items-center ${
        compact ? "gap-2.5" : "gap-3"
      } ${className}`}
    >
      <span
        className={`relative shrink-0 overflow-hidden rounded-2xl border ${
          inverse
            ? "border-white/10 bg-white"
            : "border-emerald-100 bg-[#f7f6ef]"
        } shadow-sm ${
          compact ? "h-11 w-11" : "h-14 w-14"
        }`}
      >
        <Image
          src="/arboboard-logo.png"
          alt="ArboBoard"
          fill
          sizes={compact ? "44px" : "56px"}
          className="object-cover"
          priority
        />
      </span>

      <span className="min-w-0">
        <span
          className={`block leading-none tracking-[-0.04em] ${titre} ${
            compact ? "text-[18px]" : "text-[22px]"
          }`}
        >
          <span className="font-black">Arbo</span>
          <span className="font-medium">Board</span>
        </span>

        {showSubtitle ? (
          <span
            className={`mt-1.5 block truncate text-[10px] font-semibold uppercase tracking-[0.12em] ${sousTitre}`}
          >
            {subtitle}
          </span>
        ) : null}
      </span>
    </span>
  );
}