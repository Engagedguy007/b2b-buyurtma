import { PrismaClient, UserRole, OrderStatus } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function upsertUser(name: string, email: string, role: UserRole, password: string) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: { name, role, passwordHash, isActive: true },
    create: { name, email, role, passwordHash, isActive: true }
  });
}

async function main() {
  const manager = await upsertUser("Manager Demo", "manager@demo.uz", UserRole.MANAGER, "Manager123!");
  const courier = await upsertUser("Courier Demo", "courier@demo.uz", UserRole.COURIER, "Courier123!");
  const outlet = await upsertUser("Outlet Demo", "outlet@demo.uz", UserRole.OUTLET, "Outlet123!");

  await prisma.outletProfile.upsert({
    where: { userId: outlet.id },
    update: {
      outletName: "Samarqand Mini Market",
      phone: "+998901234567",
      address: "Samarqand sh., Registon ko'chasi 24",
      region: "Samarqand"
    },
    create: {
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
  ];

  const createdProducts = [] as { id: string; name: string; unit: string }[];

  for (const product of products) {
    const upserted = await prisma.product.upsert({
      where: { sku: product.sku },
      update: product,
      create: { ...product, price: null }
    });
    createdProducts.push({ id: upserted.id, name: upserted.name, unit: upserted.unit });
  }

  await prisma.favoriteProduct.createMany({
    data: [
      { outletId: outlet.id, productId: createdProducts[0].id },
      { outletId: outlet.id, productId: createdProducts[2].id },
      { outletId: outlet.id, productId: createdProducts[5].id }
    ],
    skipDuplicates: true
  });

  const template = await prisma.orderTemplate.upsert({
    where: { id: "demo-weekly-template" },
    update: { name: "Haftalik asosiy zakas", outletId: outlet.id },
    create: {
      id: "demo-weekly-template",
      name: "Haftalik asosiy zakas",
      outletId: outlet.id
    }
  }).catch(async () => {
    return prisma.orderTemplate.findFirstOrThrow({ where: { outletId: outlet.id, name: "Haftalik asosiy zakas" } });
  });

  await prisma.orderTemplateItem.deleteMany({ where: { templateId: template.id } });
  await prisma.orderTemplateItem.createMany({
    data: [
      { templateId: template.id, productId: createdProducts[0].id, qty: 12 },
      { templateId: template.id, productId: createdProducts[1].id, qty: 24 },
      { templateId: template.id, productId: createdProducts[5].id, qty: 10 }
    ]
  });

  const orderCount = await prisma.order.count({ where: { outletId: outlet.id } });
  if (orderCount === 0) {
    await prisma.order.create({
      data: {
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

  console.log("Seed yakunlandi");
  console.log(`Manager: ${manager.email} / Manager123!`);
  console.log(`Outlet: ${outlet.email} / Outlet123!`);
  console.log(`Courier: ${courier.email} / Courier123!`);
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
