import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const seasons = await prisma.season.findMany({
      orderBy: { year: "desc" },
      include: {
        _count: {
          select: {
            leagues: true,
            competitions: true,
          },
        },
      },
    });

    return NextResponse.json(seasons);
  } catch (error) {
    console.error("Error fetching seasons:", error);
    return NextResponse.json(
      { error: "Failed to fetch seasons" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { year } = body;

    if (!year) {
      return NextResponse.json(
        { error: "Year is required" },
        { status: 400 }
      );
    }

    // Check if season already exists for this year
    const existing = await prisma.season.findUnique({
      where: { year: parseInt(year) },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Season already exists for this year" },
        { status: 409 }
      );
    }

    const season = await prisma.season.create({
      data: {
        year: parseInt(year),
      },
    });

    return NextResponse.json(season, { status: 201 });
  } catch (error) {
    console.error("Error creating season:", error);
    return NextResponse.json(
      { error: "Failed to create season" },
      { status: 500 }
    );
  }
}
