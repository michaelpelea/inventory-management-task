import { z } from 'zod';

// Stock record validation schema — shared between API routes and forms.
// quantity allows 0 so stock can be zeroed out without deleting the record.
export const stockSchema = z.object({
  productId:   z.number().int().positive('Product is required'),
  warehouseId: z.number().int().positive('Warehouse is required'),
  quantity:    z.number().int().nonnegative('Quantity must be 0 or greater'),
});
