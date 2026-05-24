import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { product: true, warehouse: true },
  });

  if (!reservation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (reservation.status === "pending" && reservation.expiresAt < new Date()) {
    const [updated] = await prisma.$transaction([
      prisma.reservation.update({
        where: { id },
        data: { status: "released" },
        include: { product: true, warehouse: true },
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
    return NextResponse.json(updated);
  }

  return NextResponse.json(reservation);
}