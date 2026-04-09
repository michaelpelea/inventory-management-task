// pages/api/products/[id].js
import fs from 'fs';
import path from 'path';

const stockPath = path.join(process.cwd(), 'data', 'stock.json');

export default function handler(req, res) {
  const { id } = req.query;
  const parsedId = parseInt(id, 10);

  if (isNaN(parsedId)) {
    return res.status(400).json({ message: 'Invalid product ID' });
  }

  const filePath = path.join(process.cwd(), 'data', 'products.json');

  try {
    const jsonData = fs.readFileSync(filePath);
    let products = JSON.parse(jsonData);

    if (req.method === 'GET') {
      const product = products.find((p) => p.id === parsedId);
      if (product) {
        res.status(200).json(product);
      } else {
        res.status(404).json({ message: 'Product not found' });
      }
    } else if (req.method === 'PUT') {
      const index = products.findIndex((p) => p.id === parsedId);
      if (index !== -1) {
        const sanitizedData = { ...req.body };

        // unitCost is a decimal price — must use parseFloat, not parseInt
        if (sanitizedData.unitCost !== undefined) {
          sanitizedData.unitCost = parseFloat(sanitizedData.unitCost);
          if (!isFinite(sanitizedData.unitCost) || sanitizedData.unitCost < 0) {
            return res.status(400).json({ message: 'unitCost must be a non-negative number' });
          }
        }

        // reorderPoint is a whole-number threshold
        if (sanitizedData.reorderPoint !== undefined) {
          sanitizedData.reorderPoint = parseInt(sanitizedData.reorderPoint, 10);
          if (isNaN(sanitizedData.reorderPoint) || sanitizedData.reorderPoint < 0) {
            return res.status(400).json({ message: 'reorderPoint must be a non-negative integer' });
          }
        }

        products[index] = { ...products[index], ...sanitizedData, id: parsedId };
        fs.writeFileSync(filePath, JSON.stringify(products, null, 2));
        res.status(200).json(products[index]);
      } else {
        res.status(404).json({ message: 'Product not found' });
      }
    } else if (req.method === 'DELETE') {
      const index = products.findIndex((p) => p.id === parsedId);
      if (index === -1) {
        return res.status(404).json({ message: 'Product not found' });
      }

      // Referential integrity: prevent delete if stock records reference this product
      const stock = JSON.parse(fs.readFileSync(stockPath));
      if (stock.some(s => s.productId === parsedId)) {
        return res.status(409).json({
          message: 'Cannot delete this product — it has stock records. Remove all stock records first.',
        });
      }

      products.splice(index, 1);
      fs.writeFileSync(filePath, JSON.stringify(products, null, 2));
      res.status(204).end();
    } else {
      res.status(405).json({ message: 'Method Not Allowed' });
    }
  } catch (err) {
    console.error('[products/[id]] Unexpected error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
}
