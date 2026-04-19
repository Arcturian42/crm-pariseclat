import { Router, Request, Response } from 'express';
import pool from '../db';
import { authMiddleware } from '../middleware/auth';
import { enrichProspect } from '../services/clay';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/prospects
router.get('/', async (req: Request, res: Response) => {
  const { status, search, assigned_to } = req.query;

  try {
    let query = `
      SELECT p.*, u.name as assigned_user_name,
        (SELECT date_interaction FROM interactions WHERE prospect_id = p.id ORDER BY date_interaction DESC LIMIT 1) as last_interaction_date,
        (SELECT type FROM interactions WHERE prospect_id = p.id ORDER BY date_interaction DESC LIMIT 1) as last_interaction_type
      FROM prospects p
      LEFT JOIN users u ON p.assigned_to = u.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (status && status !== 'all') {
      query += ` AND p.status = $${paramIndex}`;
      params.push(status as string);
      paramIndex++;
    }

    if (search) {
      query += ` AND (p.company_name ILIKE $${paramIndex} OR p.contact_name ILIKE $${paramIndex} OR p.locality ILIKE $${paramIndex} OR p.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (assigned_to) {
      query += ` AND p.assigned_to = $${paramIndex}`;
      params.push(Number(assigned_to));
      paramIndex++;
    }

    query += ' ORDER BY p.updated_at DESC';

    const result = await pool.query(query, params);

    res.json({
      data: result.rows,
      message: 'Prospects retrieved successfully',
    });
  } catch (error) {
    console.error('Get prospects error:', error);
    res.status(500).json({ error: 'Server error', message: 'Failed to retrieve prospects' });
  }
});

// GET /api/prospects/:id
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const prospectResult = await pool.query(
      `SELECT p.*, u.name as assigned_user_name
       FROM prospects p
       LEFT JOIN users u ON p.assigned_to = u.id
       WHERE p.id = $1`,
      [id]
    );

    if (prospectResult.rows.length === 0) {
      res.status(404).json({ error: 'Not Found', message: 'Prospect not found' });
      return;
    }

    const interactionsResult = await pool.query(
      `SELECT i.*, u.name as user_name
       FROM interactions i
       LEFT JOIN users u ON i.user_id = u.id
       WHERE i.prospect_id = $1
       ORDER BY i.date_interaction DESC`,
      [id]
    );

    res.json({
      data: {
        ...prospectResult.rows[0],
        interactions: interactionsResult.rows,
      },
      message: 'Prospect retrieved successfully',
    });
  } catch (error) {
    console.error('Get prospect error:', error);
    res.status(500).json({ error: 'Server error', message: 'Failed to retrieve prospect' });
  }
});

