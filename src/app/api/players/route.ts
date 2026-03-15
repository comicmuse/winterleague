import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const players = await prisma.player.findMany({
    orderBy: { name: "asc" },
    include: {
      results: {
        include: { competition: true },
        orderBy: { place: "asc" },
      },
    },
  });

  return NextResponse.json(players);
}
