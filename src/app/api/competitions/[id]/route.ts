import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { assignPlaces } from "@/lib/scoring";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const competition = await prisma.competition.findUnique({
    where: { id },
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

  if (!competition) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(competition);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { name, date, topPlaces, entries } = body as {
    name?: string;
    date: string;
    topPlaces: number;
    entries: { playerName: string; score: number }[];
  };

  if (!date || !entries || entries.length === 0) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Assign places based on scores
  const entryObjects = entries.map((e) => ({ playerId: e.playerName, score: e.score }));
  const placed = assignPlaces(entryObjects);
  const placeLookup = new Map<string, number>(
    placed.map((p) => [p.playerId, p.place])
  );

  try {
    const updatedCompetition = await prisma.$transaction(async (tx) => {
      // Get the current competition to preserve league/season info
      const currentComp = await tx.competition.findUnique({
        where: { id },
        select: { leagueId: true, seasonId: true },
      });

      if (!currentComp) {
        throw new Error("Competition not found");
      }

      // Delete existing results
      await tx.result.deleteMany({
        where: { competitionId: id },
      });

      // Update competition details
      await tx.competition.update({
        where: { id },
        data: {
          name: name || null,
          date: new Date(date),
          topPlaces: topPlaces ?? 5,
        },
      });

      // Create new results
      for (const entry of entries) {
        const place = placeLookup.get(entry.playerName) ?? entries.length;

        const player = await tx.player.upsert({
          where: { name: entry.playerName },
          create: { name: entry.playerName },
          update: {},
        });

        await tx.result.create({
          data: {
            competitionId: id,
            playerId: player.id,
            place,
            score: entry.score,
          },
        });
      }

      return tx.competition.findUnique({
        where: { id },
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

    return NextResponse.json(updatedCompetition);
  } catch (error) {
    console.error("Error updating competition:", error);
    return NextResponse.json(
      { error: "Failed to update competition" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await prisma.competition.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
