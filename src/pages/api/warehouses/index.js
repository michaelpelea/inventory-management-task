// pages/api/warehouses/index.js
import fs from 'fs';
import path from 'path';
import { warehouseSchema } from '@/lib/schemas/warehouses';

const filePath = path.join(process.cwd(), 'data', 'warehouses.json');

export default function handler(req, res) {
  try {
    const warehouses = JSON.parse(fs.readFileSync(filePath));

    if (req.method === 'GET') {
      return res.status(200).json(warehouses);
    }

    if (req.method === 'POST') {
      const result = warehouseSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({
          message: 'Invalid warehouse data.',
          errors: result.error.flatten().fieldErrors,
        });
      }

      // Warehouse code must be unique
      if (warehouses.some(w => w.code === result.data.code)) {
        return res.status(409).json({ message: `Warehouse code "${result.data.code}" already exists.` });
      }

      const newWarehouse = {
        ...result.data,
        id: warehouses.length ? Math.max(...warehouses.map(w => w.id)) + 1 : 1,
      };
      warehouses.push(newWarehouse);
      fs.writeFileSync(filePath, JSON.stringify(warehouses, null, 2));
      return res.status(201).json(newWarehouse);
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ message: `Method ${req.method} not allowed.` });
  } catch (err) {
    console.error('[warehouses] Unexpected error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
