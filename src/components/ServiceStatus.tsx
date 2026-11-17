import type { ApiHealthState } from "@/hooks/useApiHealth";

const label: Record<ApiHealthState, string> = {
  checking: "Checking the API",
  online: "API connected",
  offline: "API unavailable",
};

const tone: Record<ApiHealthState, string> = {
  checking: "bg-muted",
  online: "bg-good",
  offline: "bg-accent",
};

type ServiceStatusProps = {
  state: ApiHealthState;
};

export function ServiceStatus({ state }: ServiceStatusProps) {
  return (
    <p className="mt-12 flex items-center gap-2 text-sm text-muted" role="status">
      <span className={`size-2 rounded-full ${tone[state]}`} aria-hidden="true" />
      {label[state]}
    </p>
  );
}
