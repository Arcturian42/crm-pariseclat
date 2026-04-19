import dotenv from 'dotenv';

dotenv.config();

interface ProspectData {
  company_name: string;
  locality?: string;
  type?: string;
  email?: string;
  phone?: string;
}

interface EnrichedData {
  phone: string | null;
  linkedin_url: string | null;
  siren: string | null;
  address: string | null;
  employee_count?: number;
  revenue_range?: string;
  website?: string;
  enrichment_source: string;
}

/**
 * Clay API enrichment service.
 * Returns realistic mock data structured as if it came from Clay API.
 */
export async function enrichProspect(prospect: ProspectData): Promise<EnrichedData> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  const companySlug = prospect.company_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  // Generate realistic French phone numbers
  const areaCode = ['01', '02', '03', '04', '05', '06', '07', '09'][Math.floor(Math.random() * 8)];
  const phoneNumber = `+33 ${areaCode.slice(1)} ${generatePhoneGroup()} ${generatePhoneGroup()} ${generatePhoneGroup()} ${generatePhoneGroup()}`;

  // Generate SIREN number (9 digits, French company identifier)
  const siren = generateSiren();

  // Generate LinkedIn URL based on company name
  const linkedinSlug = companySlug.substring(0, 30);
  const linkedinUrl = `https://www.linkedin.com/company/${linkedinSlug}`;

  // Generate address based on locality
  const streetNumbers = ['12', '25', '47', '8', '156', '3', '89', '204', '17', '64'];
  const streetTypes = ['Rue', 'Avenue', 'Boulevard', 'Place', 'Impasse'];
  const streetNames = [
    'de la Paix', 'du Commerce', 'du Sport', 'des Entrepreneurs', 'Victor Hugo',
    'Léon Blum', 'Jean Jaurès', 'de la République', 'du Général de Gaulle', 'des Lilas',
  ];
  const postalCodes: Record<string, string> = {
    'Paris 16ème': '75016',
    'Boulogne-Billancourt': '92100',
    'Paris 3ème': '75003',
    'Paris 11ème': '75011',
    'Vincennes': '94300',
    'Versailles': '78000',
    'Saint-Cloud': '92210',
    'Enghien-les-Bains': '95880',
    'Courbevoie': '92400',
    'Neuilly-sur-Seine': '92200',
  };

  const streetNum = streetNumbers[Math.floor(Math.random() * streetNumbers.length)];
  const streetType = streetTypes[Math.floor(Math.random() * streetTypes.length)];
  const streetName = streetNames[Math.floor(Math.random() * streetNames.length)];
  const postalCode = postalCodes[prospect.locality || ''] || '75001';
  const city = prospect.locality || 'Paris';
  const address = `${streetNum} ${streetType} ${streetName}, ${postalCode} ${city}`;

  // Employee count estimate based on type
  const employeeCounts: Record<string, number> = {
    hotel: Math.floor(Math.random() * 80) + 20,
    fitness: Math.floor(Math.random() * 30) + 5,
    padel: Math.floor(Math.random() * 15) + 3,
    spa: Math.floor(Math.random() * 20) + 5,
    tennis: Math.floor(Math.random() * 25) + 8,
  };

  const employeeCount = employeeCounts[prospect.type || 'fitness'] || Math.floor(Math.random() * 30) + 5;

  return {
    phone: prospect.phone ? null : phoneNumber, // Don't overwrite if exists
    linkedin_url: linkedinUrl,
    siren: siren,
    address: address,
    employee_count: employeeCount,
    revenue_range: getRevenueRange(employeeCount),
    website: `https://www.${companySlug}.fr`,
    enrichment_source: 'Clay API (mock)',
  };
}

function generatePhoneGroup(): string {
  return String(Math.floor(Math.random() * 90) + 10);
}

function generateSiren(): string {
  let siren = '';
  for (let i = 0; i < 9; i++) {
    siren += Math.floor(Math.random() * 10);
  }
  return siren;
}

function getRevenueRange(employeeCount: number): string {
  if (employeeCount < 10) return '< 500K€';
  if (employeeCount < 25) return '500K€ - 2M€';
  if (employeeCount < 50) return '2M€ - 10M€';
  if (employeeCount < 100) return '10M€ - 50M€';
  return '> 50M€';
}
