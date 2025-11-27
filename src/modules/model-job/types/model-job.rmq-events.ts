import type { IModelJobCreate } from "./model-job-mutations.interface";

export const MODEL_JOB_RMQ_EVENTS = {
  CREATED: "model_job_created",
} as const;

export type ModelJobRmqEventName =
  (typeof MODEL_JOB_RMQ_EVENTS)[keyof typeof MODEL_JOB_RMQ_EVENTS];

export type ModelJobCreatedPayload = {
  modelJobId: string;
  payload: IModelJobCreate;
};

export interface ModelJobRmqEventsPayloadMap {
  [MODEL_JOB_RMQ_EVENTS.CREATED]: ModelJobCreatedPayload;
}
