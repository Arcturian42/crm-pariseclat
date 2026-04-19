import { Router, Request, Response } from 'express';
import pool from '../db';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

// GET /api/dashboard/stats
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    // Total prospects
    const totalProspectsResult = await pool.query('SELECT COUNT(*) FROM prospects');
    const totalProspects = parseInt(totalProspectsResult.rows[0].count);

    // Total active clients
    const totalClientsResult = await pool.query("SELECT COUNT(*) FROM clients WHERE status = 'actif'");
    const totalClients = parseInt(totalClientsResult.rows[0].count);

    // Prospects by status
    const prospectsByStatusResult = await pool.query(
      `SELECT status, COUNT(*) as count
       FROM prospects
       GROUP BY status
       ORDER BY status`
    );
    const prospectsByStatus: Record<string, number> = {};
    prospectsByStatusResult.rows.forEach((row) => {
      prospectsByStatus[row.status] = parseInt(row.count);
    });

    // Revenue forecast (sum of active contract values)
    const revenueForecastResult = await pool.query(
      "SELECT COALESCE(SUM(contract_value), 0) as total FROM clients WHERE status IN ('actif', 'renouvellement')"
    );
    const revenueForecast = parseFloat(revenueForecastResult.rows[0].total);

    // Conversion rate (client_actif / total prospects)
    const clientActifCount = prospectsByStatus['client_actif'] || 0;
    const conversionRate = totalProspects > 0 ? Math.round((clientActifCount / totalProspects) * 100) : 0;

    // Monthly new prospects (last 30 days)
    const monthlyNewProspectsResult = await pool.query(
      "SELECT COUNT(*) FROM prospects WHERE created_at >= NOW() - INTERVAL '30 days'"
    );
    const monthlyNewProspects = parseInt(monthlyNewProspectsResult.rows[0].count);

    // Interactions this week
    const interactionsThisWeekResult = await pool.query(
      "SELECT COUNT(*) FROM interactions WHERE date_interaction >= NOW() - INTERVAL '7 days'"
    );
    const interactionsThisWeek = parseInt(interactionsThisWeekResult.rows[0].count);

    // Pipeline data (prospects grouped by status with details)
    const pipelineResult = await pool.query(
      `SELECT p.id, p.company_name, p.contact_name, p.locality, p.type, p.status,
              p.created_at, p.updated_at,
              u.name as assigned_user_name,
              (SELECT date_interaction FROM interactions WHERE prospect_id = p.id ORDER BY date_interaction DESC LIMIT 1) as last_interaction_date,
              (SELECT type FROM interactions WHERE prospect_id = p.id ORDER BY date_interaction DESC LIMIT 1) as last_interaction_type
       FROM prospects p
       LEFT JOIN users u ON p.assigned_to = u.id
       ORDER BY p.updated_at DESC`
    );

    res.json({
      data: {
        total_prospects: totalProspects,
        total_clients: totalClients,
        prospects_by_status: prospectsByStatus,
        revenue_forecast: revenueForecast,
        conversion_rate: conversionRate,
        monthly_new_prospects: monthlyNewProspects,
        interactions_this_week: interactionsThisWeek,
        pipeline: pipelineResult.rows,
      },
      message: 'Dashboard stats retrieved successfully',
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Server error', message: 'Failed to retrieve dashboard stats' });
  }
});

export default router;
