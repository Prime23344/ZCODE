import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Kenyan counties for realistic data
const COUNTIES = ['Nairobi', 'Kiambu', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Machakos'];

// Initial service categories (Kenya-relevant, ~18)
const CATEGORIES = [
  { name: 'Plumbing', slug: 'plumbing', icon: '🔧', description: 'Pipes, taps, drains, water systems' },
  { name: 'Electrical', slug: 'electrical', icon: '⚡', description: 'Wiring, repairs, installations' },
  { name: 'Cleaning', slug: 'cleaning', icon: '🧹', description: 'Home & office cleaning' },
  { name: 'Moving & Transport', slug: 'moving-transport', icon: '🚚', description: 'House moving, deliveries' },
  { name: 'Tutoring', slug: 'tutoring', icon: '📚', description: 'Academic & skills tutoring' },
  { name: 'Beauty & Hair', slug: 'beauty-hair', icon: '💇', description: 'Salon, barber, makeup' },
  { name: 'Appliance Repair', slug: 'appliance-repair', icon: '🛠️', description: 'Fridge, washing machine, microwave' },
  { name: 'Painting', slug: 'painting', icon: '🎨', description: 'Interior & exterior painting' },
  { name: 'Carpentry', slug: 'carpentry', icon: '🪚', description: 'Furniture, fittings, repairs' },
  { name: 'Gardening & Landscaping', slug: 'gardening', icon: '🌱', description: 'Lawns, trees, landscaping' },
  { name: 'Pest Control', slug: 'pest-control', icon: '🐜', description: 'Fumigation & pest management' },
  { name: 'Photography & Video', slug: 'photography', icon: '📷', description: 'Events, portraits, commercial' },
  { name: 'Event Planning', slug: 'event-planning', icon: '🎉', description: 'Weddings, parties, corporate' },
  { name: 'Catering & Cooking', slug: 'catering', icon: '🍽️', description: 'Events, private chef, meal prep' },
  { name: 'Laundry & Dry Cleaning', slug: 'laundry', icon: '👕', description: 'Wash, fold, dry clean' },
  { name: 'Security Installation', slug: 'security', icon: '🔒', description: 'CCTV, alarms, access control' },
  { name: 'AC & Refrigeration', slug: 'ac-refrigeration', icon: '❄️', description: 'AC install, service, repair' },
  { name: 'Phone & Computer Repair', slug: 'tech-repair', icon: '📱', description: 'Phone, laptop, tablet repair' },
];

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Categories ────────────────────────────────────────────
  console.log('  → Creating categories...');
  for (const cat of CATEGORIES) {
    await prisma.serviceCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { ...cat, countryCode: 'KE' },
    });
  }
  const allCategories = await prisma.serviceCategory.findMany();

  // ─── Admin User ────────────────────────────────────────────
  console.log('  → Creating admin user...');
  const admin = await prisma.user.upsert({
    where: { phone: '+254700000000' },
    update: {},
    create: {
      phone: '+254700000000',
      fullName: 'System Admin',
      email: 'admin@surety.co.ke',
      role: 'ADMIN',
      countryCode: 'KE',
    },
  });

  // ─── Customers ─────────────────────────────────────────────
  console.log('  → Creating customers...');
  const customerData = [
    { phone: '+254711111111', fullName: 'Wanjiku Kamau', email: 'wanjiku@example.com' },
    { phone: '+254722222222', fullName: 'Otieno Ochieng', email: 'otieno@example.com' },
    { phone: '+254733333333', fullName: 'Aisha Mohammed', email: 'aisha@example.com' },
  ];
  const customers = [];
  for (const c of customerData) {
    const user = await prisma.user.upsert({
      where: { phone: c.phone },
      update: {},
      create: { ...c, role: 'CUSTOMER', countryCode: 'KE' },
    });
    customers.push(user);
  }

  // ─── Providers ─────────────────────────────────────────────
  console.log('  → Creating providers...');
  const providerData = [
    {
      phone: '+254744444444', fullName: 'James Mwangi', email: 'james@example.com',
      bio: 'Certified electrician with 8 years experience. Nairobi-based, available across the city.',
      county: 'Nairobi', status: 'VERIFIED', categories: ['electrical', 'security'],
    },
    {
      phone: '+254755555555', fullName: 'Grace Wairimu', email: 'grace@example.com',
      bio: 'Professional plumber serving Kiambu and Nairobi. Emergency calls welcome.',
      county: 'Kiambu', status: 'VERIFIED', categories: ['plumbing'],
    },
    {
      phone: '+254766666666', fullName: 'Peter Njoroge', email: 'peter@example.com',
      bio: 'Painter and decorator. Quality finishes for homes and offices.',
      county: 'Nairobi', status: 'PENDING_VERIFICATION', categories: ['painting', 'carpentry'],
    },
    {
      phone: '+254777777777', fullName: 'Fatuma Hassan', email: 'fatuma@example.com',
      bio: 'Cleaning services for homes and offices. Reliable and thorough.',
      county: 'Mombasa', status: 'REJECTED', categories: ['cleaning', 'laundry'],
      rejectionReason: 'ID document unclear. Please re-upload a clear photo.',
    },
    {
      phone: '+254788888888', fullName: 'David Kiprop', email: 'david@example.com',
      bio: 'Phone and computer repair technician. Quick turnarounds.',
      county: 'Eldoret', status: 'UNVERIFIED', categories: ['tech-repair'],
    },
  ];

  const providers = [];
  for (const p of providerData) {
    const { bio, county, status, categories: catSlugs, rejectionReason, ...userData } = p;
    const user = await prisma.user.upsert({
      where: { phone: userData.phone },
      update: {},
      create: { ...userData, role: 'PROVIDER', countryCode: 'KE' },
    });

    const provider = await prisma.provider.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        bio,
        county,
        location: `${county}, Kenya`,
        verificationStatus: status,
        verificationRejectionReason: rejectionReason || null,
        averageRating: status === 'VERIFIED' ? 4.5 + Math.random() * 0.4 : 0,
        ratingCount: status === 'VERIFIED' ? Math.floor(Math.random() * 20) + 3 : 0,
        responseTimeMinutes: status === 'VERIFIED' ? Math.floor(Math.random() * 120) + 15 : null,
        countryCode: 'KE',
      },
    });

    // Assign categories
    for (const slug of catSlugs) {
      const cat = allCategories.find((c) => c.slug === slug);
      if (cat) {
        await prisma.providerCategory.upsert({
          where: { providerId_categoryId: { providerId: provider.id, categoryId: cat.id } },
          update: {},
          create: { providerId: provider.id, categoryId: cat.id },
        });
      }
    }

    // Add a verification document for pending/rejected
    if (status === 'PENDING_VERIFICATION' || status === 'REJECTED') {
      await prisma.verificationDocument.create({
        data: {
          providerId: provider.id,
          documentType: 'NATIONAL_ID',
          issuingCountry: 'KE',
          fileUrl: '/uploads/sample-id.jpg',
        },
      });
    }

    providers.push({ user, provider });
  }

  const verifiedProviders = providers.filter((p) => p.provider.verificationStatus === 'VERIFIED');

  // ─── Bookings (across various statuses) ────────────────────
  console.log('  → Creating bookings...');
  const bookingsToCreate = [
    { customerIdx: 0, providerIdx: 0, catSlug: 'electrical', status: 'COMPLETED', desc: 'Fix faulty wiring in kitchen', amount: 4500, duration: 120 },
    { customerIdx: 1, providerIdx: 1, catSlug: 'plumbing', status: 'PAID', desc: 'Burst pipe under sink', amount: 3000, duration: 90 },
    { customerIdx: 2, providerIdx: 0, catSlug: 'security', status: 'IN_PROGRESS', desc: 'Install CCTV cameras', amount: 18000, duration: 240 },
    { customerIdx: 0, providerIdx: 1, catSlug: 'plumbing', status: 'QUOTED', desc: 'Install new bathroom taps', amount: 2500, duration: 60 },
    { customerIdx: 1, providerIdx: 0, catSlug: 'electrical', status: 'REQUESTED', desc: 'Replace fuse box', amount: null, duration: null },
    { customerIdx: 2, providerIdx: 1, catSlug: 'plumbing', status: 'ACCEPTED', desc: 'Water heater installation', amount: 7500, duration: 180 },
    { customerIdx: 0, providerIdx: 0, catSlug: 'electrical', status: 'REVIEWED', desc: 'Install ceiling fans', amount: 6000, duration: 150 },
    { customerIdx: 1, providerIdx: 0, catSlug: 'electrical', status: 'DISPUTED', desc: 'Generator repair - disputed quality', amount: 9000, duration: 200 },
    { customerIdx: 2, providerIdx: 1, catSlug: 'plumbing', status: 'CANCELLED', desc: 'Drain unblocking', amount: 2000, duration: 60 },
    { customerIdx: 0, providerIdx: 1, catSlug: 'plumbing', status: 'COMPLETED', desc: 'Toilet repair', amount: 3500, duration: 90 },
  ];

  for (const b of bookingsToCreate) {
    const customer = customers[b.customerIdx];
    const { provider } = verifiedProviders[b.providerIdx % verifiedProviders.length];
    const category = allCategories.find((c) => c.slug === b.catSlug)!;

    const created = await prisma.booking.create({
      data: {
        customerId: customer.id,
        providerId: provider.id,
        categoryId: category.id,
        status: b.status,
        description: b.desc,
        location: `${provider.county}, Kenya`,
        county: provider.county,
        scheduledAt: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000),
        completedAt: ['COMPLETED', 'PAID', 'REVIEWED', 'DISPUTED'].includes(b.status) ? new Date(Date.now() - 86400000) : null,
        cancelledAt: b.status === 'CANCELLED' ? new Date() : null,
        cancelledBy: b.status === 'CANCELLED' ? customer.id : null,
        cancelReason: b.status === 'CANCELLED' ? 'No longer needed' : null,
        quoteAmount: b.amount,
        quoteDuration: b.duration,
        quoteCurrency: 'KES',
        quotedAt: b.amount ? new Date(Date.now() - 2 * 86400000) : null,
        commissionRate: 0.10,
        countryCode: 'KE',
      },
    });

    // Add payment for PAID/COMPLETED/REVIEWED/DISPUTED
    if (['PAID', 'COMPLETED', 'REVIEWED', 'DISPUTED'].includes(b.status) && b.amount) {
      const commission = Math.round(b.amount * 0.10);
      const paymentStatus = b.status === 'DISPUTED' ? 'ESCROW' : (b.status === 'REVIEWED' ? 'RELEASED' : 'ESCROW');
      await prisma.payment.create({
        data: {
          bookingId: created.id,
          amount: b.amount,
          currencyCode: 'KES',
          status: paymentStatus,
          commissionAmount: commission,
          providerPayoutAmount: b.amount - commission,
          externalRef: `MPESA-SEED-${created.id.slice(0, 8)}`,
        },
      });
    }

    // Add review for REVIEWED
    if (b.status === 'REVIEWED' && b.amount) {
      const review = await prisma.review.create({
        data: {
          bookingId: created.id,
          customerId: customer.id,
          providerId: provider.id,
          rating: 5,
          text: 'Excellent service, very professional and on time!',
        },
      });
    }

    // Add dispute for DISPUTED
    if (b.status === 'DISPUTED') {
      await prisma.dispute.create({
        data: {
          bookingId: created.id,
          openedById: customer.id,
          reason: 'Job was not completed to a satisfactory standard. Wiring still faulty.',
        },
      });
    }
  }

  // ─── Support Tickets ──────────────────────────────────────
  console.log('  → Creating support tickets...');
  await prisma.supportTicket.create({
    data: {
      userId: customers[0].id,
      subject: 'Cannot find a provider in my area',
      description: 'I am looking for a mover in Nakuru but cannot find any verified providers there.',
      status: 'OPEN',
    },
  });
  await prisma.supportTicket.create({
    data: {
      userId: customers[1].id,
      subject: 'Payment failed but money was deducted',
      description: 'My M-Pesa was charged but the booking still shows unpaid.',
      status: 'IN_PROGRESS',
      adminResponse: 'We are checking with M-Pesa and will revert within 24 hours.',
      respondedAt: new Date(),
    },
  });

  // ─── Activity Logs ────────────────────────────────────────
  console.log('  → Creating activity logs...');
  const activities = [
    { type: 'USER_SIGNED_UP', actorId: customers[0].id, actorName: customers[0].fullName, metadata: { role: 'CUSTOMER' } },
    { type: 'PROVIDER_VERIFIED', actorId: admin.id, actorName: admin.fullName, metadata: { provider: verifiedProviders[0].user.fullName } },
    { type: 'BOOKING_CREATED', actorId: customers[0].id, actorName: customers[0].fullName, metadata: { category: 'Electrical' } },
    { type: 'PAYMENT_RECEIVED', actorId: customers[1].id, actorName: customers[1].fullName, metadata: { amount: 3000 } },
    { type: 'REVIEW_POSTED', actorId: customers[0].id, actorName: customers[0].fullName, metadata: { rating: 5 } },
    { type: 'DISPUTE_OPENED', actorId: customers[1].id, actorName: customers[1].fullName, metadata: {} },
    { type: 'USER_SIGNED_UP', actorId: verifiedProviders[1].user.id, actorName: verifiedProviders[1].user.fullName, metadata: { role: 'PROVIDER' } },
  ];
  for (const a of activities) {
    await prisma.activityLog.create({
      data: {
        ...a,
        metadata: JSON.stringify(a.metadata),
        createdAt: new Date(Date.now() - Math.random() * 3 * 86400000),
      },
    });
  }

  console.log('\n✅ Seed complete!');
  console.log('─────────────────────────────────');
  console.log('Admin login:    +254700000000 (any OTP in mock mode)');
  console.log('Customer login: +254711111111, +254722222222, +254733333333');
  console.log('Provider login: +254744444444, +254755555555, +254766666666');
  console.log('─────────────────────────────────');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
