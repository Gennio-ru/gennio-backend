export const SOCKET_MODEL_JOB_EVENTS = {
  UPDATE: "model_job_update",
  SUBSCRIBE: "subscribe_model_job",
  UNSUBSCRIBE: "unsubscribe_model_job",
} as const;

export type ModelJobServerToClientEvent =
  (typeof SOCKET_MODEL_JOB_EVENTS)["UPDATE"];
export type ModelJobClientToServerEvent = (typeof SOCKET_MODEL_JOB_EVENTS)[
  | "SUBSCRIBE"
  | "UNSUBSCRIBE"];
