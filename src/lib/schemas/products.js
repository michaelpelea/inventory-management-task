import { z } from 'zod';

// Product validation schema — shared between API routes and forms.
// unitCost is a non-negative decimal; reorderPoint is a non-negative integer.
export const productSchema = z.object({
  sku:          z.string().min(1, 'SKU is required'),
  name:         z.string().min(1, 'Product name is required'),
  category:     z.string().min(1, 'Category is required'),
  unitCost:     z.number().nonnegative('Unit cost must be 0 or greater'),
  reorderPoint: z.number().int().nonnegative('Reorder point must be 0 or greater'),
});
