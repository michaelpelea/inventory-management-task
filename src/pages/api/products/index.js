// pages/api/products/index.js
import fs from 'fs';
import path from 'path';
import { productSchema } from '@/lib/schemas/products';

const filePath = path.join(process.cwd(), 'data', 'products.json');

export default function handler(req, res) {
  try {
    const products = JSON.parse(fs.readFileSync(filePath));

    if (req.method === 'GET') {
      return res.status(200).json(products);
    }

    if (req.method === 'POST') {
      // Coerce numeric fields — req.body arrives as strings from form submissions
      const result = productSchema.safeParse({
        ...req.body,
        unitCost:     Number(req.body.unitCost),
        reorderPoint: Number(req.body.reorderPoint),
      });

      if (!result.success) {
        return res.status(400).json({
          message: 'Invalid product data.',
          errors: result.error.flatten().fieldErrors,
        });
      }

      // SKU must be unique across the catalog
      if (products.some(p => p.sku === result.data.sku)) {
        return res.status(409).json({ message: `SKU "${result.data.sku}" already exists.` });
      }

      const newProduct = {
        ...result.data,
        id: products.length ? Math.max(...products.map(p => p.id)) + 1 : 1,
      };
      products.push(newProduct);
      fs.writeFileSync(filePath, JSON.stringify(products, null, 2));
      return res.status(201).json(newProduct);
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ message: `Method ${req.method} not allowed.` });
  } catch (err) {
    console.error('[products] Unexpected error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
