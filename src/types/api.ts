export interface HealthResponse {
  status: "ok";
  service: string;
  timestamp: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}
