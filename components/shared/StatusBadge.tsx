interface StatusBadgeProps {
  status: string;
}

function statusDotClass(status: string) {
  if (status === "ENABLED") return "bg-green-500";
  if (status === "PAUSED") return "bg-yellow-500";
  if (status === "REMOVED") return "bg-red-500";
  return "bg-muted-foreground";
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className="inline-flex items-center text-sm text-muted-foreground">
      <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${statusDotClass(status)}`} />
      {status}
    </span>
  );
}

export function CampaignTypeBadge({ type }: { type: string }) {
  const label = type === "PERFORMANCE_MAX" ? "PMax" : type.replace("_", " ");
  return <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>;
}
