export const unwrapEnvelope = <T>(payload: unknown): T => {
  if (typeof payload === "object" && payload !== null && "data" in payload) {
    const candidate = payload as { data?: unknown };
    if (candidate.data !== undefined && candidate.data !== null && typeof candidate.data === "object") {
      return candidate.data as T;
    }
  }
  return payload as T;
};
