import type { ReactNode } from "react";

export function Navbar({
  icon,
  label,
  className = "",
}: {
  icon: ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`flex size-16 flex-col items-center justify-center gap-1 rounded-xl text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground ${className}`}
      aria-label={label}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
