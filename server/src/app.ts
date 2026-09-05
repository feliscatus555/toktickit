import express, { Request, Response } from "express";
import cors from "cors";
import crypto from "crypto";
import { getPrisma } from "./prisma.js";
import { generateTicketNo } from "./services/ticketNoGenerator.js";
// getPrisma() is your lazy database handle. Call it INSIDE a route when you
// need the DB (Issue 4). It is intentionally unused until then.

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

app.use(cors());          // already wired: lets the Vite dev server call this API
app.use(express.json());

// ---------------------------------------------------------------------------
// Issue 2 — API health check
// Make the test in tests/lab-01/health.test.ts pass.
// It must return HTTP 200 with JSON: { status: "ok", service: "TokTickIT API" }
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  // TODO(Issue 2): replace this stub with the required 200 response.
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

// ---------------------------------------------------------------------------
// Issue 4 — Category list
// Add:  GET /api/categories
//   -> read categories from PostgreSQL via getPrisma().category.findMany(...)
//   -> return each { id, name } in a predictable (id) order
//   -> on failure, respond 500 with a safe message (no internal details)
// TODO(Issue 4): implement the route here.
// ---------------------------------------------------------------------------

app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const categories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        id: "asc",
      }
    });

    res.status(200).json(categories);
  } catch (error) {
    console.error("Error fetching categories", error);
    res.status(500).json({ error: "Failed to fetch categories." })
  }
});

// ---------------------------------------------------------------------------
// Feature 5 — Active requesters list
// Add: GET /api/requesters/active
//   -> query active requesters from DB
//   -> return { id, email, displayName } sorted by email
//   -> handle errors with 500 and a safe message
// ---------------------------------------------------------------------------
app.get("/api/requesters/active", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const requesters = await prisma.requesterUser.findMany({
      where: { isActive: true },
      select: { id: true, email: true, displayName: true },
      orderBy: { email: "asc" },
    });
    res.status(200).json(requesters);
  } catch (error) {
    console.error("Error fetching active requesters", error);
    res.status(500).json({ error: "Failed to fetch active requesters." });
  }
});

// ---------------------------------------------------------------------------
// Feature 6 — Related systems list
// ---------------------------------------------------------------------------
app.get("/api/related-systems", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const systems = await prisma.relatedSystem.findMany({
      where: { isActive: true },
      select: { id: true, name: true, description: true },
      orderBy: { id: "asc" },
    });
    res.status(200).json(systems);
  } catch (error) {
    console.error("Error fetching related systems", error);
    res.status(500).json({ error: "Failed to fetch related systems." });
  }
});

// ---------------------------------------------------------------------------
// Feature 6 — Create Ticket
// ---------------------------------------------------------------------------
app.post("/api/tickets", async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const reqHeaderId = req.headers["x-development-requester-id"];
    const {
      requesterId: bodyRequesterId,
      categoryId,
      relatedSystemId,
      requestedPriority,
      summary,
      description,
    } = req.body || {};

    const requesterId = Number(reqHeaderId || bodyRequesterId);

    const fieldErrors: Array<{ field: string; message: string }> = [];

    if (!requesterId || isNaN(requesterId)) {
      fieldErrors.push({
        field: "requesterId",
        message: "Development Requester identity must be selected.",
      });
    }

    const trimmedSummary = typeof summary === "string" ? summary.trim() : "";
    if (trimmedSummary.length < 5 || trimmedSummary.length > 120) {
      fieldErrors.push({
        field: "summary",
        message: "Summary must be between 5 and 120 characters long.",
      });
    }

    const trimmedDescription = typeof description === "string" ? description.trim() : "";
    if (trimmedDescription.length < 10 || trimmedDescription.length > 2000) {
      fieldErrors.push({
        field: "description",
        message: "Description must be between 10 and 2000 characters long.",
      });
    }

    const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
    if (!validPriorities.includes(requestedPriority)) {
      fieldErrors.push({
        field: "requestedPriority",
        message: "Requested priority must be one of LOW, MEDIUM, HIGH, URGENT.",
      });
    }

    if (!categoryId || typeof categoryId !== "number") {
      fieldErrors.push({
        field: "categoryId",
        message: "Category is required.",
      });
    }

    if (!relatedSystemId || typeof relatedSystemId !== "number") {
      fieldErrors.push({
        field: "relatedSystemId",
        message: "Related system is required.",
      });
    }

    if (fieldErrors.length > 0) {
      res.status(422).json({
        error: {
          code: "VALIDATION_FAILED",
          message: "Ticket creation failed due to invalid field values.",
          fieldErrors,
          correlationId: crypto.randomUUID(),
        },
      });
      return;
    }

    const [requester, category, relatedSystem] = await Promise.all([
      prisma.requesterUser.findUnique({ where: { id: requesterId } }),
      prisma.category.findUnique({ where: { id: categoryId } }),
      prisma.relatedSystem.findUnique({ where: { id: relatedSystemId } }),
    ]);

    if (!requester) {
      fieldErrors.push({ field: "requesterId", message: "Selected requester does not exist." });
    }
    if (!category) {
      fieldErrors.push({ field: "categoryId", message: "Selected category does not exist." });
    }
    if (!relatedSystem) {
      fieldErrors.push({ field: "relatedSystemId", message: "Selected related system does not exist." });
    }

    if (fieldErrors.length > 0) {
      res.status(422).json({
        error: {
          code: "VALIDATION_FAILED",
          message: "Ticket creation failed due to invalid field values.",
          fieldErrors,
          correlationId: crypto.randomUUID(),
        },
      });
      return;
    }

    const newTicket = await prisma.$transaction(async (tx) => {
      const ticketNo = await generateTicketNo(tx);
      return await tx.ticket.create({
        data: {
          ticketNo,
          summary: trimmedSummary,
          description: trimmedDescription,
          requestedPriority,
          status: "New",
          requesterId,
          categoryId,
          relatedSystemId,
        },
      });
    });

    res.status(201).json(newTicket);
  } catch (error) {
    console.error("Error creating ticket", error);
    res.status(500).json({ error: "Failed to create ticket." });
  }
});

export default app;

