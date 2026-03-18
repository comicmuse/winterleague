import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const players = await prisma.player.findMany({
      orderBy: { name: "asc" },
      include: {
        results: {
          include: {
            competition: {
              select: {
                id: true,
                name: true,
                date: true,
                topPlaces: true,
                seasonId: true,
                leagueId: true,
              },
            },
          },
          orderBy: { competition: { date: "desc" } },
        },
      },
    });

    return NextResponse.json(players);
  } catch (error) {
    console.error("Error fetching players:", error);
    return NextResponse.json(
      { error: "Failed to fetch players" },
      { status: 500 }
    );
  }
}