// POST /api/prospects
router.post('/', async (req: Request, res: Response) => {
  const {
    company_name,
    contact_name,
    email,
    phone,
    locality,
    type,
    status,
    notes,
    assigned_to,
    linkedin_url,
    siren,
    address,
  } = req.body;

  if (!company_name) {
    res.status(400).json({ error: 'Bad Request', message: 'Company name is required' });
    return;
  }

  try {
    const result = await pool.query(
      `INSERT INTO prospects (company_name, contact_name, email, phone, locality, type, status, notes, assigned_to, linkedin_url, siren, address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        company_name,
        contact_name || null,
        email || null,
        phone || null,
        locality || null,
        type || null,
        status || 'prospect_brut',
        notes || null,
        assigned_to || req.user!.id,
        linkedin_url || null,
        siren || null,
        address || null,
      ]
    );

    res.status(201).json({
      data: result.rows[0],
      message: 'Prospect created successfully',
    });
  } catch (error) {
    console.error('Create prospect error:', error);
    res.status(500).json({ error: 'Server error', message: 'Failed to create prospect' });
  }
});

// PUT /api/prospects/:id
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    company_name,
    contact_name,
    email,
    phone,
    locality,
    type,
    status,
    notes,
    assigned_to,
    linkedin_url,
    siren,
    address,
  } = req.body;

  try {
    const existingResult = await pool.query('SELECT * FROM prospects WHERE id = $1', [id]);

    if (existingResult.rows.length === 0) {
      res.status(404).json({ error: 'Not Found', message: 'Prospect not found' });
      return;
    }

    const existing = existingResult.rows[0];

    // Validate status transitions
    const validStatuses = ['prospect_brut', 'premier_contact', 'rdv_fixe', 'devis_envoye', 'client_actif', 'perdu'];
    if (status && !validStatuses.includes(status)) {
      res.status(400).json({ error: 'Bad Request', message: 'Invalid status value' });
      return;
    }

    const result = await pool.query(
      `UPDATE prospects
       SET company_name = $1, contact_name = $2, email = $3, phone = $4,
           locality = $5, type = $6, status = $7, notes = $8, assigned_to = $9,
           linkedin_url = $10, siren = $11, address = $12, updated_at = NOW()
       WHERE id = $13
       RETURNING *`,
      [
        company_name || existing.company_name,
        contact_name !== undefined ? contact_name : existing.contact_name,
        email !== undefined ? email : existing.email,
        phone !== undefined ? phone : existing.phone,
        locality !== undefined ? locality : existing.locality,
        type !== undefined ? type : existing.type,
        status || existing.status,
        notes !== undefined ? notes : existing.notes,
        assigned_to !== undefined ? assigned_to : existing.assigned_to,
        linkedin_url !== undefined ? linkedin_url : existing.linkedin_url,
        siren !== undefined ? siren : existing.siren,
        address !== undefined ? address : existing.address,
        id,
      ]
    );

    res.json({
      data: result.rows[0],
      message: 'Prospect updated successfully',
    });
  } catch (error) {
    console.error('Update prospect error:', error);
    res.status(500).json({ error: 'Server error', message: 'Failed to update prospect' });
  }
});

// DELETE /api/prospects/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const existingResult = await pool.query('SELECT id FROM prospects WHERE id = $1', [id]);

    if (existingResult.rows.length === 0) {
      res.status(404).json({ error: 'Not Found', message: 'Prospect not found' });
      return;
    }

    // Delete related interactions first
    await pool.query('DELETE FROM interactions WHERE prospect_id = $1', [id]);

    await pool.query('DELETE FROM prospects WHERE id = $1', [id]);

    res.json({
      data: null,
      message: 'Prospect deleted successfully',
    });
  } catch (error) {
    console.error('Delete prospect error:', error);
    res.status(500).json({ error: 'Server error', message: 'Failed to delete prospect' });
  }
});

// POST /api/prospects/:id/enrich
router.post('/:id/enrich', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const existingResult = await pool.query('SELECT * FROM prospects WHERE id = $1', [id]);

    if (existingResult.rows.length === 0) {
      res.status(404).json({ error: 'Not Found', message: 'Prospect not found' });
      return;
    }

    const prospect = existingResult.rows[0];
    const enrichedData = await enrichProspect(prospect);

    const result = await pool.query(
      `UPDATE prospects
       SET phone = COALESCE($1, phone),
           linkedin_url = COALESCE($2, linkedin_url),
           siren = COALESCE($3, siren),
           address = COALESCE($4, address),
           enriched_at = NOW(),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [
        enrichedData.phone,
        enrichedData.linkedin_url,
        enrichedData.siren,
        enrichedData.address,
        id,
      ]
    );

    res.json({
      data: {
        prospect: result.rows[0],
        enriched_fields: enrichedData,
      },
      message: 'Prospect enriched successfully',
    });
  } catch (error) {
    console.error('Enrich prospect error:', error);
    res.status(500).json({ error: 'Server error', message: 'Failed to enrich prospect' });
  }
});

// POST /api/prospects/:id/interactions
router.post('/:id/interactions', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { type, date_interaction, compte_rendu, next_action, next_action_date } = req.body;

  if (!type || !compte_rendu) {
    res.status(400).json({ error: 'Bad Request', message: 'Type and compte_rendu are required' });
    return;
  }

  const validTypes = ['appel', 'rdv', 'email', 'note'];
  if (!validTypes.includes(type)) {
    res.status(400).json({ error: 'Bad Request', message: 'Invalid interaction type' });
    return;
  }

  try {
    const prospectExists = await pool.query('SELECT id FROM prospects WHERE id = $1', [id]);
    if (prospectExists.rows.length === 0) {
      res.status(404).json({ error: 'Not Found', message: 'Prospect not found' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO interactions (prospect_id, user_id, type, date_interaction, compte_rendu, next_action, next_action_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        id,
        req.user!.id,
        type,
        date_interaction || new Date(),
        compte_rendu,
        next_action || null,
        next_action_date || null,
      ]
    );

    // Update prospect's updated_at
    await pool.query('UPDATE prospects SET updated_at = NOW() WHERE id = $1', [id]);

    res.status(201).json({
      data: result.rows[0],
      message: 'Interaction added successfully',
    });
  } catch (error) {
    console.error('Add interaction error:', error);
    res.status(500).json({ error: 'Server error', message: 'Failed to add interaction' });
  }
});

// GET /api/prospects/:id/interactions
router.get('/:id/interactions', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT i.*, u.name as user_name
       FROM interactions i
       LEFT JOIN users u ON i.user_id = u.id
       WHERE i.prospect_id = $1
       ORDER BY i.date_interaction DESC`,
      [id]
    );

    res.json({
      data: result.rows,
      message: 'Interactions retrieved successfully',
    });
  } catch (error) {
    console.error('Get interactions error:', error);
    res.status(500).json({ error: 'Server error', message: 'Failed to retrieve interactions' });
  }
});

export default router;
