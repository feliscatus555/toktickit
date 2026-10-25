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

  // Feature 13 / Lab 4 — Seed Tickets & Actions Taken (idempotent)
  const somchai = await prisma.user.findUnique({ where: { email: "somchai.p@kmutt.ac.th" } });
  const ananya = await prisma.user.findUnique({ where: { email: "ananya.s@kmutt.ac.th" } });
  const sarah = await prisma.user.findUnique({ where: { email: "sarah.johnson@kmutt.ac.th" } });
  const john = await prisma.user.findUnique({ where: { email: "john.smith@kmutt.ac.th" } });

  const networkCat = await prisma.category.findUnique({ where: { name: "Network" } });
  const hardwareCat = await prisma.category.findUnique({ where: { name: "Hardware" } });
  const softwareCat = await prisma.category.findUnique({ where: { name: "Software" } });
  const accountCat = await prisma.category.findUnique({ where: { name: "Account and Access" } });

  if (somchai && ananya && sarah && john && networkCat && hardwareCat && softwareCat && accountCat) {
    // 1. Ticket with 0 Actions Taken (New)
    let tkt1 = await prisma.ticket.findUnique({ where: { ticketNo: "TKT-2026-00001" } });
    if (!tkt1) {
      tkt1 = await prisma.ticket.create({
        data: {
          ticketNo: "TKT-2026-00001",
          summary: "Network connection drops frequently in Room 402",
          description: "Wi-Fi signals disconnect every 10-15 minutes during lectures.",
          status: "New",
          requestedPriority: "MEDIUM",
          requesterId: somchai.id,
          categoryId: networkCat.id,
        },
      });
    }

    // 2. Ticket with 1 Action Taken (InProgress)
    let tkt2 = await prisma.ticket.findUnique({ where: { ticketNo: "TKT-2026-00002" } });
    if (!tkt2) {
      tkt2 = await prisma.ticket.create({
        data: {
          ticketNo: "TKT-2026-00002",
          summary: "Printer offline in Computer Lab 3",
          description: "Departmental laser printer is unresponsive and displays paper jam error code 13.",
          status: "InProgress",
          requestedPriority: "HIGH",
          itPriority: "HIGH",
          ownerId: sarah.id,
          ownerName: sarah.displayName,
          requesterId: somchai.id,
          categoryId: hardwareCat.id,
        },
      });
    }

    const existingActions2 = await prisma.actionTaken.count({ where: { ticketId: tkt2.id } });
    if (existingActions2 === 0) {
      await prisma.actionTaken.create({
        data: {
          ticketId: tkt2.id,
          performedById: sarah.id,
          actionDateTime: new Date(),
          description: "Inspected paper feed rollers and cleared obstruction in tray 2.",
          result: "Mechanical obstruction resolved; conducting test print job.",
          followUpRequired: false,
        },
      });
    }

    // 3. Ticket with multiple (2) Actions Taken (Resolved)
    let tkt3 = await prisma.ticket.findUnique({ where: { ticketNo: "TKT-2026-00003" } });
    if (!tkt3) {
      tkt3 = await prisma.ticket.create({
        data: {
          ticketNo: "TKT-2026-00003",
          summary: "Cannot access LEB2 grading portal from off-campus",
          description: "Instructor cannot access LMS grading console when working remotely via broadband.",
          status: "Resolved",
          requestedPriority: "URGENT",
          itPriority: "URGENT",
          ownerId: sarah.id,
          ownerName: sarah.displayName,
          requesterId: somchai.id,
          categoryId: softwareCat.id,
          resolutionSummary: "Renewed client SSL certificate and configured split-tunnel routing.",
        },
      });
    } else {
      await prisma.ticket.update({
        where: { id: tkt3.id },
        data: {
          ownerId: sarah.id,
          ownerName: sarah.displayName,
          status: "Resolved",
          itPriority: "URGENT",
          requestedPriority: "URGENT",
          resolutionSummary: "Renewed client SSL certificate and configured split-tunnel routing.",
          updatedAt: new Date(),
        },
      });
    }

    const existingActions3 = await prisma.actionTaken.count({ where: { ticketId: tkt3.id } });
    if (existingActions3 === 0) {
      await prisma.actionTaken.createMany({
        data: [
          {
            ticketId: tkt3.id,
            performedById: sarah.id,
            actionDateTime: new Date(Date.now() - 3600000 * 2),
            description: "Diagnosed VPN handshake logs and observed expired SSL client certificate.",
            result: "Certificate expiration identified as root cause.",
            followUpRequired: true,
            followUpNote: "Issue replacement client certificate and guide requester through import.",
          },
          {
            ticketId: tkt3.id,
            performedById: john.id,
            actionDateTime: new Date(Date.now() - 3600000),
            description: "Generated 2048-bit client certificate and validated portal access with requester.",
            result: "Requester successfully logged in and accessed LEB2 grading portal.",
            followUpRequired: false,
            attachmentNotes: "VPN troubleshooting log verified.",
          },
        ],
      });
    }

    // 4. Ticket with 1 Action Taken for Requester Ananya (Open)
    let tkt4 = await prisma.ticket.findUnique({ where: { ticketNo: "TKT-2026-00004" } });
    if (!tkt4) {
      tkt4 = await prisma.ticket.create({
        data: {
          ticketNo: "TKT-2026-00004",
          summary: "Password reset assistance for student registration portal",
          description: "Account locked after repeated failed login attempts.",
          status: "Open",
          requestedPriority: "LOW",
          itPriority: "LOW",
          ownerId: sarah.id,
          ownerName: sarah.displayName,
          requesterId: ananya.id,
          categoryId: accountCat.id,
        },
      });
    }

    const existingActions4 = await prisma.actionTaken.count({ where: { ticketId: tkt4.id } });
    if (existingActions4 === 0) {
      await prisma.actionTaken.create({
        data: {
          ticketId: tkt4.id,
          performedById: sarah.id,
          actionDateTime: new Date(),
          description: "Verified student identity over phone and unlocked portal account.",
          result: "Temporary OTP issued to verified mobile phone.",
          followUpRequired: false,
        },
      });
    }

    const wifiSys = await prisma.relatedSystem.findUnique({ where: { name: "Campus Wi-Fi" } });

    // 5. Ticket with 0 Actions Taken (InProgress) for resolution gate verification
    let tkt5 = await prisma.ticket.findUnique({ where: { ticketNo: "TKT-2026-00005" } });
    if (!tkt5 && wifiSys) {
      tkt5 = await prisma.ticket.create({
        data: {
          ticketNo: "TKT-2026-00005",
          summary: "DNS cache corruption on faculty workstation",
          description: "Internal intranet domains fail to resolve following gateway reboot.",
          status: "InProgress",
          requestedPriority: "HIGH",
          itPriority: "HIGH",
          owner: { connect: { id: sarah.id } },
          ownerName: sarah.displayName,
          requester: { connect: { id: somchai.id } },
          category: { connect: { id: networkCat.id } },
          relatedSystem: { connect: { id: wifiSys.id } },
        },
      });
    } else if (tkt5) {
      await prisma.ticket.update({
        where: { id: tkt5.id },
        data: {
          status: "InProgress",
          ownerId: sarah.id,
          ownerName: sarah.displayName,
        },
      });
      await prisma.actionTaken.deleteMany({ where: { ticketId: tkt5.id } });
    }
  }
  console.log("Seed tickets and Actions Taken seeded successfully");


}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
