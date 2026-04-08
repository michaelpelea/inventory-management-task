import fs from 'fs';
import path from 'path';
import { transferSchema } from '@/lib/schemas/transfers';

const stockPath = path.join(process.cwd(), 'data', 'stock.json');
const transfersPath = path.join(process.cwd(), 'data', 'transfers.json');
const productsPath = path.join(process.cwd(), 'data', 'products.json');
const warehousesPath = path.join(process.cwd(), 'data', 'warehouses.json');

export default function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const transfers = JSON.parse(fs.readFileSync(transfersPath));
      // Return newest first so history table shows most recent at the top
      transfers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return res.status(200).json(transfers);
    }

    if (req.method === 'POST') {
      // 1. Validate request body with Zod schema
      const result = transferSchema.safeParse({
        ...req.body,
        productId: Number(req.body.productId),
        sourceWarehouseId: Number(req.body.sourceWarehouseId),
        destinationWarehouseId: Number(req.body.destinationWarehouseId),
        quantity: Number(req.body.quantity),
      });

      if (!result.success) {
        return res.status(400).json({
          message: 'Invalid transfer data.',
          errors: result.error.flatten().fieldErrors,
        });
      }

      const { productId, sourceWarehouseId, destinationWarehouseId, quantity, notes } = result.data;

      // 2. Source and destination must differ
      if (sourceWarehouseId === destinationWarehouseId) {
        return res.status(400).json({
          message: 'Source and destination warehouses must be different.',
        });
      }

      // 3. Validate FK references
      const products = JSON.parse(fs.readFileSync(productsPath));
      const product = products.find(p => p.id === productId);
      if (!product) {
        return res.status(400).json({ message: 'Product not found.' });
      }

      const warehouses = JSON.parse(fs.readFileSync(warehousesPath));
      const sourceWarehouse = warehouses.find(w => w.id === sourceWarehouseId);
      const destWarehouse = warehouses.find(w => w.id === destinationWarehouseId);

      if (!sourceWarehouse) {
        return res.status(400).json({ message: 'Source warehouse not found.' });
      }
      if (!destWarehouse) {
        return res.status(400).json({ message: 'Destination warehouse not found.' });
      }

      // 4. Atomic stock update
      // Read stock.json once into memory, apply both changes, write once.
      // If any validation fails after this point, we return without writing — no partial updates.
      const stock = JSON.parse(fs.readFileSync(stockPath));

      const sourceRecord = stock.find(
        s => s.productId === productId && s.warehouseId === sourceWarehouseId
      );

      if (!sourceRecord || sourceRecord.quantity < quantity) {
        const available = sourceRecord ? sourceRecord.quantity : 0;
        return res.status(400).json({
          message: `Not enough stock in ${sourceWarehouse.name}. Available: ${available}, requested: ${quantity}.`,
        });
      }

      // Deduct from source
      sourceRecord.quantity -= quantity;

      // Find or create destination record
      let destRecord = stock.find(
        s => s.productId === productId && s.warehouseId === destinationWarehouseId
      );

      if (destRecord) {
        destRecord.quantity += quantity;
      } else {
        // Product not yet stocked at destination — create a new record
        const maxId = stock.length > 0 ? Math.max(...stock.map(s => s.id)) : 0;
        destRecord = {
          id: maxId + 1,
          productId,
          warehouseId: destinationWarehouseId,
          quantity,
        };
        stock.push(destRecord);
      }

      // Single atomic write — both deduction and credit land together
      fs.writeFileSync(stockPath, JSON.stringify(stock, null, 2));

      // 5. Record the transfer (only after stock write succeeds)
      const transfers = JSON.parse(fs.readFileSync(transfersPath));
      const maxId = transfers.length > 0 ? Math.max(...transfers.map(t => t.id)) : 0;
      const transfer = {
        id: maxId + 1,
        productId,
        sourceWarehouseId,
        destinationWarehouseId,
        quantity,
        status: 'completed',
        notes: notes || '',
        createdAt: new Date().toISOString(),
      };
      transfers.push(transfer);
      fs.writeFileSync(transfersPath, JSON.stringify(transfers, null, 2));

      return res.status(201).json(transfer);
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ message: `Method ${req.method} not allowed.` });
  } catch (error) {
    console.error('Transfer API error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
