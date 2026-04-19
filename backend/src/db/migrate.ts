import pool from './index';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

async function migrate() {
  const client = await pool.connect();

  try {
    console.log('Running migrations...');

    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'commercial',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS prospects (
        id SERIAL PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        contact_name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        locality VARCHAR(255),
        type VARCHAR(100),
        status VARCHAR(50) NOT NULL DEFAULT 'prospect_brut',
        notes TEXT,
        assigned_to INTEGER REFERENCES users(id),
        linkedin_url VARCHAR(500),
        siren VARCHAR(20),
        address TEXT,
        enriched_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        prospect_id INTEGER REFERENCES prospects(id),
        company_name VARCHAR(255) NOT NULL,
        contact_name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        contract_value DECIMAL(10,2),
        contract_start DATE,
        contract_end DATE,
        status VARCHAR(50) DEFAULT 'actif',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS interactions (
        id SERIAL PRIMARY KEY,
        prospect_id INTEGER REFERENCES prospects(id),
        user_id INTEGER REFERENCES users(id),
        type VARCHAR(50) NOT NULL,
        date_interaction TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        compte_rendu TEXT NOT NULL,
        next_action TEXT,
        next_action_date DATE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    console.log('Tables created successfully.');

    // Check if seed data already exists
    const existingUsers = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(existingUsers.rows[0].count) > 0) {
      console.log('Seed data already exists. Skipping...');
      return;
    }

    // Seed users
    const faridHash = await bcrypt.hash('farid123', 10);
    const olivierHash = await bcrypt.hash('olivier123', 10);

    const faridResult = await client.query(
      `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id`,
      ['farid@pariseclat.com', faridHash, 'Farid Benali', 'directeur']
    );

    const olivierResult = await client.query(
      `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id`,
      ['olivier@pariseclat.com', olivierHash, 'Olivier Dupont', 'commercial']
    );

    const faridId = faridResult.rows[0].id;
    const olivierId = olivierResult.rows[0].id;

    console.log('Users seeded.');

    // Seed prospects
    const prospectsData = [
      {
        company_name: 'Padel Club Paris 16',
        contact_name: 'Marc Lefevre',
        email: 'marc.lefevre@padelclub16.fr',
        phone: '+33 1 45 23 67 89',
        locality: 'Paris 16ème',
        type: 'padel',
        status: 'prospect_brut',
        notes: 'Club de padel premium, ouvert en 2022. 6 courts couverts.',
        assigned_to: olivierId,
      },
      {
        company_name: 'Fitness Zen Boulogne',
        contact_name: 'Sophie Martin',
        email: 'sophie.martin@fitneszen.fr',
        phone: '+33 1 46 99 12 34',
        locality: 'Boulogne-Billancourt',
        type: 'fitness',
        status: 'premier_contact',
        notes: 'Salle de fitness haut de gamme, 500 adhérents actifs.',
        assigned_to: olivierId,
      },
      {
        company_name: 'Hôtel Le Marais Prestige',
        contact_name: 'Jean-Pierre Dubois',
        email: 'jp.dubois@lemarais-prestige.fr',
        phone: '+33 1 42 77 88 99',
        locality: 'Paris 3ème',
        type: 'hotel',
        status: 'rdv_fixe',
        notes: 'Hôtel 4 étoiles, spa intégré, 80 chambres.',
        assigned_to: faridId,
      },
      {
        company_name: 'CrossFit République',
        contact_name: 'Antoine Bernard',
        email: 'a.bernard@crossfit-republique.fr',
        phone: '+33 1 43 55 21 76',
        locality: 'Paris 11ème',
        type: 'fitness',
        status: 'devis_envoye',
        notes: 'Box CrossFit en pleine expansion, 3 coachs certifiés.',
        assigned_to: olivierId,
      },
      {
        company_name: 'Padel Arena Vincennes',
        contact_name: 'Claire Moreau',
        email: 'claire.moreau@padelarena-vincennes.fr',
        phone: '+33 1 43 28 91 45',
        locality: 'Vincennes',
        type: 'padel',
        status: 'client_actif',
        notes: 'Premier client padel converti. Très satisfait du service.',
        assigned_to: olivierId,
      },
      {
        company_name: 'Spa & Bien-être Versailles',
        contact_name: 'Isabelle Rousseau',
        email: 'i.rousseau@spa-versailles.fr',
        phone: '+33 1 39 50 44 22',
        locality: 'Versailles',
        type: 'spa',
        status: 'prospect_brut',
        notes: 'Centre de bien-être haut de gamme, clientèle aisée.',
        assigned_to: faridId,
      },
      {
        company_name: 'Tennis Club de Saint-Cloud',
        contact_name: 'François Petit',
        email: 'f.petit@tc-saintcloud.fr',
        phone: '+33 1 47 71 35 68',
        locality: 'Saint-Cloud',
        type: 'tennis',
        status: 'premier_contact',
        notes: '12 courts de tennis, école de tennis, 800 membres.',
        assigned_to: olivierId,
      },
      {
        company_name: 'Hôtel Spa Enghien-les-Bains',
        contact_name: 'Marie-Claire Fontaine',
        email: 'mc.fontaine@hotel-enghien.fr',
        phone: '+33 1 39 34 10 00',
        locality: 'Enghien-les-Bains',
        type: 'hotel',
        status: 'client_actif',
        notes: 'Hôtel thermal 5 étoiles, casino adjacent.',
        assigned_to: faridId,
      },
      {
        company_name: 'Padel Factory Courbevoie',
        contact_name: 'Théo Garnier',
        email: 't.garnier@padelfactory.fr',
        phone: '+33 1 47 89 56 23',
        locality: 'Courbevoie',
        type: 'padel',
        status: 'perdu',
        notes: 'Contact perdu suite à changement de direction.',
        assigned_to: olivierId,
      },
      {
        company_name: 'Sport & Santé Neuilly',
        contact_name: 'Nathalie Leblanc',
        email: 'n.leblanc@sportssante-neuilly.fr',
        phone: '+33 1 46 24 78 90',
        locality: 'Neuilly-sur-Seine',
        type: 'fitness',
        status: 'rdv_fixe',
        notes: 'Club premium avec piscine privée. RDV fixé pour le 25 avril.',
        assigned_to: olivierId,
      },
    ];

    const prospectIds: number[] = [];
    for (const prospect of prospectsData) {
      const result = await client.query(
        `INSERT INTO prospects (company_name, contact_name, email, phone, locality, type, status, notes, assigned_to)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [
          prospect.company_name,
          prospect.contact_name,
          prospect.email,
          prospect.phone,
          prospect.locality,
          prospect.type,
          prospect.status,
          prospect.notes,
          prospect.assigned_to,
        ]
      );
      prospectIds.push(result.rows[0].id);
    }

    console.log('Prospects seeded.');

    // Seed clients (from converted prospects)
    const clientsData = [
      {
        prospect_id: prospectIds[4], // Padel Arena Vincennes
        company_name: 'Padel Arena Vincennes',
        contact_name: 'Claire Moreau',
        email: 'claire.moreau@padelarena-vincennes.fr',
        phone: '+33 1 43 28 91 45',
        contract_value: 24000.0,
        contract_start: '2024-01-01',
        contract_end: '2024-12-31',
        status: 'actif',
        notes: 'Contrat annuel. Renouvellement prévu en décembre.',
      },
      {
        prospect_id: prospectIds[7], // Hôtel Spa Enghien
        company_name: 'Hôtel Spa Enghien-les-Bains',
        contact_name: 'Marie-Claire Fontaine',
        email: 'mc.fontaine@hotel-enghien.fr',
        phone: '+33 1 39 34 10 00',
        contract_value: 48000.0,
        contract_start: '2023-06-01',
        contract_end: '2025-05-31',
        status: 'actif',
        notes: 'Contrat 2 ans. Client stratégique, priorité renouvellement.',
      },
      {
        prospect_id: null,
        company_name: 'Club Med Gym Opéra',
        contact_name: 'Philippe Renard',
        email: 'p.renard@clubmedgym.fr',
        phone: '+33 1 42 97 48 15',
        contract_value: 36000.0,
        contract_start: '2024-03-01',
        contract_end: '2025-02-28',
        status: 'renouvellement',
        notes: 'En cours de négociation pour renouvellement avec augmentation de tarif.',
      },
    ];

    for (const client of clientsData) {
      await client_query_helper(client, client);
    }

    async function client_query_helper(clientData: typeof clientsData[0], _unused: unknown) {
      await client.query(
        `INSERT INTO clients (prospect_id, company_name, contact_name, email, phone, contract_value, contract_start, contract_end, status, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          clientData.prospect_id,
          clientData.company_name,
          clientData.contact_name,
          clientData.email,
          clientData.phone,
          clientData.contract_value,
          clientData.contract_start,
          clientData.contract_end,
          clientData.status,
          clientData.notes,
        ]
      );
    }

    console.log('Clients seeded.');

    // Seed interactions
    const interactionsData = [
      {
        prospect_id: prospectIds[1], // Fitness Zen
        user_id: olivierId,
        type: 'appel',
        date_interaction: new Date(Date.now() - 7 * 24 * 3600 * 1000),
        compte_rendu: 'Premier appel de prise de contact. Sophie Martin très intéressée par notre offre. Elle demande une plaquette commerciale.',
        next_action: 'Envoyer plaquette commerciale par email',
        next_action_date: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString().split('T')[0],
      },
      {
        prospect_id: prospectIds[2], // Hôtel Le Marais
        user_id: faridId,
        type: 'rdv',
        date_interaction: new Date(Date.now() - 3 * 24 * 3600 * 1000),
        compte_rendu: 'Réunion dans les locaux de l\'hôtel. Direction très intéressée. Besoin d\'une solution pour gérer leurs membres spa.',
        next_action: 'Préparer devis personnalisé pour 150 membres',
        next_action_date: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().split('T')[0],
      },
      {
        prospect_id: prospectIds[3], // CrossFit République
        user_id: olivierId,
        type: 'email',
        date_interaction: new Date(Date.now() - 2 * 24 * 3600 * 1000),
        compte_rendu: 'Devis envoyé par email pour 200 membres. Tarif négocié à 12€/mois/membre. En attente de retour.',
        next_action: 'Relancer si pas de réponse sous 5 jours',
        next_action_date: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split('T')[0],
      },
      {
        prospect_id: prospectIds[4], // Padel Arena Vincennes (client)
        user_id: olivierId,
        type: 'appel',
        date_interaction: new Date(Date.now() - 14 * 24 * 3600 * 1000),
        compte_rendu: 'Appel de suivi mensuel. Tout se passe bien. Claire très satisfaite du service. Pense à nous recommander.',
        next_action: 'Envoyer offre de parrainage',
        next_action_date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
      },
      {
        prospect_id: prospectIds[6], // Tennis Club
        user_id: olivierId,
        type: 'appel',
        date_interaction: new Date(Date.now() - 5 * 24 * 3600 * 1000),
        compte_rendu: 'Appel de découverte. François Petit intéressé mais doit en parler au comité directeur. Réunion prévue en interne.',
        next_action: 'Rappeler dans 2 semaines après réunion du comité',
        next_action_date: new Date(Date.now() + 9 * 24 * 3600 * 1000).toISOString().split('T')[0],
      },
      {
        prospect_id: prospectIds[9], // Sport & Santé Neuilly
        user_id: olivierId,
        type: 'note',
        date_interaction: new Date(Date.now() - 1 * 24 * 3600 * 1000),
        compte_rendu: 'RDV confirmé pour le 25 avril à 14h dans leurs locaux. Nathalie Leblanc sera accompagnée du DG.',
        next_action: 'Préparer présentation complète et démo',
        next_action_date: new Date(Date.now() + 6 * 24 * 3600 * 1000).toISOString().split('T')[0],
      },
    ];

    for (const interaction of interactionsData) {
      await client.query(
        `INSERT INTO interactions (prospect_id, user_id, type, date_interaction, compte_rendu, next_action, next_action_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          interaction.prospect_id,
          interaction.user_id,
          interaction.type,
          interaction.date_interaction,
          interaction.compte_rendu,
          interaction.next_action,
          interaction.next_action_date,
        ]
      );
    }

    console.log('Interactions seeded.');
    console.log('Migration completed successfully!');
    console.log('\nDemo credentials:');
    console.log('  Directeur - farid@pariseclat.com / farid123');
    console.log('  Commercial - olivier@pariseclat.com / olivier123');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
