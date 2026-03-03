import { PrismaClient, UserRole, OrderStatus, Locale } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function upsertCompany(name: string, slug: string, defaultLocale: Locale) {
  return prisma.company.upsert({
    where: { slug },
    update: { name, defaultLocale },
    create: { name, slug, defaultLocale }
  });
}

async function upsertUser(params: {
  companyId: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  password: string;
  locale?: Locale;
}) {
  const passwordHash = await bcrypt.hash(params.password, 10);
  return prisma.user.upsert({
    where: { email: params.email },
    update: {
      companyId: params.companyId,
      name: params.name,
      phone: params.phone || null,
      role: params.role,
      passwordHash,
      isActive: true,
      locale: params.locale || null
    },
    create: {
      companyId: params.companyId,
      name: params.name,
      email: params.email,
      phone: params.phone || null,
      role: params.role,
      passwordHash,
      isActive: true,
      locale: params.locale || null
    }
  });
}

async function seedPrimaryCompany() {
  const company = await upsertCompany("Samarqand Foods", "samarqand-foods", Locale.UZ);

  const owner = await upsertUser({
    companyId: company.id,
    name: "Owner Demo",
    email: "owner@demo.uz",
    phone: "+998901111111",
    role: UserRole.OWNER,
    password: "Owner123!",
    locale: Locale.UZ
  });
  const courier = await upsertUser({
    companyId: company.id,
    name: "Courier Demo",
    email: "courier@demo.uz",
    phone: "+998902222222",
    role: UserRole.COURIER,
    password: "Courier123!",
    locale: Locale.UZ
  });
  const outlet = await upsertUser({
    companyId: company.id,
    name: "Outlet Demo",
    email: "outlet@demo.uz",
    phone: "+998903333333",
    role: UserRole.OUTLET,
    password: "Outlet123!",
    locale: Locale.UZ
  });

  await prisma.outletProfile.upsert({
    where: { userId: outlet.id },
    update: {
      companyId: company.id,
      outletName: "Samarqand Mini Market",
      phone: "+998901234567",
      address: "Samarqand sh., Registon ko'chasi 24",
      region: "Samarqand"
    },
    create: {
      companyId: company.id,
      userId: outlet.id,
      outletName: "Samarqand Mini Market",
      phone: "+998901234567",
      address: "Samarqand sh., Registon ko'chasi 24",
      region: "Samarqand"
    }
  });

  const products = [
    { name: "Gazli ichimlik 1.5L", sku: "DRK-001", unit: "dona", isActive: true, packSize: 6, minOrderQty: 6 },
    { name: "Suv 1L", sku: "WTR-001", unit: "dona", isActive: true, packSize: 12, minOrderQty: 12 },
    { name: "Sharbat 1L", sku: "JUI-001", unit: "dona", isActive: true, packSize: 6, minOrderQty: 6 },
    { name: "Kungaboqar yog'i", sku: "OIL-001", unit: "dona", isActive: true, packSize: 4, minOrderQty: 4 },
    { name: "Makaron", sku: "PAST-001", unit: "kg", isActive: true, packSize: null, minOrderQty: 2 },
    { name: "Shakar", sku: "SUG-001", unit: "kg", isActive: true, packSize: null, minOrderQty: 5 },
    { name: "Un", sku: "FLO-001", unit: "kg", isActive: true, packSize: 5, minOrderQty: 5 },
    { name: "Choy", sku: "TEA-001", unit: "quti", isActive: true, packSize: null, minOrderQty: 1 },
    { name: "Qahva", sku: "COF-001", unit: "quti", isActive: true, packSize: null, minOrderQty: 1 },
    { name: "Pechenye", sku: "COO-001", unit: "quti", isActive: true, packSize: 8, minOrderQty: 8 }
  ] as const;

  const createdProducts: { id: string; name: string; unit: string }[] = [];
  for (const product of products) {
    const upserted = await prisma.product.upsert({
      where: { companyId_sku: { companyId: company.id, sku: product.sku } },
      update: product,
      create: {
        companyId: company.id,
        name: product.name,
        sku: product.sku,
        unit: product.unit,
        isActive: product.isActive,
        packSize: product.packSize,
        minOrderQty: product.minOrderQty,
        price: null
      }
    });
    createdProducts.push({ id: upserted.id, name: upserted.name, unit: upserted.unit });
  }

  await prisma.favoriteProduct.createMany({
    data: [
      { companyId: company.id, outletId: outlet.id, productId: createdProducts[0].id },
      { companyId: company.id, outletId: outlet.id, productId: createdProducts[2].id },
      { companyId: company.id, outletId: outlet.id, productId: createdProducts[5].id }
    ],
    skipDuplicates: true
  });

  const template = await prisma.orderTemplate.upsert({
    where: { id: "demo-weekly-template" },
    update: { companyId: company.id, name: "Haftalik asosiy zakas", outletId: outlet.id },
    create: {
      id: "demo-weekly-template",
      companyId: company.id,
      name: "Haftalik asosiy zakas",
      outletId: outlet.id
    }
  });

  await prisma.orderTemplateItem.deleteMany({ where: { templateId: template.id } });
  await prisma.orderTemplateItem.createMany({
    data: [
      { templateId: template.id, productId: createdProducts[0].id, qty: 12 },
      { templateId: template.id, productId: createdProducts[1].id, qty: 24 },
      { templateId: template.id, productId: createdProducts[5].id, qty: 10 }
    ]
  });

  const orderCount = await prisma.order.count({ where: { companyId: company.id, outletId: outlet.id } });
  if (orderCount === 0) {
    await prisma.order.create({
      data: {
        companyId: company.id,
        outletId: outlet.id,
        status: OrderStatus.DELIVERED,
        deliveryDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        totalQty: 46,
        note: "Ertaroq yetkazing",
        confirmedAt: new Date(),
        assignedCourierId: courier.id,
        items: {
          create: [
            { productId: createdProducts[0].id, qty: 12, unitSnapshot: createdProducts[0].unit, nameSnapshot: createdProducts[0].name },
            { productId: createdProducts[1].id, qty: 24, unitSnapshot: createdProducts[1].unit, nameSnapshot: createdProducts[1].name },
            { productId: createdProducts[3].id, qty: 10, unitSnapshot: createdProducts[3].unit, nameSnapshot: createdProducts[3].name }
          ]
        }
      }
    });

    await prisma.order.create({
      data: {
        companyId: company.id,
        outletId: outlet.id,
        status: OrderStatus.NEW,
        deliveryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        totalQty: 18,
        note: "",
        items: {
          create: [
            { productId: createdProducts[2].id, qty: 6, unitSnapshot: createdProducts[2].unit, nameSnapshot: createdProducts[2].name },
            { productId: createdProducts[4].id, qty: 4, unitSnapshot: createdProducts[4].unit, nameSnapshot: createdProducts[4].name },
            { productId: createdProducts[7].id, qty: 8, unitSnapshot: createdProducts[7].unit, nameSnapshot: createdProducts[7].name }
          ]
        }
      }
    });
  }

  const invitePinHash = await bcrypt.hash("4455", 10);
  await prisma.outletInvite.upsert({
    where: { token: "demo-join-token" },
    update: {
      companyId: company.id,
      pinHash: invitePinHash,
      outletName: "Yangi Outlet",
      phone: "+998909999000",
      address: "Samarqand sh., Bog'ishamol 12",
      region: "Samarqand",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      usedAt: null,
      createdById: owner.id
    },
    create: {
      token: "demo-join-token",
      companyId: company.id,
      pinHash: invitePinHash,
      outletName: "Yangi Outlet",
      phone: "+998909999000",
      address: "Samarqand sh., Bog'ishamol 12",
      region: "Samarqand",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdById: owner.id
    }
  });

  return { owner, courier, outlet, company };
}

async function seedSecondaryCompany() {
  const company = await upsertCompany("Tashkent Drinks", "tashkent-drinks", Locale.RU);
  await upsertUser({
    companyId: company.id,
    name: "Second Owner",
    email: "owner2@demo.uz",
    phone: "+998904444444",
    role: UserRole.OWNER,
    password: "Owner123!",
    locale: Locale.RU
  });

  await prisma.product.upsert({
    where: { companyId_sku: { companyId: company.id, sku: "TD-001" } },
    update: { name: "Лимонад 1L", unit: "шт", isActive: true },
    create: {
      companyId: company.id,
      name: "Лимонад 1L",
      sku: "TD-001",
      unit: "шт",
      isActive: true,
      price: null
    }
  });
}

async function main() {
  const primary = await seedPrimaryCompany();
  await seedSecondaryCompany();

  console.log("Seed yakunlandi");
  console.log(`Company: ${primary.company.slug}`);
  console.log(`Owner: ${primary.owner.email} / Owner123!`);
  console.log(`Outlet: ${primary.outlet.email} / Outlet123!`);
  console.log(`Courier: ${primary.courier.email} / Courier123!`);
  console.log("Demo invite: /join/demo-join-token (PIN: 4455)");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
