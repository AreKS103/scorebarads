import { cn } from "@/lib/utils";

interface CharCounterProps {
  value: string;
  limit: number;
}

export function CharCounter({ value, limit }: CharCounterProps) {
  const count = value.length;
  const ratio = count / limit;
  const color = ratio > 1 ? "text-red-600" : ratio >= 0.8 ? "text-primary" : "text-gray-400";

  return <span className={cn("text-xs font-semibold", color)}>{count}/{limit}</span>;
}
