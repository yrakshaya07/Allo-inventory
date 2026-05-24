import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { z } from "zod";

const schema = z.object({
  productId: z.string(),
  warehouseId: z.string(),
  quantity: z.number().min(1),
  idempotencyKey: z.string().optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { productId, warehouseId, quantity, idempotencyKey } = parsed.data;

  // Idempotency check — return cached response if key already seen
  if (idempotencyKey) {
    const cached = await redis.get(`idem:${idempotencyKey}`);
    if (cached) return NextResponse.json(cached);
  }

  // Distributed lock — only one request at a time per product+warehouse
  const lockKey = `lock:${productId}:${warehouseId}`;
  const lock = await redis.set(lockKey, "1", { nx: true, ex: 10 });
  if (!lock) {
    return NextResponse.json(
      { error: "Too many requests, try again" },
      { status: 429 }
    );
  }

  try {
    // Stock check AND increment happen inside the same interactive transaction.
    // This guarantees atomicity — no other write can interleave between the
    // read and the update, even if the Redis lock somehow fails.
    const reservation = await prisma.$transaction(async (tx) => {
      const stock = await tx.stock.findUnique({
        where: { productId_warehouseId: { productId, warehouseId } },
      });

      if (!stock || stock.total - stock.reserved < quantity) {
        throw new Error("INSUFFICIENT_STOCK");
      }

      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      const created = await tx.reservation.create({
        data: {
          productId,
          warehouseId,
          quantity,
          status: "pending",
          expiresAt,
          idempotencyKey,
        },
        include: { product: true, warehouse: true },
      });

      await tx.stock.update({
        where: { productId_warehouseId: { productId, warehouseId } },
        data: { reserved: { increment: quantity } },
      });

      return created;
    });

    // Cache result for idempotency
    if (idempotencyKey) {
      await redis.set(`idem:${idempotencyKey}`, reservation, { ex: 86400 });
    }

    return NextResponse.json(reservation, { status: 201 });
  } catch (err: any) {
    if (err.message === "INSUFFICIENT_STOCK") {
      return NextResponse.json(
        { error: "Not enough stock available" },
        { status: 409 }
      );
    }
    throw err;
  } finally {
    await redis.del(lockKey);
  }
}