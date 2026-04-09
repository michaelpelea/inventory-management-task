// pages/api/stock/index.js
import fs from 'fs';
import path from 'path';
import { stockSchema } from '@/lib/schemas/stock';

const filePath       = path.join(process.cwd(), 'data', 'stock.json');
const productsPath   = path.join(process.cwd(), 'data', 'products.json');
const warehousesPath = path.join(process.cwd(), 'data', 'warehouses.json');

export default function handler(req, res) {
  try {
    const stock = JSON.parse(fs.readFileSync(filePath));

    if (req.method === 'GET') {
      return res.status(200).json(stock);
    }

    if (req.method === 'POST') {
      // Coerce numeric fields — req.body arrives as strings from form submissions
      const result = stockSchema.safeParse({
        ...req.body,
        productId:   Number(req.body.productId),
        warehouseId: Number(req.body.warehouseId),
        quantity:    Number(req.body.quantity),
      });

      if (!result.success) {
        return res.status(400).json({
          message: 'Invalid stock data.',
          errors: result.error.flatten().fieldErrors,
        });
      }

      const { productId, warehouseId } = result.data;

      // FK checks — ensure the referenced product and warehouse both exist
      const products = JSON.parse(fs.readFileSync(productsPath));
      if (!products.find(p => p.id === productId)) {
        return res.status(400).json({ message: 'Product not found.' });
      }

      const warehouses = JSON.parse(fs.readFileSync(warehousesPath));
      if (!warehouses.find(w => w.id === warehouseId)) {
        return res.status(400).json({ message: 'Warehouse not found.' });
      }

      // One stock record per product+warehouse pair — duplicates would confuse totals
      if (stock.find(s => s.productId === productId && s.warehouseId === warehouseId)) {
        return res.status(409).json({
          message: 'A stock record for this product and warehouse already exists. Edit the existing record instead.',
        });
      }

      const newStock = {
        ...result.data,
        id: stock.length ? Math.max(...stock.map(s => s.id)) + 1 : 1,
      };
      stock.push(newStock);
      fs.writeFileSync(filePath, JSON.stringify(stock, null, 2));
      return res.status(201).json(newStock);
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ message: `Method ${req.method} not allowed.` });
  } catch (err) {
    console.error('[stock] Unexpected error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
