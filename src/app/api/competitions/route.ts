import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { assignPlaces } from "@/lib/scoring";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const seasonId = searchParams.get("seasonId");
  const leagueId = searchParams.get("leagueId");

  const where: any = {};
  if (seasonId) where.seasonId = seasonId;
  if (leagueId) where.leagueId = leagueId;

  const competitions = await prisma.competition.findMany({
    where,
    orderBy: { date: "desc" },
    include: {
      results: {
        include: { player: true },
        orderBy: { place: "asc" },
      },
      season: true,
      league: {
        include: { season: true },
      },
    },
  });

  return NextResponse.json(competitions);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, date, topPlaces, entries, leagueId, seasonId } = body as {
    name?: string;
    date: string;
    topPlaces: number;
    entries: { playerName: string; score: number }[];
    leagueId: string;
    seasonId: string;
  };

  if (!date || !entries || entries.length === 0 || !leagueId || !seasonId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Assign places based on scores, keyed by player name
  const entryObjects = entries.map((e) => ({ playerId: e.playerName, score: e.score }));
  const placed = assignPlaces(entryObjects);
  // Build a lookup map: playerName → place
  const placeLookup = new Map<string, number>(
    placed.map((p) => [p.playerId, p.place])
  );

  // Upsert players and create competition in a transaction
  const competition = await prisma.$transaction(async (tx) => {
    // Create competition
    const comp = await tx.competition.create({
      data: {
        name: name || null,
        date: new Date(date),
        topPlaces: topPlaces ?? 5,
        leagueId,
        seasonId,
      },
    });

    // For each entry, upsert player and create result
    for (const entry of entries) {
      const place = placeLookup.get(entry.playerName) ?? entries.length;

      const player = await tx.player.upsert({
        where: { name: entry.playerName },
        create: { name: entry.playerName },
        update: {},
      });

      await tx.result.create({
        data: {
          competitionId: comp.id,
          playerId: player.id,
          place,
          score: entry.score,
        },
      });
    }

    return tx.competition.findUnique({
      where: { id: comp.id },
      include: {
        results: {
          include: { player: true },
          orderBy: { place: "asc" },
        },
        season: true,
        league: {
          include: { season: true },
        },
      },
    });
  });

  return NextResponse.json(competition, { status: 201 });
}
