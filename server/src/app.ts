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

    let attempts = 0;
    let newTicket;
    while (attempts < 5) {
      try {
        const ticketNo = await generateTicketNo(prisma);
        newTicket = await prisma.ticket.create({
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
        break;
      } catch (err: any) {
        attempts++;
        if (err?.code === "P2002" && attempts < 5) {
          continue;
        }
        throw err;
      }
    }

    if (!newTicket) {
      throw new Error("Failed to generate unique ticket number after multiple attempts.");
    }

    res.status(201).json(newTicket);
  } catch (error) {
    console.error("Error creating ticket", error);
    res.status(500).json({ error: "Failed to create ticket." });
  }
});

// ---------------------------------------------------------------------------
// Feature 7 — My Tickets List API Endpoint
// GET /api/tickets
// Supports requester identity filtering, search, category/status/priority filters,
// sorting, and pagination.
// ---------------------------------------------------------------------------
app.get("/api/tickets", async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const reqHeaderId = req.headers["x-development-requester-id"];
    const queryRequesterId = req.query.requesterId;

    const rawRequesterId = reqHeaderId || queryRequesterId;
    const requesterId = Number(rawRequesterId);

    if (!rawRequesterId || isNaN(requesterId)) {
      res.status(400).json({
        error: {
          code: "MISSING_REQUESTER_ID",
          message: "Development Requester ID is required (header or query parameter).",
        },
      });
      return;
    }

    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
    const status = typeof req.query.status === "string" ? req.query.status.trim() : undefined;
    const priority = typeof req.query.priority === "string" ? req.query.priority.trim() : undefined;
    const itPriority = typeof req.query.itPriority === "string" ? req.query.itPriority.trim() : undefined;

    // Sorting params
    const allowedSortFields = ["createdAt", "updatedAt", "ticketNo", "requestedPriority", "summary", "category", "system", "relatedSystem", "status"];
    let sortBy = typeof req.query.sortBy === "string" ? req.query.sortBy.trim() : "createdAt";
    if (!allowedSortFields.includes(sortBy)) {
      sortBy = "createdAt";
    }

    let sortOrder: "asc" | "desc" = "desc";
    if (typeof req.query.sortOrder === "string" && req.query.sortOrder.toLowerCase() === "asc") {
      sortOrder = "asc";
    }

    // Pagination params
    let page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    if (isNaN(page) || page < 1) page = 1;

    let limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    if (isNaN(limit) || limit < 1) limit = 10;
    if (limit > 50) limit = 50;

    const where: any = {
      requesterId,
    };

    if (search) {
      where.OR = [
        { summary: { contains: search, mode: "insensitive" } },
        { ticketNo: { contains: search, mode: "insensitive" } },
      ];
    }

    if (categoryId && !isNaN(categoryId)) {
      where.categoryId = categoryId;
    }

    if (status) {
      if (status === "In Progress" || status === "InProgress") {
        where.status = "InProgress";
      } else {
        where.status = status;
      }
    }

    const targetPriority = itPriority || priority;
    if (targetPriority) {
      where.requestedPriority = targetPriority;
    }

    const totalItems = await prisma.ticket.count({ where });
    const totalPages = Math.ceil(totalItems / limit) || 1;

    let targetPage = page;
    if (totalItems > 0 && targetPage > totalPages) {
      targetPage = totalPages;
    }
    const skip = (targetPage - 1) * limit;

    let sortClause: any;
    if (sortBy === "category") {
      sortClause = { category: { name: sortOrder } };
    } else if (sortBy === "system" || sortBy === "relatedSystem") {
      sortClause = { relatedSystem: { name: sortOrder } };
    } else {
      sortClause = { [sortBy]: sortOrder };
    }

    const orderBy: any[] = [sortClause];
    if (sortBy !== "id") {
      orderBy.push({ id: "desc" });
    }

    const tickets = await prisma.ticket.findMany({
      where,
      select: {
        id: true,
        ticketNo: true,
        summary: true,
        status: true,
        requestedPriority: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        relatedSystem: {
          select: {
            id: true,
            name: true,
          },
        },
        requester: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy,
      skip,
      take: limit,
    });

    const data = tickets.map((ticket) => ({
      ...ticket,
      attachmentCount: 0,
    }));

    res.status(200).json({
      data,
      pagination: {
        page: targetPage,
        limit,
        totalItems,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching tickets", error);
    res.status(500).json({ error: "Failed to fetch tickets." });
  }
});

export default app;


