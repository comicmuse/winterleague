import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { assignPlaces } from "@/lib/scoring";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const competitions = await prisma.competition.findMany({
    orderBy: { date: "desc" },
    include: {
      results: {
        include: { player: true },
        orderBy: { place: "asc" },
      },
    },
  });

  return NextResponse.json(competitions);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, date, topPlaces, entries } = body as {
    name: string;
    date: string;
    topPlaces: number;
    entries: { playerName: string; score: number }[];
  };

  if (!name || !date || !entries || entries.length === 0) {
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
        name,
        date: new Date(date),
        topPlaces: topPlaces ?? 5,
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
      },
    });
  });

  return NextResponse.json(competition, { status: 201 });
}
