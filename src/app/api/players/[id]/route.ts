import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const leagueId = searchParams.get("leagueId");

  const where: any = {};
  if (leagueId) {
    where.competition = { leagueId };
  }

  const player = await prisma.player.findUnique({
    where: { id },
    include: {
      results: {
        where,
        include: {
          competition: {
            include: {
              season: true,
              league: {
                include: { season: true },
              },
            },
          },
        },
        orderBy: { competition: { date: "asc" } },
      },
    },
  });

  if (!player) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(player);
}
