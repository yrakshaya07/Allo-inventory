import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const reservation = await prisma.reservation.findUnique({
    where: { id },
  });

  if (!reservation) {
    return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
  }

  if (reservation.status !== "pending" || reservation.expiresAt < new Date()) {
    return NextResponse.json({ error: "Reservation has expired" }, { status: 410 });
  }

  const updated = await prisma.reservation.update({
    where: { id },
    data: { status: "confirmed" },
    include: { product: true, warehouse: true },
  });

  return NextResponse.json(updated);
}