import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import pool from '../db';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// POST /api/agents/analyze
router.post('/analyze', async (_req: Request, res: Response) => {
  try {
    // Fetch all prospects with their interaction data
    const prospectsResult = await pool.query(
      `SELECT p.id, p.company_name, p.contact_name, p.locality, p.type, p.status,
              p.notes, p.created_at, p.updated_at,
              u.name as assigned_user_name,
              (SELECT date_interaction FROM interactions WHERE prospect_id = p.id ORDER BY date_interaction DESC LIMIT 1) as last_interaction_date,
              (SELECT type FROM interactions WHERE prospect_id = p.id ORDER BY date_interaction DESC LIMIT 1) as last_interaction_type,
              (SELECT compte_rendu FROM interactions WHERE prospect_id = p.id ORDER BY date_interaction DESC LIMIT 1) as last_compte_rendu,
              (SELECT COUNT(*) FROM interactions WHERE prospect_id = p.id) as interaction_count
       FROM prospects p
       LEFT JOIN users u ON p.assigned_to = u.id
       WHERE p.status NOT IN ('client_actif', 'perdu')
       ORDER BY p.updated_at DESC`
    );

    const prospects = prospectsResult.rows;

    if (prospects.length === 0) {
      res.json({
        data: {
          recommendations: [],
          analysis_summary: 'Aucun prospect actif à analyser.',
        },
        message: 'Analysis completed',
      });
      return;
    }

    const prospectsJson = JSON.stringify(
      prospects.map((p) => ({
        id: p.id,
        company_name: p.company_name,
        contact_name: p.contact_name,
        locality: p.locality,
        type: p.type,
        status: p.status,
        notes: p.notes,
        last_interaction_date: p.last_interaction_date,
        last_interaction_type: p.last_interaction_type,
        last_compte_rendu: p.last_compte_rendu,
        interaction_count: p.interaction_count,
        days_since_creation: Math.floor(
          (Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24)
        ),
        days_since_last_interaction: p.last_interaction_date
          ? Math.floor(
              (Date.now() - new Date(p.last_interaction_date).getTime()) / (1000 * 60 * 60 * 24)
            )
          : null,
      })),
      null,
      2
    );

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system:
        'Tu es un expert commercial. Analyse les prospects et recommande les 5 prioritaires basé sur leur potentiel de conversion. Réponds en JSON avec le format: {"recommendations": [{"prospect_id": number, "company_name": string, "priority_score": number, "reasoning": string, "suggested_action": string}], "analysis_summary": string}',
      messages: [
        {
          role: 'user',
          content: `Voici la liste des prospects actifs de Paris Éclat CRM:\n\n${prospectsJson}\n\nAnalyse ces prospects et identifie les 5 à prioriser pour maximiser les conversions. Considère le statut, la fréquence des interactions, le temps écoulé depuis la dernière interaction, et les notes disponibles.`,
        },
      ],
    });

    const contentBlock = message.content[0];
    if (contentBlock.type !== 'text') {
      throw new Error('Unexpected response type from AI');
    }
    const responseText = contentBlock.text;

    // Parse JSON from response
    let analysisResult: {
      recommendations: Array<{
        prospect_id: number;
        company_name: string;
        priority_score: number;
        reasoning: string;
        suggested_action: string;
      }>;
      analysis_summary: string;
    };

    try {
      // Extract JSON from the response text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch {
      // Fallback: create a basic response if parsing fails
      analysisResult = {
        recommendations: prospects.slice(0, 5).map((p, index) => ({
          prospect_id: p.id,
          company_name: p.company_name,
          priority_score: 10 - index * 2,
          reasoning: `${p.company_name} est en statut "${p.status}" avec ${p.interaction_count} interactions.`,
          suggested_action: 'Prendre contact rapidement pour faire avancer le dossier.',
        })),
        analysis_summary: 'Analyse basée sur les données disponibles.',
      };
    }

    res.json({
      data: analysisResult,
      message: 'Analysis completed successfully',
    });
  } catch (error) {
    console.error('AI analyze error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to analyze prospects. Please check your API key.',
    });
  }
});

// POST /api/agents/draft-email
router.post('/draft-email', async (req: Request, res: Response) => {
  const { prospect_id } = req.body;

  if (!prospect_id) {
    res.status(400).json({ error: 'Bad Request', message: 'prospect_id is required' });
    return;
  }

  try {
    const prospectResult = await pool.query(
      `SELECT p.*, u.name as assigned_user_name,
              (SELECT compte_rendu FROM interactions WHERE prospect_id = p.id ORDER BY date_interaction DESC LIMIT 1) as last_compte_rendu,
              (SELECT type FROM interactions WHERE prospect_id = p.id ORDER BY date_interaction DESC LIMIT 1) as last_interaction_type,
              (SELECT date_interaction FROM interactions WHERE prospect_id = p.id ORDER BY date_interaction DESC LIMIT 1) as last_interaction_date,
              (SELECT next_action FROM interactions WHERE prospect_id = p.id ORDER BY date_interaction DESC LIMIT 1) as next_action
       FROM prospects p
       LEFT JOIN users u ON p.assigned_to = u.id
       WHERE p.id = $1`,
      [prospect_id]
    );

    if (prospectResult.rows.length === 0) {
      res.status(404).json({ error: 'Not Found', message: 'Prospect not found' });
      return;
    }

    const prospect = prospectResult.rows[0];

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system:
        'Tu es un commercial expert. Rédige des emails de suivi professionnels et personnalisés en français pour relancer des prospects. Réponds avec un email formaté incluant l\'objet et le corps du message.',
      messages: [
        {
          role: 'user',
          content: `Rédige un email de suivi pour ce prospect:

Entreprise: ${prospect.company_name}
Contact: ${prospect.contact_name || 'Non renseigné'}
Email: ${prospect.email || 'Non renseigné'}
Type: ${prospect.type || 'Non renseigné'}
Localité: ${prospect.locality || 'Non renseigné'}
Statut: ${prospect.status}
Notes: ${prospect.notes || 'Aucune note'}
Dernière interaction (${prospect.last_interaction_type || 'aucune'}): ${prospect.last_compte_rendu || 'Aucune interaction précédente'}
Prochaine action prévue: ${prospect.next_action || 'Non définie'}
Commercial assigné: ${prospect.assigned_user_name || 'Non assigné'}

L'email doit être professionnel, chaleureux et personnalisé. Inclus un objet accrocheur et un corps d'email avec une proposition de valeur claire.`,
        },
      ],
    });

    const contentBlock = message.content[0];
    if (contentBlock.type !== 'text') {
      throw new Error('Unexpected response type from AI');
    }

    res.json({
      data: {
        email_draft: contentBlock.text,
        prospect: {
          id: prospect.id,
          company_name: prospect.company_name,
          contact_name: prospect.contact_name,
          email: prospect.email,
        },
      },
      message: 'Email draft generated successfully',
    });
  } catch (error) {
    console.error('Draft email error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to generate email draft. Please check your API key.',
    });
  }
});

export default router;
