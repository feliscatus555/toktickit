import { getPrisma } from "../src/prisma.js";

// Issue 3 — seed the four supported categories.
// The four names are: Account and Access, Hardware, Software, Network.
// Requirement: running the seed twice must NOT create duplicates.
// Hint: prisma.category.upsert({ where:{name}, update:{}, create:{name} }).

const categories = ["Account and Access", "Hardware", "Software", "Network"];

async function main() {
  const prisma = getPrisma();
  //void prisma;
  // TODO(Issue 3): upsert each category so the seed is idempotent.

  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    })
  }
  console.log("Categories seeded successfully");

  //feature 5 of lab 2
  const requesters = [
    { email: "somchai.p@kmutt.ac.th", displayName: "Somchai Pattana", isActive: true },
    { email: "ananya.s@kmutt.ac.th", displayName: "Ananya Srisuk", isActive: true },
    { email: "chattarin.k@kmutt.ac.th", displayName: "Chattarin Kiat", isActive: true },
    { email: "nattaya.w@kmutt.ac.th", displayName: "Nattaya Wong", isActive: true },
    { email: "inactive.test@kmutt.ac.th", displayName: "Inactive Test User", isActive: false },
  ];

  for (const r of requesters) {
    await prisma.requesterUser.upsert({
      where: { email: r.email },
      update: { displayName: r.displayName, isActive: r.isActive },
      create: r,
    });
  }
  console.log("Requesters seeded successfully");

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
