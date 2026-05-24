import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const wh1 = await prisma.warehouse.upsert({
    where: { id: "wh1" },
    update: {},
    create: { id: "wh1", name: "Mumbai Warehouse", location: "Mumbai, MH" },
  });
  const wh2 = await prisma.warehouse.upsert({
    where: { id: "wh2" },
    update: {},
    create: { id: "wh2", name: "Delhi Warehouse", location: "Delhi, DL" },
  });

  const products = [
    { id: "p1", name: "iPhone 15 Pro", description: "Latest Apple flagship" },
    { id: "p2", name: "Samsung Galaxy S24", description: "Android powerhouse" },
    { id: "p3", name: "Sony WH-1000XM5", description: "Premium noise-cancelling headphones" },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: {},
      create: p,
    });
  }

  const stocks = [
    { productId: "p1", warehouseId: "wh1", total: 10, reserved: 0 },
    { productId: "p1", warehouseId: "wh2", total: 5, reserved: 0 },
    { productId: "p2", warehouseId: "wh1", total: 8, reserved: 0 },
    { productId: "p2", warehouseId: "wh2", total: 3, reserved: 0 },
    { productId: "p3", warehouseId: "wh1", total: 15, reserved: 0 },
    { productId: "p3", warehouseId: "wh2", total: 2, reserved: 0 },
  ];

  for (const s of stocks) {
    await prisma.stock.upsert({
      where: { productId_warehouseId: { productId: s.productId, warehouseId: s.warehouseId } },
      update: {},
      create: s,
    });
  }

  console.log("✅ Database seeded!");
}

main().catch(console.error).finally(() => prisma.$disconnect());