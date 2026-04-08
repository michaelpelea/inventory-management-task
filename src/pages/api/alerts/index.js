import fs from 'fs';
import path from 'path';

const productsPath = path.join(process.cwd(), 'data', 'products.json');
const stockPath = path.join(process.cwd(), 'data', 'stock.json');
const transfersPath = path.join(process.cwd(), 'data', 'transfers.json');
const alertsPath = path.join(process.cwd(), 'data', 'alerts.json');

// Severity thresholds relative to a product's reorderPoint.
// These are intentional business rules — adjust here to change behaviour everywhere.
const SEVERITY = {
  CRITICAL: 0.25,  // totalStock <= reorderPoint * 0.25
  LOW: 1.0,        // totalStock <= reorderPoint
  ADEQUATE: 3.0,   // totalStock <= reorderPoint * 3
  // Anything above reorderPoint * 3 is OVERSTOCKED
};

// Safety multiplier: restock to 150% of reorder point (buffer above the minimum threshold)
const SAFETY_MULTIPLIER = 1.5;

// Velocity window: look back 30 days of transfers to compute daily outbound rate
const VELOCITY_WINDOW_DAYS = 30;

/**
 * Determine severity category from totalStock and reorderPoint.
 * Returns one of: 'critical', 'low', 'adequate', 'overstocked'
 */
function getSeverity(totalStock, reorderPoint) {
  if (totalStock <= reorderPoint * SEVERITY.CRITICAL) return 'critical';
  if (totalStock <= reorderPoint * SEVERITY.LOW) return 'low';
  if (totalStock <= reorderPoint * SEVERITY.ADEQUATE) return 'adequate';
  return 'overstocked';
}

/**
 * Calculate recommended reorder quantity.
 *
 * Formula: max(0, (reorderPoint * safetyMultiplier) - currentStock + (dailyVelocity * leadTimeDays))
 *
 * - safetyMultiplier (1.5): bring stock to 150% of reorder point as a buffer
 * - dailyVelocity: average daily outbound units over the last 30 days
 *   (new products with no transfer history get velocity = 0, formula still produces a sensible baseline)
 * - leadTimeDays: how many days until an order arrives (configurable via query param, default 7)
 *
 * Only meaningful for critical/low items; adequate/overstocked items return 0.
 */
function calcRecommendedQty(reorderPoint, currentStock, dailyVelocity, leadTimeDays) {
  const safetyStock = reorderPoint * SAFETY_MULTIPLIER;
  const qty = Math.ceil(safetyStock - currentStock + dailyVelocity * leadTimeDays);
  return Math.max(0, qty);
}

export default function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ message: `Method ${req.method} not allowed.` });
    }

    // leadTimeDays is user-configurable from the UI (default 7)
    const leadTimeDays = Math.max(1, parseInt(req.query.leadTimeDays) || 7);

    const products = JSON.parse(fs.readFileSync(productsPath));
    const stock = JSON.parse(fs.readFileSync(stockPath));
    const transfers = JSON.parse(fs.readFileSync(transfersPath));
    const savedAlerts = JSON.parse(fs.readFileSync(alertsPath));

    // Compute daily velocity per product from transfer history (last 30 days, outbound only)
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - VELOCITY_WINDOW_DAYS);

    const outboundByProduct = {};
    for (const t of transfers) {
      if (new Date(t.createdAt) >= windowStart) {
        outboundByProduct[t.productId] = (outboundByProduct[t.productId] || 0) + t.quantity;
      }
    }

    // Compute alerts for every product
    const severityOrder = { critical: 0, low: 1, adequate: 2, overstocked: 3 };

    const alerts = products.map(product => {
      // Sum stock across all warehouses for this product
      const totalStock = stock
        .filter(s => s.productId === product.id)
        .reduce((sum, s) => sum + s.quantity, 0);

      const severity = getSeverity(totalStock, product.reorderPoint);
      const dailyVelocity = (outboundByProduct[product.id] || 0) / VELOCITY_WINDOW_DAYS;

      // Only compute a recommended order for items that actually need restocking
      const recommendedQuantity =
        severity === 'critical' || severity === 'low'
          ? calcRecommendedQty(product.reorderPoint, totalStock, dailyVelocity, leadTimeDays)
          : 0;

      // Carry forward acknowledge/resolve status from saved alerts if the product
      // was previously actioned — so manager actions persist across page loads.
      const saved = savedAlerts.find(a => a.productId === product.id);
      const status = saved?.status || 'active';
      const acknowledgedAt = saved?.acknowledgedAt || null;
      const resolvedAt = saved?.resolvedAt || null;

      return {
        id: product.id, // use productId as alert id (one alert per product)
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        severity,
        totalStock,
        reorderPoint: product.reorderPoint,
        recommendedQuantity,
        dailyVelocity: Math.round(dailyVelocity * 10) / 10, // one decimal place
        leadTimeDays,
        status,
        acknowledgedAt,
        resolvedAt,
      };
    });

    // Sort: critical first, then low, adequate, overstocked
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return res.status(200).json(alerts);
  } catch (error) {
    console.error('Alerts API error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
