import { z } from 'zod';

// Warehouse validation schema — shared between API routes and forms.
export const warehouseSchema = z.object({
  code:     z.string().min(1, 'Warehouse code is required'),
  name:     z.string().min(1, 'Warehouse name is required'),
  location: z.string().min(1, 'Location is required'),
});
