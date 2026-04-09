// pages/api/warehouses/[id].js
import fs from 'fs';
import path from 'path';
import { warehouseSchema } from '@/lib/schemas/warehouses';

const filePath  = path.join(process.cwd(), 'data', 'warehouses.json');
const stockPath = path.join(process.cwd(), 'data', 'stock.json');

export default function handler(req, res) {
  const { id } = req.query;
  const parsedId = parseInt(id, 10);

  if (isNaN(parsedId)) {
    return res.status(400).json({ message: 'Invalid warehouse ID.' });
  }

  try {
    const warehouses = JSON.parse(fs.readFileSync(filePath));

    if (req.method === 'GET') {
      const warehouse = warehouses.find(w => w.id === parsedId);
      if (!warehouse) return res.status(404).json({ message: 'Warehouse not found.' });
      return res.status(200).json(warehouse);
    }

    if (req.method === 'PUT') {
      const index = warehouses.findIndex(w => w.id === parsedId);
      if (index === -1) return res.status(404).json({ message: 'Warehouse not found.' });

      const result = warehouseSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: 'Invalid warehouse data.',
          errors: result.error.flatten().fieldErrors,
        });
      }

      // Code must be unique across other warehouses (allow keeping the same code on update)
      const duplicate = warehouses.find(w => w.code === result.data.code && w.id !== parsedId);
      if (duplicate) {
        return res.status(409).json({
          message: `Warehouse code "${result.data.code}" is already used by another warehouse.`,
        });
      }

      warehouses[index] = { ...result.data, id: parsedId };
      fs.writeFileSync(filePath, JSON.stringify(warehouses, null, 2));
      return res.status(200).json(warehouses[index]);
    }

    if (req.method === 'DELETE') {
      const index = warehouses.findIndex(w => w.id === parsedId);
      if (index === -1) return res.status(404).json({ message: 'Warehouse not found.' });

      // Referential integrity: prevent delete if stock records reference this warehouse
      const stock = JSON.parse(fs.readFileSync(stockPath));
      if (stock.some(s => s.warehouseId === parsedId)) {
        return res.status(409).json({
          message: 'Cannot delete this warehouse — it has stock records. Remove all stock records first.',
        });
      }

      warehouses.splice(index, 1);
      fs.writeFileSync(filePath, JSON.stringify(warehouses, null, 2));
      return res.status(204).end();
    }

    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    return res.status(405).json({ message: `Method ${req.method} not allowed.` });
  } catch (err) {
    console.error('[warehouses/[id]] Unexpected error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
