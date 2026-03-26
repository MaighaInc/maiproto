const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log("🚀 Prisma Client Full Example")

  // CLEAN DB
  await prisma.post.deleteMany()
  await prisma.profile.deleteMany()
  await prisma.user.deleteMany()

  // ---------------- CREATE ----------------
  const user = await prisma.user.create({
    data: {
      email: "john@example.com",
      name: "John",
      age: 30,
      profile: {
        create: {
          bio: "Software Engineer"
        }
      },
      posts: {
        create: [
          { title: "Post 1", content: "Hello", published: true },
          { title: "Post 2", content: "Draft", published: false }
        ]
      }
    },
    include: { posts: true, profile: true }
  })

  console.log("Created user:", user)

  // createMany
  await prisma.user.createMany({
    data: [
      { email: "a@test.com", name: "A", age: 20 },
      { email: "b@test.com", name: "B", age: 25 }
    ]
  })

  // ---------------- READ ----------------

  // findUnique
  const foundUser = await prisma.user.findUnique({
    where: { email: "john@example.com" },
    include: { posts: true }
  })

  console.log("findUnique:", foundUser)

  // findMany with filters
  const users = await prisma.user.findMany({
    where: {
      age: { gte: 20 }
    },
    orderBy: { age: "desc" },
    skip: 0,
    take: 5,
    select: {
      id: true,
      email: true,
      age: true
    }
  })

  console.log("findMany:", users)

  // findFirst
  const firstUser = await prisma.user.findFirst({
    where: { name: { contains: "J" } }
  })

  console.log("findFirst:", firstUser)

  // ---------------- UPDATE ----------------

  const updatedUser = await prisma.user.update({
    where: { email: "john@example.com" },
    data: { name: "John Updated" }
  })

  console.log("Updated:", updatedUser)

  // updateMany
  const updateMany = await prisma.user.updateMany({
    where: { age: { lt: 25 } },
    data: { name: "Young User" }
  })

  console.log("updateMany:", updateMany)

  // ---------------- UPSERT ----------------

  const upsertUser = await prisma.user.upsert({
    where: { email: "new@test.com" },
    update: { name: "Updated Name" },
    create: { email: "new@test.com", name: "Created Name" }
  })

  console.log("Upsert:", upsertUser)

  // ---------------- DELETE ----------------

  const deleted = await prisma.user.delete({
    where: { email: "b@test.com" }
  })

  console.log("Deleted:", deleted)

  await prisma.user.deleteMany({
    where: { email: { contains: "test" } }
  })

  // ---------------- RELATIONS ----------------

  const postsWithAuthors = await prisma.post.findMany({
    include: {
      author: true
    }
  })

  console.log("Posts with author:", postsWithAuthors)

  // ---------------- AGGREGATION ----------------

  const agg = await prisma.user.aggregate({
    _count: true,
    _avg: { age: true },
    _min: { age: true },
    _max: { age: true }
  })

  console.log("Aggregate:", agg)

  // groupBy
  const grouped = await prisma.user.groupBy({
    by: ['age'],
    _count: { age: true }
  })

  console.log("GroupBy:", grouped)

  // ---------------- TRANSACTIONS ----------------

  const transaction = await prisma.$transaction([
    prisma.user.create({
      data: { email: "tx1@test.com" }
    }),
    prisma.user.create({
      data: { email: "tx2@test.com" }
    })
  ])

  console.log("Transaction:", transaction)

  // ---------------- RAW QUERIES ----------------

  const raw = await prisma.$queryRaw`SELECT * FROM User`
  console.log("Raw query:", raw)

  const rawExec = await prisma.$executeRaw`
    UPDATE User SET name = 'RAW_UPDATED' WHERE email = 'john@example.com'
  `
  console.log("Raw execute:", rawExec)

  // ---------------- COUNT ----------------

  const count = await prisma.user.count()
  console.log("Count:", count)
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })