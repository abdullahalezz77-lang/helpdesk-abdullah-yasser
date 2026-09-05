import { PrismaClient, Role, TicketPriority, TicketStatus, HistoryEventType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Starting database seed...');

  // 1. Seed Categories
  const categoriesData = [
    { name: 'IT', description: 'Hardware, software, network, access, and computer issues' },
    { name: 'HR', description: 'Human resources, benefits, onboarding, and payroll queries' },
    { name: 'Facilities', description: 'Office maintenance, equipment, repairs, and badges' },
    { name: 'Finance', description: 'Expense reporting, vendor billing, and purchasing' },
    { name: 'Other', description: 'General operational inquiries and administrative help' },
  ];

  const categoriesMap = new Map<string, string>();
  for (const cat of categoriesData) {
    const category = await prisma.category.upsert({
      where: { name: cat.name },
      update: { description: cat.description },
      create: { name: cat.name, description: cat.description },
    });
    categoriesMap.set(cat.name, category.id);
  }
  console.log(`[Seed] Seeded ${categoriesData.length} categories.`);

  // 2. Seed Users
  const defaultPasswordHash = await bcrypt.hash('Password123!', 10);

  const usersData = [
    {
      email: 'employee@helpdesk-lite.local',
      name: 'Jane Doe',
      role: Role.EMPLOYEE,
      passwordHash: defaultPasswordHash,
    },
    {
      email: 'support1@helpdesk-lite.local',
      name: 'Alex Smith',
      role: Role.SUPPORT,
      passwordHash: defaultPasswordHash,
    },
    {
      email: 'support2@helpdesk-lite.local',
      name: 'Sam Wilson',
      role: Role.SUPPORT,
      passwordHash: defaultPasswordHash,
    },
    {
      email: 'manager@helpdesk-lite.local',
      name: 'Morgan Vance',
      role: Role.MANAGER,
      passwordHash: defaultPasswordHash,
    },
  ];

  const usersMap = new Map<string, string>();
  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role },
      create: u,
    });
    usersMap.set(u.email, user.id);
  }
  console.log(`[Seed] Seeded ${usersData.length} users with credentials (password: Password123!).`);

  // 3. Seed Sample Tickets
  const employeeId = usersMap.get('employee@helpdesk-lite.local')!;
  const support1Id = usersMap.get('support1@helpdesk-lite.local')!;
  const itCatId = categoriesMap.get('IT')!;
  const facilitiesCatId = categoriesMap.get('Facilities')!;

  // Ticket 1: NEW unassigned
  const t1 = await prisma.ticket.upsert({
    where: { ticketNumber: 'HD-000001' },
    update: {},
    create: {
      ticketNumber: 'HD-000001',
      title: 'Secondary monitor flickering when connected via HDMI',
      description: 'The Dell external display flickers black every few minutes while working.',
      categoryId: itCatId,
      priority: TicketPriority.MEDIUM,
      status: TicketStatus.NEW,
      requesterId: employeeId,
      history: {
        create: {
          actorId: employeeId,
          eventType: HistoryEventType.TICKET_CREATED,
          newValue: 'Ticket created in NEW status',
          reason: 'Initial submission',
        },
      },
    },
  });

  // Ticket 2: IN_PROGRESS assigned to support1
  const t2 = await prisma.ticket.upsert({
    where: { ticketNumber: 'HD-000002' },
    update: {},
    create: {
      ticketNumber: 'HD-000002',
      title: 'Desk chair pneumatic cylinder sinking',
      description: 'Office chair does not stay at adjusted height.',
      categoryId: facilitiesCatId,
      priority: TicketPriority.LOW,
      status: TicketStatus.IN_PROGRESS,
      requesterId: employeeId,
      assigneeId: support1Id,
      history: {
        createMany: {
          data: [
            {
              actorId: employeeId,
              eventType: HistoryEventType.TICKET_CREATED,
              newValue: 'Ticket created',
              reason: 'Initial submission',
            },
            {
              actorId: support1Id,
              eventType: HistoryEventType.TICKET_ASSIGNED,
              newValue: 'Alex Smith',
              reason: 'Claimed by handler',
            },
            {
              actorId: support1Id,
              eventType: HistoryEventType.STATUS_CHANGED,
              oldValue: TicketStatus.NEW,
              newValue: TicketStatus.IN_PROGRESS,
              reason: 'Started inspection',
            },
          ],
        },
      },
    },
  });

  console.log(`[Seed] Seeded sample tickets: ${t1.ticketNumber}, ${t2.ticketNumber}`);
  console.log('[Seed] Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('[Seed] Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
