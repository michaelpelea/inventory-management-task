import { z } from 'zod';

// Valid transitions: active -> acknowledged -> resolved
export const ALERT_STATUSES = ['active', 'acknowledged', 'resolved'];

// Used by PUT /api/alerts/[id] to update alert status
export const alertUpdateSchema = z.object({
  status: z.enum(ALERT_STATUSES, {
    errorMap: () => ({ message: `Status must be one of: ${ALERT_STATUSES.join(', ')}` }),
  }),
});
