import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// System roles organized by category (based on the roleSuggestions from components)
const systemRoles = [
  // Official
  { name: 'Chairperson', category: 'official', isSystem: true },
  { name: 'Commissioner', category: 'official', isSystem: true },
  { name: 'Legal Counsel', category: 'official', isSystem: true },
  { name: 'Investigator', category: 'official', isSystem: true },
  { name: 'Clerk', category: 'official', isSystem: true },
  
  // Law Enforcement
  { name: 'Police Commissioner', category: 'law_enforcement', isSystem: true },
  { name: 'Lieutenant', category: 'law_enforcement', isSystem: true },
  { name: 'Detective', category: 'law_enforcement', isSystem: true },
  { name: 'Hawks Officer', category: 'law_enforcement', isSystem: true },
  { name: 'Private Investigator', category: 'law_enforcement', isSystem: true },
  
  // Political
  { name: 'Minister', category: 'political', isSystem: true },
  { name: 'Member of Parliament', category: 'political', isSystem: true },
  { name: 'Political Advisor', category: 'political', isSystem: true },
  { name: 'Political Fixer', category: 'political', isSystem: true },
  { name: 'Delegate', category: 'political', isSystem: true },
  
  // Business
  { name: 'CEO', category: 'business', isSystem: true },
  { name: 'Director', category: 'business', isSystem: true },
  { name: 'CFO', category: 'business', isSystem: true },
  { name: 'Board Member', category: 'business', isSystem: true },
  { name: 'Shareholder', category: 'business', isSystem: true },
  { name: 'Company', category: 'business', isSystem: true },
  
  // Witness
  { name: 'Whistleblower', category: 'witness', isSystem: true },
  { name: 'Expert Witness', category: 'witness', isSystem: true },
  { name: 'Character Witness', category: 'witness', isSystem: true },
  { name: 'General Witness', category: 'witness', isSystem: true },
  
  // Suspect
  { name: 'Accused', category: 'suspect', isSystem: true },
  { name: 'Crime Boss', category: 'suspect', isSystem: true },
  { name: 'Associate', category: 'suspect', isSystem: true },
  { name: 'Enabler', category: 'suspect', isSystem: true },
  
  // Victim
  { name: 'Victim', category: 'victim', isSystem: true },
  { name: 'Target', category: 'victim', isSystem: true },
  { name: 'Affected Party', category: 'victim', isSystem: true },
  
  // Civilian
  { name: 'Journalist', category: 'civilian', isSystem: true },
  { name: 'Activist', category: 'civilian', isSystem: true },
  { name: 'Civilian', category: 'civilian', isSystem: true },
  { name: 'Informant', category: 'civilian', isSystem: true },
  
  // Special roles
  { name: 'Root', category: 'official', isSystem: true },
  { name: 'Advocate', category: 'official', isSystem: true },
];

const relationshipTypes = [
  // Financial
  { name: 'Bribed', category: 'Financial' },
  { name: 'Paid Kickback', category: 'Financial' },
  { name: 'Awarded Tender', category: 'Financial' },
  { name: 'Received Payment', category: 'Financial' },
  { name: 'Money Laundering', category: 'Financial' },

  // Legal/Testimony
  { name: 'Testified Against', category: 'Legal/Testimony' },
  { name: 'Implicated', category: 'Legal/Testimony' },
  { name: 'Accused', category: 'Legal/Testimony' },
  { name: 'Investigated', category: 'Legal/Testimony' },
  { name: 'Arrested', category: 'Legal/Testimony' },

  // Organizational
  { name: 'Worked For', category: 'Organizational' },
  { name: 'Supervised', category: 'Organizational' },
  { name: 'Reported To', category: 'Organizational' },
  { name: 'Partnered With', category: 'Organizational' },
  { name: 'Director Of', category: 'Organizational' },

  // Personal
  { name: 'Related To', category: 'Personal' },
  { name: 'Associated With', category: 'Personal' },
  { name: 'Friend Of', category: 'Personal' },
  { name: 'Influenced', category: 'Personal' },
];

async function main() {
  console.log('🌱 Starting seed...');
  
  // Create or update system roles (Upsert to avoid FK errors with existing nodes)
  console.log('📝 Upserting system roles...');
  for (const role of systemRoles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: role,
      create: role,
    });
  }

  // Clear existing relationships (Safe because no FKs yet)
  console.log('🗑️  Clearing existing relationship types...');
  await prisma.relationshipType.deleteMany({});

  // Create relationship types
  console.log('📝 Creating relationship types...');
  for (const rel of relationshipTypes) {
    await prisma.relationshipType.create({
      data: rel,
    });
  }

  // Event Types
  const eventTypes = [
      { name: 'Arrest', icon: 'Handcuffs', color: '#ef4444' }, // Red
      { name: 'Accusation', icon: 'AlertTriangle', color: '#f97316' }, // Orange
      { name: 'Death', icon: 'Skull', color: '#18181b' }, // Black
      { name: 'Meeting', icon: 'Users', color: '#3b82f6' }, // Blue
      { name: 'Testimony', icon: 'FileText', color: '#8b5cf6' }, // Purple
      { name: 'Appointment', icon: 'Briefcase', color: '#10b981' }, // Green
      { name: 'Resignation', icon: 'LogOut', color: '#6b7280' }, // Gray
      { name: 'Other', icon: 'HelpCircle', color: '#9ca3af' }, // Light Gray
  ];

  console.log('📝 Upserting event types...');
  for (const et of eventTypes) {
      await prisma.eventType.upsert({
          where: { name: et.name },
          update: et,
          create: et,
      });
  }
  
  console.log(`✅ Created ${systemRoles.length} system roles`);
  
  // Display roles grouped by category
  const rolesByCategory = await prisma.role.groupBy({
    by: ['category'],
    _count: { category: true },
  });
  
  console.log('\n📊 Roles by category:');
  for (const group of rolesByCategory) {
    console.log(`  ${group.category}: ${group._count.category} roles`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
