// pages/api/stock/[id].js
import fs from 'fs';
import path from 'path';
import { stockSchema } from '@/lib/schemas/stock';

const filePath       = path.join(process.cwd(), 'data', 'stock.json');
const productsPath   = path.join(process.cwd(), 'data', 'products.json');
const warehousesPath = path.join(process.cwd(), 'data', 'warehouses.json');

export default function handler(req, res) {
  const { id } = req.query;
  const parsedId = parseInt(id, 10);

  if (isNaN(parsedId)) {
    return res.status(400).json({ message: 'Invalid stock ID.' });
  }

  try {
    const stock = JSON.parse(fs.readFileSync(filePath));

    if (req.method === 'GET') {
      const item = stock.find(s => s.id === parsedId);
      if (!item) return res.status(404).json({ message: 'Stock record not found.' });
      return res.status(200).json(item);
    }

    if (req.method === 'PUT') {
      const index = stock.findIndex(s => s.id === parsedId);
      if (index === -1) return res.status(404).json({ message: 'Stock record not found.' });

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

      // One stock record per product+warehouse pair (excluding the record being updated)
      const duplicate = stock.find(
        s => s.productId === productId && s.warehouseId === warehouseId && s.id !== parsedId
      );
      if (duplicate) {
        return res.status(409).json({
          message: 'Another stock record for this product and warehouse already exists.',
        });
      }

      stock[index] = { ...result.data, id: parsedId };
      fs.writeFileSync(filePath, JSON.stringify(stock, null, 2));
      return res.status(200).json(stock[index]);
    }

    if (req.method === 'DELETE') {
      const index = stock.findIndex(s => s.id === parsedId);
      if (index === -1) return res.status(404).json({ message: 'Stock record not found.' });

      stock.splice(index, 1);
      fs.writeFileSync(filePath, JSON.stringify(stock, null, 2));
      return res.status(204).end();
    }

    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    return res.status(405).json({ message: `Method ${req.method} not allowed.` });
  } catch (err) {
    console.error('[stock/[id]] Unexpected error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
