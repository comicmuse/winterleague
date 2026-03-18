import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get("seasonId");

    const where = seasonId ? { seasonId } : {};

    const leagues = await prisma.league.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        season: true,
        _count: {
          select: {
            competitions: true,
          },
        },
      },
    });
    return NextResponse.json(leagues);
  } catch (error) {
    console.error("Error fetching leagues:", error);
    return NextResponse.json(
      { error: "Failed to fetch leagues" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, seasonId } = body;

    if (!name || !seasonId) {
      return NextResponse.json(
        { error: "League name and seasonId are required" },
        { status: 400 }
      );
    }

    const league = await prisma.league.create({
      data: {
        name,
        description,
        seasonId,
      },
      include: {
        season: true,
      },
    });

    return NextResponse.json(league, { status: 201 });
  } catch (error) {
    console.error("Error creating league:", error);
    return NextResponse.json(
      { error: "Failed to create league" },
      { status: 500 }
    );
  }
}
