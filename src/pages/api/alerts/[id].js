import fs from 'fs';
import path from 'path';
import { alertUpdateSchema } from '@/lib/schemas/alerts';

const alertsPath = path.join(process.cwd(), 'data', 'alerts.json');

// PUT /api/alerts/[id] — acknowledge or resolve an alert.
// Alerts are computed on the fly from stock data; this endpoint persists
// the manager's action (acknowledged/resolved) so it survives page reloads.
export default function handler(req, res) {
  try {
    if (req.method !== 'PUT') {
      res.setHeader('Allow', ['PUT']);
      return res.status(405).json({ message: `Method ${req.method} not allowed.` });
    }

    const productId = parseInt(req.query.id);
    if (!productId || isNaN(productId)) {
      return res.status(400).json({ message: 'Invalid alert id.' });
    }

    const result = alertUpdateSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: 'Invalid data.',
        errors: result.error.flatten().fieldErrors,
      });
    }

    const { status } = result.data;
    const now = new Date().toISOString();

    const alerts = JSON.parse(fs.readFileSync(alertsPath));
    const existing = alerts.find(a => a.productId === productId);

    if (existing) {
      existing.status = status;
      if (status === 'acknowledged' && !existing.acknowledgedAt) {
        existing.acknowledgedAt = now;
      }
      if (status === 'resolved') {
        existing.resolvedAt = now;
      }
      existing.updatedAt = now;
    } else {
      // First time this product's alert is actioned — create the record
      alerts.push({
        productId,
        status,
        acknowledgedAt: status === 'acknowledged' ? now : null,
        resolvedAt: status === 'resolved' ? now : null,
        updatedAt: now,
      });
    }

    fs.writeFileSync(alertsPath, JSON.stringify(alerts, null, 2));

    return res.status(200).json({ productId, status });
  } catch (error) {
    console.error('Alert update error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
