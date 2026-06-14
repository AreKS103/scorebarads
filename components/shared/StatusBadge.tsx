import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const variant = status === "ENABLED" ? "success" : status === "PAUSED" ? "warning" : status === "REMOVED" ? "danger" : "default";
  return <Badge variant={variant}>{status}</Badge>;
}

export function CampaignTypeBadge({ type }: { type: string }) {
  const variant = type === "SEARCH" ? "default" : type === "DISPLAY" ? "success" : type === "PERFORMANCE_MAX" ? "purple" : type === "VIDEO" ? "danger" : "orange";
  const label = type === "PERFORMANCE_MAX" ? "PMax" : type.replace("_", " ");
  return <Badge variant={variant}>{label}</Badge>;
}
