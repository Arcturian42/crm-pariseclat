import { Router, Request, Response } from 'express';
import pool from '../db';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

// GET /api/clients
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT c.*, p.locality, p.type as prospect_type
       FROM clients c
       LEFT JOIN prospects p ON c.prospect_id = p.id
       ORDER BY c.created_at DESC`
    );

    res.json({
      data: result.rows,
      message: 'Clients retrieved successfully',
    });
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ error: 'Server error', message: 'Failed to retrieve clients' });
  }
});

// GET /api/clients/:id
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT c.*, p.locality, p.type as prospect_type, p.status as prospect_status
       FROM clients c
       LEFT JOIN prospects p ON c.prospect_id = p.id
       WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Not Found', message: 'Client not found' });
      return;
    }

    res.json({
      data: result.rows[0],
      message: 'Client retrieved successfully',
    });
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({ error: 'Server error', message: 'Failed to retrieve client' });
  }
});

// POST /api/clients
router.post('/', async (req: Request, res: Response) => {
  const {
    prospect_id,
    company_name,
    contact_name,
    email,
    phone,
    contract_value,
    contract_start,
    contract_end,
    status,
    notes,
  } = req.body;

  if (!company_name) {
    res.status(400).json({ error: 'Bad Request', message: 'Company name is required' });
    return;
  }

  try {
    const result = await pool.query(
      `INSERT INTO clients (prospect_id, company_name, contact_name, email, phone, contract_value, contract_start, contract_end, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        prospect_id || null,
        company_name,
        contact_name || null,
        email || null,
        phone || null,
        contract_value || null,
        contract_start || null,
        contract_end || null,
        status || 'actif',
        notes || null,
      ]
    );

    // If converted from a prospect, update the prospect status
    if (prospect_id) {
      await pool.query(
        "UPDATE prospects SET status = 'client_actif', updated_at = NOW() WHERE id = $1",
        [prospect_id]
      );
    }

    res.status(201).json({
      data: result.rows[0],
      message: 'Client created successfully',
    });
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ error: 'Server error', message: 'Failed to create client' });
  }
});

// PUT /api/clients/:id
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    company_name,
    contact_name,
    email,
    phone,
    contract_value,
    contract_start,
    contract_end,
    status,
    notes,
  } = req.body;

  try {
    const existingResult = await pool.query('SELECT * FROM clients WHERE id = $1', [id]);

    if (existingResult.rows.length === 0) {
      res.status(404).json({ error: 'Not Found', message: 'Client not found' });
      return;
    }

    const existing = existingResult.rows[0];

    const result = await pool.query(
      `UPDATE clients
       SET company_name = $1, contact_name = $2, email = $3, phone = $4,
           contract_value = $5, contract_start = $6, contract_end = $7,
           status = $8, notes = $9, updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [
        company_name || existing.company_name,
        contact_name !== undefined ? contact_name : existing.contact_name,
        email !== undefined ? email : existing.email,
        phone !== undefined ? phone : existing.phone,
        contract_value !== undefined ? contract_value : existing.contract_value,
        contract_start !== undefined ? contract_start : existing.contract_start,
        contract_end !== undefined ? contract_end : existing.contract_end,
        status || existing.status,
        notes !== undefined ? notes : existing.notes,
        id,
      ]
    );

    res.json({
      data: result.rows[0],
      message: 'Client updated successfully',
    });
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ error: 'Server error', message: 'Failed to update client' });
  }
});

export default router;
