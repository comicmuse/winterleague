import { PrismaClient } from '../src/generated/prisma'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const databaseUrl = process.env.DATABASE_URL ?? 'file:./prisma/dev.db'

const adapter = new PrismaLibSql({
  url: databaseUrl,
  authToken: process.env.DATABASE_AUTH_TOKEN,
})

const prisma = new PrismaClient({ adapter })

async function addSampleData() {
  console.log('Adding sample data...')

  // Get or create the current season
  const currentYear = new Date().getFullYear()
  let season = await prisma.season.findFirst({
    where: { year: currentYear }
  })

  if (!season) {
    season = await prisma.season.create({
      data: { year: currentYear }
    })
    console.log(`Created season ${currentYear}`)
  }

  // Create multiple leagues in this season
  const leagues = await Promise.all([
    prisma.league.upsert({
      where: { name_seasonId: { name: 'Seniors League', seasonId: season.id } },
      create: {
        name: 'Seniors League',
        description: 'For players aged 55+',
        seasonId: season.id,
      },
      update: {},
    }),
    prisma.league.upsert({
      where: { name_seasonId: { name: 'Open League', seasonId: season.id } },
      create: {
        name: 'Open League',
        description: 'Open to all players',
        seasonId: season.id,
      },
      update: {},
    }),
    prisma.league.upsert({
      where: { name_seasonId: { name: 'Ladies League', seasonId: season.id } },
      create: {
        name: 'Ladies League',
        description: 'For female players',
        seasonId: season.id,
      },
      update: {},
    }),
  ])

  console.log(`Created ${leagues.length} leagues`)

  // Create sample players
  const players = await Promise.all([
    prisma.player.upsert({
      where: { name: 'Alice Johnson' },
      create: { name: 'Alice Johnson' },
      update: {},
    }),
    prisma.player.upsert({
      where: { name: 'Bob Smith' },
      create: { name: 'Bob Smith' },
      update: {},
    }),
    prisma.player.upsert({
      where: { name: 'Charlie Brown' },
      create: { name: 'Charlie Brown' },
      update: {},
    }),
    prisma.player.upsert({
      where: { name: 'Diana Prince' },
      create: { name: 'Diana Prince' },
      update: {},
    }),
    prisma.player.upsert({
      where: { name: 'Eve Wilson' },
      create: { name: 'Eve Wilson' },
      update: {},
    }),
  ])

  console.log(`Created ${players.length} players`)

  // Create sample competitions
  const now = new Date()
  const competitions = []

  // Seniors League competitions
  competitions.push(
    await prisma.competition.create({
      data: {
        name: 'January Seniors Medal',
        date: new Date(currentYear, 0, 15),
        topPlaces: 5,
        seasonId: season.id,
        leagueId: leagues[0].id,
        results: {
          create: [
            { playerId: players[1].id, score: 72.5, place: 1 }, // Bob
            { playerId: players[2].id, score: 74.2, place: 2 }, // Charlie
            { playerId: players[0].id, score: 75.8, place: 3 }, // Alice
          ]
        }
      }
    }),
    await prisma.competition.create({
      data: {
        name: 'February Seniors Cup',
        date: new Date(currentYear, 1, 12),
        topPlaces: 5,
        seasonId: season.id,
        leagueId: leagues[0].id,
        results: {
          create: [
            { playerId: players[0].id, score: 71.2, place: 1 }, // Alice
            { playerId: players[1].id, score: 73.1, place: 2 }, // Bob
            { playerId: players[2].id, score: 76.4, place: 3 }, // Charlie
          ]
        }
      }
    })
  )

  // Open League competitions
  competitions.push(
    await prisma.competition.create({
      data: {
        name: 'New Year Open',
        date: new Date(currentYear, 0, 1),
        topPlaces: 5,
        seasonId: season.id,
        leagueId: leagues[1].id,
        results: {
          create: [
            { playerId: players[3].id, score: 69.8, place: 1 }, // Diana
            { playerId: players[4].id, score: 71.5, place: 2 }, // Eve
            { playerId: players[0].id, score: 72.3, place: 3 }, // Alice
            { playerId: players[1].id, score: 73.7, place: 4 }, // Bob
          ]
        }
      }
    }),
    await prisma.competition.create({
      data: {
        name: 'Spring Open Championship',
        date: new Date(currentYear, 2, 15),
        topPlaces: 5,
        seasonId: season.id,
        leagueId: leagues[1].id,
        results: {
          create: [
            { playerId: players[1].id, score: 68.9, place: 1 }, // Bob
            { playerId: players[3].id, score: 70.2, place: 2 }, // Diana
            { playerId: players[0].id, score: 71.8, place: 3 }, // Alice
            { playerId: players[4].id, score: 74.1, place: 4 }, // Eve
            { playerId: players[2].id, score: 75.3, place: 5 }, // Charlie
          ]
        }
      }
    })
  )

  // Ladies League competition
  competitions.push(
    await prisma.competition.create({
      data: {
        name: 'Ladies February Medal',
        date: new Date(currentYear, 1, 8),
        topPlaces: 3,
        seasonId: season.id,
        leagueId: leagues[2].id,
        results: {
          create: [
            { playerId: players[3].id, score: 70.5, place: 1 }, // Diana
            { playerId: players[0].id, score: 72.8, place: 2 }, // Alice
            { playerId: players[4].id, score: 75.2, place: 3 }, // Eve
          ]
        }
      }
    })
  )

  console.log(`Created ${competitions.length} competitions`)

  console.log('✅ Sample data added successfully!')
  console.log('\nSummary:')
  console.log(`  - Season: ${currentYear}`)
  console.log(`  - Leagues: ${leagues.map(l => l.name).join(', ')}`)
  console.log(`  - Players: ${players.map(p => p.name).join(', ')}`)
  console.log(`  - Competitions: ${competitions.length}`)
}

addSampleData()
  .catch((e) => {
    console.error('❌ Error adding sample data:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })