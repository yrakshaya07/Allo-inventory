import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Warehouses
  await prisma.warehouse.upsert({
    where: { id: "wh1" },
    update: {},
    create: { id: "wh1", name: "Mumbai Warehouse", location: "Mumbai, MH" },
  });
  await prisma.warehouse.upsert({
    where: { id: "wh2" },
    update: {},
    create: { id: "wh2", name: "Delhi Warehouse", location: "Delhi, DL" },
  });
  await prisma.warehouse.upsert({
    where: { id: "wh3" },
    update: {},
    create: { id: "wh3", name: "Bangalore Warehouse", location: "Bangalore, KA" },
  });

  // Products
  const products = [
    { id: "p1", name: "iPhone 15 Pro", description: "Apple's latest flagship with titanium design and A17 Pro chip" },
    { id: "p2", name: "Samsung Galaxy S24 Ultra", description: "Android powerhouse with built-in S Pen and 200MP camera" },
    { id: "p3", name: "Sony WH-1000XM5", description: "Industry-leading noise cancelling wireless headphones" },
    { id: "p4", name: "MacBook Pro 14\"", description: "M3 Pro chip, Liquid Retina XDR display, all-day battery" },
    { id: "p5", name: "iPad Pro 12.9\"", description: "Ultra Retina XDR display with M2 chip and Apple Pencil support" },
    { id: "p6", name: "DJI Mini 4 Pro", description: "Lightweight drone with 4K HDR video and obstacle avoidance" },
    { id: "p7", name: "PlayStation 5", description: "Next-gen gaming console with DualSense haptic feedback" },
    { id: "p8", name: "Samsung 65\" OLED TV", description: "4K OLED display with Dolby Vision and 144Hz refresh rate" },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: {},
      create: p,
    });
  }

  // Stock
  const stocks = [
    { productId: "p1", warehouseId: "wh1", total: 10, reserved: 0 },
    { productId: "p1", warehouseId: "wh2", total: 5, reserved: 0 },
    { productId: "p1", warehouseId: "wh3", total: 8, reserved: 0 },
    { productId: "p2", warehouseId: "wh1", total: 8, reserved: 0 },
    { productId: "p2", warehouseId: "wh2", total: 3, reserved: 0 },
    { productId: "p2", warehouseId: "wh3", total: 6, reserved: 0 },
    { productId: "p3", warehouseId: "wh1", total: 15, reserved: 0 },
    { productId: "p3", warehouseId: "wh2", total: 2, reserved: 0 },
    { productId: "p3", warehouseId: "wh3", total: 7, reserved: 0 },
    { productId: "p4", warehouseId: "wh1", total: 6, reserved: 0 },
    { productId: "p4", warehouseId: "wh2", total: 4, reserved: 0 },
    { productId: "p4", warehouseId: "wh3", total: 3, reserved: 0 },
    { productId: "p5", warehouseId: "wh1", total: 12, reserved: 0 },
    { productId: "p5", warehouseId: "wh2", total: 5, reserved: 0 },
    { productId: "p5", warehouseId: "wh3", total: 9, reserved: 0 },
    { productId: "p6", warehouseId: "wh1", total: 4, reserved: 0 },
    { productId: "p6", warehouseId: "wh2", total: 2, reserved: 0 },
    { productId: "p6", warehouseId: "wh3", total: 3, reserved: 0 },
    { productId: "p7", warehouseId: "wh1", total: 3, reserved: 0 },
    { productId: "p7", warehouseId: "wh2", total: 1, reserved: 0 },
    { productId: "p7", warehouseId: "wh3", total: 2, reserved: 0 },
    { productId: "p8", warehouseId: "wh1", total: 5, reserved: 0 },
    { productId: "p8", warehouseId: "wh2", total: 3, reserved: 0 },
    { productId: "p8", warehouseId: "wh3", total: 2, reserved: 0 },
  ];

  for (const s of stocks) {
    await prisma.stock.upsert({
      where: { productId_warehouseId: { productId: s.productId, warehouseId: s.warehouseId } },
      update: { total: s.total, reserved: s.reserved },
      create: s,
    });
  }

  console.log("✅ Database seeded with 8 products and 3 warehouses!");
}

main().catch(console.error).finally(() => prisma.$disconnect());