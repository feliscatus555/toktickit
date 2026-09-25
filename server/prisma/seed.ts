import { getPrisma } from "../src/prisma.js";
import bcrypt from "bcryptjs";

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

  // Lab 3 Users (Requesters, IT Staff, Administrator)
  const defaultPasswordHash = await bcrypt.hash("Password123!", 10);
  const initialPasswordHash = await bcrypt.hash("InitialPassword123!", 10);

  const users = [
    // Active Requesters
    { email: "somchai.p@kmutt.ac.th", displayName: "Somchai Pattana", role: "REQUESTER" as const, isActive: true, mustChangePassword: false, passwordHash: defaultPasswordHash },
    { email: "ananya.s@kmutt.ac.th", displayName: "Ananya Srisuk", role: "REQUESTER" as const, isActive: true, mustChangePassword: false, passwordHash: defaultPasswordHash },
    { email: "chattarin.k@kmutt.ac.th", displayName: "Chattarin Kiat", role: "REQUESTER" as const, isActive: true, mustChangePassword: false, passwordHash: defaultPasswordHash },
    { email: "nattaya.w@kmutt.ac.th", displayName: "Nattaya Wong", role: "REQUESTER" as const, isActive: true, mustChangePassword: false, passwordHash: defaultPasswordHash },
    { email: "jennifer.anderson@kmutt.ac.th", displayName: "Jennifer Anderson", role: "REQUESTER" as const, isActive: true, mustChangePassword: false, passwordHash: defaultPasswordHash },
    // Inactive Requester
    { email: "inactive.test@kmutt.ac.th", displayName: "Inactive Test User", role: "REQUESTER" as const, isActive: false, mustChangePassword: false, passwordHash: defaultPasswordHash },
    // User requiring password change
    { email: "initial.user@kmutt.ac.th", displayName: "Initial Password User", role: "REQUESTER" as const, isActive: true, mustChangePassword: true, passwordHash: initialPasswordHash },

    // Active IT Staff
    { email: "sarah.johnson@kmutt.ac.th", displayName: "Sarah Johnson", role: "IT_STAFF" as const, isActive: true, mustChangePassword: false, passwordHash: defaultPasswordHash },
    { email: "michael.brown@kmutt.ac.th", displayName: "Michael Brown", role: "IT_STAFF" as const, isActive: true, mustChangePassword: false, passwordHash: defaultPasswordHash },
    { email: "david.lee@kmutt.ac.th", displayName: "David Lee", role: "IT_STAFF" as const, isActive: true, mustChangePassword: false, passwordHash: defaultPasswordHash },
    // Inactive IT Staff
    { email: "kevin.patel@kmutt.ac.th", displayName: "Kevin Patel", role: "IT_STAFF" as const, isActive: false, mustChangePassword: false, passwordHash: defaultPasswordHash },

    // Active Administrator
    { email: "john.smith@kmutt.ac.th", displayName: "John Smith", role: "ADMINISTRATOR" as const, isActive: true, mustChangePassword: false, passwordHash: defaultPasswordHash },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        displayName: u.displayName,
        role: u.role,
        isActive: u.isActive,
        mustChangePassword: u.mustChangePassword,
        passwordHash: u.passwordHash,
      },
      create: u,
    });
  }
  console.log("Users seeded successfully");

  // Feature 6 of Lab 2 - Related Systems
  const relatedSystems = [
    { name: "Email", description: "Campus Email System", isActive: true },
    { name: "Campus Wi-Fi", description: "Wireless Network Access", isActive: true },
    { name: "VPN", description: "Remote Access Service", isActive: true },
    { name: "LEB2 App", description: "Learning Management System", isActive: true },
    { name: "Grade Submission App", description: "Faculty Grading Portal", isActive: true },
    { name: "Printer", description: "Network Printing Services", isActive: true },
  ];

  for (const sys of relatedSystems) {
    await prisma.relatedSystem.upsert({
      where: { name: sys.name },
      update: { description: sys.description, isActive: sys.isActive },
      create: sys,
    });
  }
  console.log("Related systems seeded successfully");

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
