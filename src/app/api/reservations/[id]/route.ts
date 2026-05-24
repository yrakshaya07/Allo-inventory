import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { product: true, warehouse: true },
  });

  if (!reservation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Lazy expiry: atomically mark as released only if it's still pending AND expired.
  // Using updateMany so the WHERE clause acts as a guard — if another request already
  // released it, count === 0 and we skip the stock decrement entirely.
  if (reservation.status === "pending" && reservation.expiresAt < new Date()) {
    const [updateResult] = await prisma.$transaction([
      prisma.reservation.updateMany({
        where: {
          id,
          status: "pending",            // guard: only if still pending
          expiresAt: { lt: new Date() }, // guard: only if actually expired
        },
        data: { status: "released" },
      }),
      prisma.stock.update({
        where: {
          productId_warehouseId: {
            productId: reservation.productId,
            warehouseId: reservation.warehouseId,
          },
        },
        data: { reserved: { decrement: reservation.quantity } },
      }),
    ]);

    // If count === 0, a concurrent request already released it — just re-fetch
    if (updateResult.count === 0) {
      const fresh = await prisma.reservation.findUnique({
        where: { id },
        include: { product: true, warehouse: true },
      });
      return NextResponse.json(fresh);
    }

    // Return the updated reservation shape the frontend expects
    const released = await prisma.reservation.findUnique({
      where: { id },
      include: { product: true, warehouse: true },
    });
    return NextResponse.json(released);
  }

  return NextResponse.json(reservation);
}