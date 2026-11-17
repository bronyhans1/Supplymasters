import { APP_SERVICE_NAME } from "@/config/brand";
import type { HealthResponse } from "@/types/api";

export function getHealth(): HealthResponse {
  return {
    status: "ok",
    service: APP_SERVICE_NAME,
    timestamp: new Date().toISOString(),
  };
}
