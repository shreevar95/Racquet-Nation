import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const pool = new pg.Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// 72 realistic Indian names
const NAMES = [
  'Aarav Sharma', 'Vivaan Patel', 'Aditya Kumar', 'Vihaan Singh', 'Arjun Mehta',
  'Sai Krishnan', 'Reyansh Iyer', 'Ayaan Khan', 'Krishna Nair', 'Ishaan Gupta',
  'Rohan Verma', 'Kabir Joshi', 'Dhruv Malhotra', 'Aarav Reddy', 'Ritvik Bose',
  'Shaurya Chopra', 'Atharv Desai', 'Pranav Mishra', 'Yuvaan Shah', 'Advait Rao',
  'Ananya Patel', 'Diya Sharma', 'Kiara Singh', 'Aanya Mehta', 'Myra Kapoor',
  'Priya Nair', 'Sara Iyer', 'Isha Gupta', 'Riya Verma', 'Nisha Joshi',
  'Sanya Malhotra', 'Tanvi Reddy', 'Pooja Bose', 'Sneha Chopra', 'Kavya Desai',
  'Meera Mishra', 'Tanya Shah', 'Aditi Rao', 'Simran Krishnan', 'Neha Khanna',
  'Rahul Dubey', 'Vikram Pillai', 'Suresh Naidu', 'Manish Thakur', 'Deepak Agarwal',
  'Nikhil Saxena', 'Gaurav Trivedi', 'Harish Menon', 'Siddharth Bajaj', 'Tarun Shetty',
  'Pradeep Nambiar', 'Rajesh Pandey', 'Amit Kulkarni', 'Varun Ghosh', 'Santosh Rajan',
  'Mohit Tiwari', 'Ankit Banerjee', 'Sachin Patil', 'Vishal Hegde', 'Girish Kamath',
  'Pankaj Chandra', 'Ravi Oberoi', 'Lokesh Dutta', 'Abhishek Bhatt', 'Manoj Pillai',
  'Vijay Srinivas', 'Chetan Birla', 'Ramesh Khatri', 'Arun Negi', 'Sunil Deshpande',
  'Kiran Laxman', 'Naveen Prasad',
]

const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai',
  'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Gurgaon',
]

const GENDERS = ['MALE', 'FEMALE'] as const

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function dob(minAge: number, maxAge: number): Date {
  const year = new Date().getFullYear() - randInt(minAge, maxAge)
  const month = randInt(0, 11)
  const day = randInt(1, 28)
  return new Date(year, month, day)
}

function slug(name: string, suffix: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + suffix
}

async function main() {
  // Find the target tournament
  const tournament = await prisma.tournament.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, slug: true, maxPlayers: true },
  })

  if (!tournament) {
    console.error('No tournament found. Create one first via the admin panel.')
    process.exit(1)
  }

  console.log(`Seeding 72 bot registrations into: ${tournament.name}`)
  console.log(`Max players: ${tournament.maxPlayers}`)

  let created = 0
  let skipped = 0

  for (let i = 0; i < 72; i++) {
    const name = NAMES[i] ?? `Bot Player ${i + 1}`
    const emailLocal = name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z.]/g, '')
    const email = `${emailLocal}.bot${i}@racquetnation.test`
    const playerSlug = slug(name, `bot${i}`)
    const gender = i % 3 === 0 ? 'FEMALE' : 'MALE'

    try {
      // Create User
      const user = await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          clerkId: `bot_clerk_${i}_${Date.now()}`,
          email,
          name,
          platformRole: 'USER',
        },
      })

      // Create PlayerProfile
      const profile = await prisma.playerProfile.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          slug: playerSlug,
          gender: gender as 'MALE' | 'FEMALE',
          dateOfBirth: dob(18, 50),
          yearsPlaying: randInt(1, 15),
          selfRating: parseFloat((randInt(2, 10) / 2).toFixed(1)),
          location: `${randItem(CITIES)}, India`,
        },
      })

      // Count approved registrations
      const approvedCount = await prisma.registration.count({
        where: { tournamentId: tournament.id, status: 'APPROVED' },
      })
      const status = approvedCount < tournament.maxPlayers ? 'APPROVED' : 'WAITLISTED'

      // Check for existing registration
      const existing = await prisma.registration.findUnique({
        where: { tournamentId_playerId: { tournamentId: tournament.id, playerId: profile.id } },
      })

      if (!existing) {
        await prisma.registration.create({
          data: {
            tournamentId: tournament.id,
            playerId: profile.id,
            status,
            formData: { selfRating: profile.selfRating, location: profile.location },
          },
        })
        created++
        console.log(`  [${created}] ${name} — ${status}`)
      } else {
        skipped++
      }
    } catch (e) {
      console.error(`  ✗ Failed for ${name}:`, (e as Error).message)
    }
  }

  const totals = await prisma.registration.groupBy({
    by: ['status'],
    where: { tournamentId: tournament.id },
    _count: true,
  })

  console.log(`\nDone: ${created} created, ${skipped} skipped`)
  console.log('Registration breakdown:')
  totals.forEach((r) => console.log(`  ${r.status}: ${r._count}`))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
