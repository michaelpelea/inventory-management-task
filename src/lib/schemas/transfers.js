import { z } from 'zod';

// Transfer validation schema — shared between the API route and the transfer form.
// Single source of truth: field rules are defined once and enforced in both places.
export const transferSchema = z.object({
  productId: z.number().int().positive('Product is required'),
  sourceWarehouseId: z.number().int().positive('Source warehouse is required'),
  destinationWarehouseId: z.number().int().positive('Destination warehouse is required'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  notes: z.string().optional(),
});

// Extended schema with cross-field check: source and destination must differ.
// Used for form-level validation before hitting the API.
export const transferSchemaWithRefine = transferSchema.refine(
  (data) => data.sourceWarehouseId !== data.destinationWarehouseId,
  {
    message: 'Source and destination warehouses must be different.',
    path: ['destinationWarehouseId'],
  }
);
