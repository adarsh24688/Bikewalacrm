import { Queue, type ConnectionOptions } from "bullmq";
import { redis } from "./redis";

export interface FollowUpJobData {
  ruleId: string;
  leadId: string;
  actionType: string;
  messageTemplate: string | null;
  followUpType: string | null;
  logId: string;
}

let _followUpQueue: Queue<FollowUpJobData> | null = null;

export function getFollowUpQueue(): Queue<FollowUpJobData> | null {
  if (!process.env.REDIS_URL) return null;
  if (!_followUpQueue) {
    _followUpQueue = new Queue<FollowUpJobData>("follow-up-actions", {
      connection: redis as unknown as ConnectionOptions,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 500 },
      },
    });
  }
  return _followUpQueue;
}

// backward compat
export const followUpQueue = new Proxy({} as Queue<FollowUpJobData>, {
  get(_t, prop) {
    const q = getFollowUpQueue();
    if (!q) return async () => {};
    return (q as any)[prop];
  },
});
