// PROTOTYPE — throwaway variant switcher. Hidden in production builds.
import { useEffect } from "react";
import { useSearchParams } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function PrototypeSwitcher({
  variants,
  current,
  extra,
}: {
  variants: { key: string; name: string }[];
  current: string;
  extra?: React.ReactNode;
}) {
  const [params, setParams] = useSearchParams();
  const index = Math.max(0, variants.findIndex((v) => v.key === current));

  function go(delta: number) {
    const next = variants[(index + delta + variants.length) % variants.length];
    const p = new URLSearchParams(params);
    p.set("variant", next.key);
    p.delete("inbox");
    setParams(p, { replace: true, preventScrollReset: true });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.closest("input, textarea, select, [contenteditable]"))) return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (import.meta.env.PROD) return null;

  const v = variants[index];
  return (
    <div className="fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-full bg-zinc-900 px-3 py-1.5 text-sm text-white shadow-xl ring-2 ring-fuchsia-500">
      <button onClick={() => go(-1)} className="rounded-full p-1 hover:bg-white/15" title="Previous variant (←)">
        <ChevronLeft className="size-4" />
      </button>
      <span className="font-mono">
        {v.key} <span className="text-white/70">({v.name})</span>
      </span>
      <button onClick={() => go(1)} className="rounded-full p-1 hover:bg-white/15" title="Next variant (→)">
        <ChevronRight className="size-4" />
      </button>
      {extra && <span className="border-l border-white/20 pl-3 text-xs text-white/80">{extra}</span>}
    </div>
  );
}
