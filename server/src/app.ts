import express, { Request, Response } from "express";
import cors from "cors";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import multer from "multer";
import { getPrisma } from "./prisma.js";
import { generateTicketNo } from "./services/ticketNoGenerator.js";
import { validateAttachmentFile } from "./services/attachmentValidator.js";
import {
  authenticateToken,
  optionalAuthenticate,
  requireRole,
  AuthenticatedRequest,
} from "./middleware/authMiddleware.js";
import {
  hashPassword,
  comparePassword,
  generateToken,
  validatePasswordComplexity,
} from "./services/authService.js";
import { isValidStatusTransition, normalizeStatus } from "./services/statusTransition.js";
import { validateCommentContent } from "./services/validationService.js";

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
});

export const app = express();

app.use(cors());          // already wired: lets the Vite dev server call this API
app.use(express.json());
app.use(optionalAuthenticate);

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
// Feature 9 — Authentication & Password Management Routes
// ---------------------------------------------------------------------------
app.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};
    const fieldErrors: Array<{ field: string; message: string }> = [];

    if (!email || typeof email !== "string" || !email.trim()) {
      fieldErrors.push({ field: "email", message: "Email is required." });
    }
    if (!password || typeof password !== "string") {
      fieldErrors.push({ field: "password", message: "Password is required." });
    }

    if (fieldErrors.length > 0) {
      res.status(422).json({
        error: {
          code: "VALIDATION_FAILED",
          message: "Login failed due to invalid input.",
          fieldErrors,
        },
      });
      return;
    }

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user || !user.isActive) {
      res.status(401).json({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email address or password.",
        },
      });
      return;
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email address or password.",
        },
      });
      return;
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.displayName,
    });

    res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch (error) {
    console.error("Login error", error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to authenticate user.",
      },
    });
  }
});

app.post("/api/auth/logout", authenticateToken, (_req: Request, res: Response) => {
  res.status(200).json({ message: "Successfully logged out." });
});

app.get("/api/auth/me", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  res.status(200).json({ user: req.user });
});

app.post("/api/auth/change-password", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};
    const fieldErrors: Array<{ field: string; message: string }> = [];

    if (!currentPassword || typeof currentPassword !== "string") {
      fieldErrors.push({ field: "currentPassword", message: "Current password is required." });
    }
    if (!newPassword || typeof newPassword !== "string") {
      fieldErrors.push({ field: "newPassword", message: "New password is required." });
    }
    if (!confirmPassword || typeof confirmPassword !== "string") {
      fieldErrors.push({ field: "confirmPassword", message: "Password confirmation is required." });
    }

    if (fieldErrors.length > 0) {
      res.status(422).json({
        error: {
          code: "VALIDATION_FAILED",
          message: "Password change failed due to missing fields.",
          fieldErrors,
        },
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      res.status(422).json({
        error: {
          code: "PASSWORD_MISMATCH",
          message: "New password and confirmation password do not match.",
          fieldErrors: [{ field: "confirmPassword", message: "Passwords do not match." }],
        },
      });
      return;
    }

    const complexity = validatePasswordComplexity(newPassword);
    if (!complexity.isValid) {
      res.status(422).json({
        error: {
          code: "PASSWORD_TOO_WEAK",
          message: "New password does not meet complexity requirements.",
          fieldErrors: complexity.errors.map((msg) => ({ field: "newPassword", message: msg })),
        },
      });
      return;
    }

    const prisma = getPrisma();
    const dbUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!dbUser) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "User not found." } });
      return;
    }

    const isMatch = await comparePassword(currentPassword, dbUser.passwordHash);
    if (!isMatch) {
      res.status(401).json({
        error: {
          code: "INVALID_CURRENT_PASSWORD",
          message: "Current password is incorrect.",
        },
      });
      return;
    }

    const newHash = await hashPassword(newPassword);
    const updatedUser = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
      },
    });

    res.status(200).json({
      message: "Password updated successfully.",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Change password error", error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to change password.",
      },
    });
  }
});

app.get(
  "/api/staff/tickets",
  authenticateToken,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.mustChangePassword) {
        res.status(403).json({
          error: {
            code: "MUST_CHANGE_PASSWORD",
            message: "Password change is required before accessing application resources.",
          },
        });
        return;
      }

      const prisma = getPrisma();

      // Query parameters
      const search = typeof req.query.search === "string" ? req.query.search.trim() : undefined;
      const categoryParam = req.query.category || req.query.categoryId;
      const status = typeof req.query.status === "string" ? req.query.status.trim() : undefined;
      const priority = typeof req.query.priority === "string" ? req.query.priority.trim() : undefined;
      const requestedPriority = typeof req.query.requestedPriority === "string" ? req.query.requestedPriority.trim() : undefined;
      const itPriority = typeof req.query.itPriority === "string" ? req.query.itPriority.trim() : undefined;
      const owner = typeof req.query.owner === "string" ? req.query.owner.trim() : undefined;

      const where: any = {};

      if (search) {
        where.OR = [
          { summary: { contains: search, mode: "insensitive" } },
          { ticketNo: { contains: search, mode: "insensitive" } },
        ];
      }

      if (categoryParam) {
        const catId = parseInt(categoryParam as string, 10);
        if (!isNaN(catId)) {
          where.categoryId = catId;
        }
      }

      if (status) {
        if (status === "In Progress" || status === "InProgress") {
          where.status = "InProgress";
        } else {
          where.status = status;
        }
      }

      const targetPriority = priority || requestedPriority;
      if (targetPriority) {
        where.requestedPriority = targetPriority;
      }

      if (itPriority) {
        where.itPriority = itPriority;
      }

      if (owner) {
        if (owner.toLowerCase() === "unassigned") {
          where.ownerId = null;
        } else if (owner.toLowerCase() === "me") {
          where.ownerId = req.user!.id;
        } else if (owner.toLowerCase() === "assigned") {
          where.ownerId = { not: null };
        } else {
          const ownerIdNum = parseInt(owner, 10);
          if (!isNaN(ownerIdNum)) {
            where.ownerId = ownerIdNum;
          }
        }
      }

      // Sorting
      const allowedSortFields = ["createdAt", "updatedAt", "ticketNo", "requestedPriority", "itPriority", "summary", "status"];
      let sortBy = typeof req.query.sortBy === "string" ? req.query.sortBy.trim() : "createdAt";
      const sortOrder: "asc" | "desc" =
        typeof req.query.sortOrder === "string" && req.query.sortOrder.toLowerCase() === "asc" ? "asc" : "desc";

      let orderBy: any = { createdAt: "desc" };
      if (sortBy === "category") {
        orderBy = { category: { name: sortOrder } };
      } else if (sortBy === "owner") {
        orderBy = { owner: { displayName: sortOrder } };
      } else if (sortBy === "requester") {
        orderBy = { requester: { displayName: sortOrder } };
      } else if (allowedSortFields.includes(sortBy)) {
        orderBy = { [sortBy]: sortOrder };
      }

      // Pagination
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      let limit = parseInt(req.query.limit as string, 10) || 10;
      if (limit < 1) limit = 10;
      if (limit > 50) limit = 50;

      const skip = (page - 1) * limit;

      const [rawTickets, totalItems] = await Promise.all([
        prisma.ticket.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          select: {
            id: true,
            ticketNo: true,
            summary: true,
            createdAt: true,
            updatedAt: true,
            category: {
              select: { id: true, name: true },
            },
            requestedPriority: true,
            itPriority: true,
            status: true,
            owner: {
              select: { id: true, displayName: true },
            },
            requester: {
              select: { id: true, displayName: true },
            },
            isProblemAppearsResolved: true,
          },
        }),
        prisma.ticket.count({ where }),
      ]);

      const totalPages = Math.ceil(totalItems / limit);

      const items = rawTickets.map((t) => ({
        ...t,
        itPriority: t.itPriority || t.requestedPriority,
      }));

      res.status(200).json({
        items,
        pagination: {
          page,
          limit,
          totalItems,
          totalPages,
        },
      });
    } catch (error) {
      console.error("Staff ticket queue error:", error);
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to retrieve staff ticket queue.",
        },
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Feature-11 — IT Staff Ticket Operations & Collaboration
// ---------------------------------------------------------------------------

// List assignable IT Staff & Administrators
app.get(
  "/api/staff/users",
  authenticateToken,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const prisma = getPrisma();
      const users = await prisma.user.findMany({
        where: {
          isActive: true,
          role: { in: ["IT_STAFF", "ADMINISTRATOR"] },
        },
        select: {
          id: true,
          displayName: true,
          email: true,
          role: true,
        },
        orderBy: { displayName: "asc" },
      });
      res.status(200).json(users);
    } catch (error) {
      console.error("Error fetching staff users:", error);
      res.status(500).json({ error: "Failed to fetch staff users." });
    }
  }
);

// 6.1 GET /api/staff/tickets/:id - Full ticket detail for IT Staff & Admin
app.get(
  "/api/staff/tickets/:id",
  authenticateToken,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.mustChangePassword) {
        res.status(403).json({
          error: {
            code: "MUST_CHANGE_PASSWORD",
            message: "Password change is required before accessing application resources.",
          },
        });
        return;
      }

      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({
        where: { id: req.params.id },
        select: {
          id: true,
          ticketNo: true,
          summary: true,
          description: true,
          status: true,
          requestedPriority: true,
          itPriority: true,
          ownerId: true,
          ownerName: true,
          owner: {
            select: { id: true, displayName: true, email: true, role: true },
          },
          resolutionSummary: true,
          isProblemAppearsResolved: true,
          requesterId: true,
          requester: {
            select: { id: true, displayName: true, email: true, role: true },
          },
          categoryId: true,
          category: {
            select: { id: true, name: true },
          },
          relatedSystemId: true,
          relatedSystem: {
            select: { id: true, name: true },
          },
          version: true,
          attachments: {
            select: {
              id: true,
              originalFilename: true,
              mimeType: true,
              sizeBytes: true,
              isDeleted: true,
              deletedAt: true,
              deletedById: true,
              deletionReason: true,
              createdAt: true,
            },
            orderBy: { createdAt: "asc" },
          },
          comments: {
            select: {
              id: true,
              ticketId: true,
              authorId: true,
              author: {
                select: { id: true, displayName: true, role: true },
              },
              content: true,
              createdAt: true,
            },
            orderBy: { createdAt: "asc" },
          },
          internalNotes: {
            select: {
              id: true,
              ticketId: true,
              authorId: true,
              author: {
                select: { id: true, displayName: true, role: true },
              },
              content: true,
              createdAt: true,
            },
            orderBy: { createdAt: "asc" },
          },
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!ticket) {
        res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Ticket not found.",
          },
        });
        return;
      }

      res.status(200).json({
        ...ticket,
        itPriority: ticket.itPriority || ticket.requestedPriority,
      });
    } catch (error) {
      console.error("Error fetching staff ticket detail:", error);
      res.status(500).json({ error: "Failed to fetch staff ticket detail." });
    }
  }
);

// 6.2 PATCH /api/staff/tickets/:id/assignment - Claim / Reassign Ticket Owner
app.patch(
  "/api/staff/tickets/:id/assignment",
  authenticateToken,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.mustChangePassword) {
        res.status(403).json({
          error: {
            code: "MUST_CHANGE_PASSWORD",
            message: "Password change is required before accessing application resources.",
          },
        });
        return;
      }

      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({
        where: { id: req.params.id },
        select: { id: true },
      });

      if (!ticket) {
        res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Ticket not found.",
          },
        });
        return;
      }

      const { ownerId } = req.body;

      if (ownerId === null || ownerId === undefined) {
        // Unassign ticket
        const updated = await prisma.ticket.update({
          where: { id: req.params.id },
          data: {
            ownerId: null,
            ownerName: null,
          },
          select: {
            id: true,
            ownerId: true,
            owner: {
              select: { id: true, displayName: true },
            },
          },
        });
        res.status(200).json(updated);
        return;
      }

      const targetId = Number(ownerId);
      if (isNaN(targetId)) {
        res.status(422).json({
          error: {
            code: "INVALID_ASSIGNEE",
            message: "Assigned user ID must be a valid number.",
          },
        });
        return;
      }

      const assignee = await prisma.user.findUnique({
        where: { id: targetId },
        select: { id: true, displayName: true, isActive: true, role: true },
      });

      if (!assignee || !assignee.isActive || (assignee.role !== "IT_STAFF" && assignee.role !== "ADMINISTRATOR")) {
        res.status(422).json({
          error: {
            code: "INVALID_ASSIGNEE",
            message: "Assigned user does not exist, is inactive, or is not an IT Staff or Administrator.",
          },
        });
        return;
      }

      const updated = await prisma.ticket.update({
        where: { id: req.params.id },
        data: {
          ownerId: assignee.id,
          ownerName: assignee.displayName,
        },
        select: {
          id: true,
          ownerId: true,
          owner: {
            select: { id: true, displayName: true },
          },
        },
      });

      res.status(200).json(updated);
    } catch (error) {
      console.error("Error assigning ticket owner:", error);
      res.status(500).json({ error: "Failed to assign ticket owner." });
    }
  }
);

// 6.3 PATCH /api/staff/tickets/:id/priority - Update IT Priority
app.patch(
  "/api/staff/tickets/:id/priority",
  authenticateToken,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.mustChangePassword) {
        res.status(403).json({
          error: {
            code: "MUST_CHANGE_PASSWORD",
            message: "Password change is required before accessing application resources.",
          },
        });
        return;
      }

      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({
        where: { id: req.params.id },
        select: { id: true, requestedPriority: true },
      });

      if (!ticket) {
        res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Ticket not found.",
          },
        });
        return;
      }

      const { itPriority } = req.body;
      const normalizedPriority = String(itPriority || "").toUpperCase();

      if (!["LOW", "MEDIUM", "HIGH", "URGENT"].includes(normalizedPriority)) {
        res.status(422).json({
          error: {
            code: "INVALID_PRIORITY",
            message: "Invalid IT priority value. Allowed: LOW, MEDIUM, HIGH, URGENT.",
          },
        });
        return;
      }

      const updated = await prisma.ticket.update({
        where: { id: req.params.id },
        data: {
          itPriority: normalizedPriority as any,
        },
        select: {
          id: true,
          ticketNo: true,
          requestedPriority: true,
          itPriority: true,
          status: true,
        },
      });

      res.status(200).json(updated);
    } catch (error) {
      console.error("Error updating IT priority:", error);
      res.status(500).json({ error: "Failed to update IT priority." });
    }
  }
);

// 6.4 PATCH /api/staff/tickets/:id/status - Update Ticket Status
app.patch(
  "/api/staff/tickets/:id/status",
  authenticateToken,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.mustChangePassword) {
        res.status(403).json({
          error: {
            code: "MUST_CHANGE_PASSWORD",
            message: "Password change is required before accessing application resources.",
          },
        });
        return;
      }

      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({
        where: { id: req.params.id },
        select: { id: true, status: true, resolutionSummary: true },
      });

      if (!ticket) {
        res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Ticket not found.",
          },
        });
        return;
      }

      const { status, resolutionSummary } = req.body;
      const targetStatus = normalizeStatus(status);

      if (!isValidStatusTransition(ticket.status, targetStatus)) {
        res.status(422).json({
          error: {
            code: "INVALID_STATUS_TRANSITION",
            message: `Invalid status transition from "${ticket.status}" to "${status}".`,
          },
        });
        return;
      }

      if (targetStatus === "Resolved") {
        if (typeof resolutionSummary !== "string" || resolutionSummary.trim().length === 0) {
          res.status(422).json({
            error: {
              code: "MISSING_RESOLUTION_SUMMARY",
              message: "Resolution summary is required when resolving a ticket.",
            },
          });
          return;
        }
      }

      const updateData: any = { status: targetStatus as any };
      if (typeof resolutionSummary === "string") {
        updateData.resolutionSummary = resolutionSummary.trim();
      }

      const updated = await prisma.ticket.update({
        where: { id: req.params.id },
        data: updateData,
        select: {
          id: true,
          status: true,
          resolutionSummary: true,
        },
      });

      res.status(200).json(updated);
    } catch (error) {
      console.error("Error updating ticket status:", error);
      res.status(500).json({ error: "Failed to update ticket status." });
    }
  }
);

// 6.5 POST /api/tickets/:id/comments - Add Public Comment
app.post(
  "/api/tickets/:id/comments",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.mustChangePassword) {
        res.status(403).json({
          error: {
            code: "MUST_CHANGE_PASSWORD",
            message: "Password change is required before accessing application resources.",
          },
        });
        return;
      }

      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({
        where: { id: req.params.id },
        select: { id: true, requesterId: true },
      });

      if (!ticket) {
        res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Ticket not found.",
          },
        });
        return;
      }

      if (req.user!.role === "REQUESTER" && ticket.requesterId !== req.user!.id) {
        res.status(403).json({
          error: {
            code: "OWNERSHIP_DENIED",
            message: "You are not authorized to comment on this ticket.",
          },
        });
        return;
      }

      const validation = validateCommentContent(req.body?.content);
      if (!validation.isValid) {
        res.status(422).json({
          error: {
            code: "INVALID_COMMENT_CONTENT",
            message: validation.error || "Invalid comment content.",
          },
        });
        return;
      }

      const comment = await prisma.comment.create({
        data: {
          ticketId: ticket.id,
          authorId: req.user!.id,
          content: validation.trimmed!,
        },
        select: {
          id: true,
          ticketId: true,
          authorId: true,
          author: {
            select: {
              displayName: true,
              role: true,
            },
          },
          content: true,
          createdAt: true,
        },
      });

      res.status(201).json(comment);
    } catch (error) {
      console.error("Error posting public comment:", error);
      res.status(500).json({ error: "Failed to post public comment." });
    }
  }
);

// 6.6 GET /api/tickets/:id/comments - Retrieve Public Comments
app.get(
  "/api/tickets/:id/comments",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.mustChangePassword) {
        res.status(403).json({
          error: {
            code: "MUST_CHANGE_PASSWORD",
            message: "Password change is required before accessing application resources.",
          },
        });
        return;
      }

      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({
        where: { id: req.params.id },
        select: { id: true, requesterId: true },
      });

      if (!ticket) {
        res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Ticket not found.",
          },
        });
        return;
      }

      if (req.user!.role === "REQUESTER" && ticket.requesterId !== req.user!.id) {
        res.status(403).json({
          error: {
            code: "OWNERSHIP_DENIED",
            message: "You are not authorized to view comments on this ticket.",
          },
        });
        return;
      }

      const comments = await prisma.comment.findMany({
        where: { ticketId: ticket.id },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          ticketId: true,
          authorId: true,
          author: {
            select: {
              displayName: true,
              role: true,
            },
          },
          content: true,
          createdAt: true,
        },
      });

      res.status(200).json(comments);
    } catch (error) {
      console.error("Error fetching public comments:", error);
      res.status(500).json({ error: "Failed to fetch public comments." });
    }
  }
);

// 6.7 POST /api/staff/tickets/:id/notes - Add Internal Note
app.post(
  "/api/staff/tickets/:id/notes",
  authenticateToken,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.mustChangePassword) {
        res.status(403).json({
          error: {
            code: "MUST_CHANGE_PASSWORD",
            message: "Password change is required before accessing application resources.",
          },
        });
        return;
      }

      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({
        where: { id: req.params.id },
        select: { id: true },
      });

      if (!ticket) {
        res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Ticket not found.",
          },
        });
        return;
      }

      const validation = validateCommentContent(req.body?.content);
      if (!validation.isValid) {
        res.status(422).json({
          error: {
            code: "INVALID_NOTE_CONTENT",
            message: validation.error || "Invalid internal note content.",
          },
        });
        return;
      }

      const note = await prisma.internalNote.create({
        data: {
          ticketId: ticket.id,
          authorId: req.user!.id,
          content: validation.trimmed!,
        },
        select: {
          id: true,
          ticketId: true,
          authorId: true,
          author: {
            select: {
              displayName: true,
              role: true,
            },
          },
          content: true,
          createdAt: true,
        },
      });

      res.status(201).json(note);
    } catch (error) {
      console.error("Error posting internal note:", error);
      res.status(500).json({ error: "Failed to post internal note." });
    }
  }
);

// 6.8 GET /api/staff/tickets/:id/notes - Retrieve Internal Notes
app.get(
  "/api/staff/tickets/:id/notes",
  authenticateToken,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.mustChangePassword) {
        res.status(403).json({
          error: {
            code: "MUST_CHANGE_PASSWORD",
            message: "Password change is required before accessing application resources.",
          },
        });
        return;
      }

      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({
        where: { id: req.params.id },
        select: { id: true },
      });

      if (!ticket) {
        res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Ticket not found.",
          },
        });
        return;
      }

      const notes = await prisma.internalNote.findMany({
        where: { ticketId: ticket.id },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          ticketId: true,
          authorId: true,
          author: {
            select: {
              displayName: true,
              role: true,
            },
          },
          content: true,
          createdAt: true,
        },
      });

      res.status(200).json(notes);
    } catch (error) {
      console.error("Error fetching internal notes:", error);
      res.status(500).json({ error: "Failed to fetch internal notes." });
    }
  }
);

// ---------------------------------------------------------------------------
// Feature 12 — Administrator User Management Routes (Section 7)
// ---------------------------------------------------------------------------

// 7.1 GET /api/admin/users - List users with search and role filter
app.get(
  "/api/admin/users",
  authenticateToken,
  requireRole("ADMINISTRATOR"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (req.user?.mustChangePassword) {
        res.status(403).json({
          error: {
            code: "MUST_CHANGE_PASSWORD",
            message: "Password change is required before accessing application resources.",
          },
        });
        return;
      }

      const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
      const role = typeof req.query.role === "string" ? req.query.role.trim() : "";

      const where: any = {};

      if (search) {
        where.OR = [
          { displayName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ];
      }

      if (role && ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"].includes(role.toUpperCase())) {
        where.role = role.toUpperCase();
      }

      const prisma = getPrisma();
      const users = await prisma.user.findMany({
        where,
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          isActive: true,
          mustChangePassword: true,
          createdAt: true,
        },
      });

      res.status(200).json(users);
    } catch (error) {
      console.error("Error listing admin users:", error);
      res.status(500).json({ error: "Failed to list users." });
    }
  }
);

// 7.2 POST /api/admin/users - Create user with initial password
app.post(
  "/api/admin/users",
  authenticateToken,
  requireRole("ADMINISTRATOR"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (req.user?.mustChangePassword) {
        res.status(403).json({
          error: {
            code: "MUST_CHANGE_PASSWORD",
            message: "Password change is required before accessing application resources.",
          },
        });
        return;
      }

      const { displayName, email, role, isActive, initialPassword } = req.body || {};
      const fieldErrors: Array<{ field: string; message: string }> = [];

      if (!displayName || typeof displayName !== "string" || !displayName.trim()) {
        fieldErrors.push({ field: "displayName", message: "Full Name is required." });
      }

      if (!email || typeof email !== "string" || !email.trim()) {
        fieldErrors.push({ field: "email", message: "Email Address is required." });
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        fieldErrors.push({ field: "email", message: "A valid email address is required." });
      }

      const validRoles = ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"];
      if (!role || typeof role !== "string" || !validRoles.includes(role)) {
        fieldErrors.push({ field: "role", message: "Role must be Requester, IT Staff, or Administrator." });
      }

      if (fieldErrors.length > 0) {
        res.status(422).json({
          error: {
            code: "VALIDATION_FAILED",
            message: "User creation failed due to invalid input.",
            fieldErrors,
          },
        });
        return;
      }

      const passResult = validatePasswordComplexity(initialPassword || "");
      if (!passResult.isValid) {
        res.status(422).json({
          error: {
            code: "VALIDATION_FAILED",
            message: passResult.errors.join(" "),
            fieldErrors: [{ field: "initialPassword", message: passResult.errors[0] }],
          },
        });
        return;
      }

      const prisma = getPrisma();
      const normalizedEmail = email.toLowerCase().trim();

      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUser) {
        res.status(409).json({
          error: {
            code: "CONFLICT",
            message: "A user with this email address already exists.",
            fieldErrors: [{ field: "email", message: "Email address already registered." }],
          },
        });
        return;
      }

      const passwordHash = await hashPassword(initialPassword);

      const newUser = await prisma.user.create({
        data: {
          displayName: displayName.trim(),
          email: normalizedEmail,
          role: role as any,
          isActive: isActive !== false,
          passwordHash,
          mustChangePassword: true,
        },
        select: {
          id: true,
          displayName: true,
          email: true,
          role: true,
          isActive: true,
          mustChangePassword: true,
          createdAt: true,
        },
      });

      res.status(201).json(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user." });
    }
  }
);

// 7.3 PATCH /api/admin/users/:id - Update user details and safety guards
app.patch(
  "/api/admin/users/:id",
  authenticateToken,
  requireRole("ADMINISTRATOR"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (req.user?.mustChangePassword) {
        res.status(403).json({
          error: {
            code: "MUST_CHANGE_PASSWORD",
            message: "Password change is required before accessing application resources.",
          },
        });
        return;
      }

      const targetId = Number(req.params.id);
      if (isNaN(targetId)) {
        res.status(400).json({ error: "Invalid user ID." });
        return;
      }

      const prisma = getPrisma();
      const targetUser = await prisma.user.findUnique({
        where: { id: targetId },
      });

      if (!targetUser) {
        res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "User not found.",
          },
        });
        return;
      }

      const { displayName, email, role, isActive } = req.body || {};

      // Safety Rule 1: Self-deactivation prevention (BR-13, FR-38, AC-17)
      if (req.user?.id === targetId && isActive === false) {
        res.status(422).json({
          error: {
            code: "SELF_DEACTIVATION_PREVENTED",
            message: "Administrators cannot deactivate their own account.",
          },
        });
        return;
      }

      // Safety Rule 2: Last active Administrator protection (BR-14, FR-39, AC-18)
      if (targetUser.role === "ADMINISTRATOR" && targetUser.isActive) {
        const isDeactivating = isActive === false;
        const isChangingRoleAway = role && role !== "ADMINISTRATOR";

        if (isDeactivating || isChangingRoleAway) {
          const activeAdminCount = await prisma.user.count({
            where: {
              role: "ADMINISTRATOR",
              isActive: true,
            },
          });

          if (activeAdminCount <= 1) {
            res.status(422).json({
              error: {
                code: "LAST_ADMIN_PREVENTED",
                message: "Cannot remove or deactivate the last active Administrator.",
              },
            });
            return;
          }
        }
      }

      // Email uniqueness validation
      if (email !== undefined && typeof email === "string" && email.trim()) {
        const normalizedEmail = email.toLowerCase().trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
          res.status(422).json({
            error: {
              code: "VALIDATION_FAILED",
              message: "A valid email address is required.",
              fieldErrors: [{ field: "email", message: "Invalid email format." }],
            },
          });
          return;
        }

        const emailConflict = await prisma.user.findFirst({
          where: {
            email: normalizedEmail,
            NOT: { id: targetId },
          },
        });

        if (emailConflict) {
          res.status(409).json({
            error: {
              code: "CONFLICT",
              message: "A user with this email address already exists.",
              fieldErrors: [{ field: "email", message: "Email address already registered." }],
            },
          });
          return;
        }
      }

      const validRoles = ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"];
      if (role !== undefined && !validRoles.includes(role)) {
        res.status(422).json({
          error: {
            code: "VALIDATION_FAILED",
            message: "Invalid role specified.",
          },
        });
        return;
      }

      const updateData: any = {};
      if (displayName !== undefined && typeof displayName === "string" && displayName.trim()) {
        updateData.displayName = displayName.trim();
      }
      if (email !== undefined && typeof email === "string" && email.trim()) {
        updateData.email = email.toLowerCase().trim();
      }
      if (role !== undefined && validRoles.includes(role)) {
        updateData.role = role;
      }
      if (isActive !== undefined && typeof isActive === "boolean") {
        updateData.isActive = isActive;
      }

      const updatedUser = await prisma.user.update({
        where: { id: targetId },
        data: updateData,
        select: {
          id: true,
          displayName: true,
          email: true,
          role: true,
          isActive: true,
          mustChangePassword: true,
          createdAt: true,
        },
      });

      res.status(200).json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user." });
    }
  }
);

// 7.4 POST /api/admin/users/:id/reset-password - Issue initial password by admin
app.post(
  "/api/admin/users/:id/reset-password",
  authenticateToken,
  requireRole("ADMINISTRATOR"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (req.user?.mustChangePassword) {
        res.status(403).json({
          error: {
            code: "MUST_CHANGE_PASSWORD",
            message: "Password change is required before accessing application resources.",
          },
        });
        return;
      }

      const targetId = Number(req.params.id);
      if (isNaN(targetId)) {
        res.status(400).json({ error: "Invalid user ID." });
        return;
      }

      const prisma = getPrisma();
      const targetUser = await prisma.user.findUnique({
        where: { id: targetId },
      });

      if (!targetUser) {
        res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "User not found.",
          },
        });
        return;
      }

      const newPassword =
        req.body?.newInitialPassword ||
        req.body?.initialPassword ||
        req.body?.password;

      const passResult = validatePasswordComplexity(newPassword || "");
      if (!passResult.isValid) {
        res.status(422).json({
          error: {
            code: "VALIDATION_FAILED",
            message: passResult.errors.join(" "),
            fieldErrors: [{ field: "newInitialPassword", message: passResult.errors[0] }],
          },
        });
        return;
      }

      const passwordHash = await hashPassword(newPassword);

      await prisma.user.update({
        where: { id: targetId },
        data: {
          passwordHash,
          mustChangePassword: true,
        },
      });

      res.status(200).json({
        message: "Initial password reset successfully. User must change password at next login.",
        mustChangePassword: true,
      });
    } catch (error) {
      console.error("Error resetting user password:", error);
      res.status(500).json({ error: "Failed to reset password." });
    }
  }
);

// 4.7 PATCH /api/tickets/:id/resolve-indication & alias resolution-indicator
const handleResolutionIndicator = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user?.mustChangePassword) {
      res.status(403).json({
        error: {
          code: "MUST_CHANGE_PASSWORD",
          message: "Password change is required before accessing application resources.",
        },
      });
      return;
    }

    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      select: { id: true, requesterId: true, status: true },
    });

    if (!ticket) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Ticket not found.",
        },
      });
      return;
    }

    if (req.user?.role !== "REQUESTER" || ticket.requesterId !== req.user.id) {
      res.status(403).json({
        error: {
          code: "OWNERSHIP_DENIED",
          message: "Only the owning Requester can indicate problem resolution.",
        },
      });
      return;
    }

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { isProblemAppearsResolved: true },
      select: {
        id: true,
        isProblemAppearsResolved: true,
        status: true,
      },
    });

    res.status(200).json(updated);
  } catch (error) {
    console.error("Resolution indicator error:", error);
    res.status(500).json({ error: "Failed to update resolution indicator." });
  }
};
app.patch("/api/tickets/:id/resolve-indication", authenticateToken, handleResolutionIndicator);
app.patch("/api/tickets/:id/resolution-indicator", authenticateToken, handleResolutionIndicator);

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
    const requesters = await prisma.user.findMany({
      where: { isActive: true, role: "REQUESTER" },
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
    const authUser = (req as AuthenticatedRequest).user;
    if (authUser && authUser.mustChangePassword) {
      res.status(403).json({
        error: {
          code: "MUST_CHANGE_PASSWORD",
          message: "Password change is required before accessing application resources.",
        },
      });
      return;
    }
    let requesterId: number;

    if (authUser) {
      requesterId = authUser.id;
    } else {
      const reqHeaderId = req.headers["x-development-requester-id"];
      const { requesterId: bodyRequesterId } = req.body || {};
      requesterId = Number(reqHeaderId || bodyRequesterId);
    }

    const {
      categoryId,
      relatedSystemId,
      requestedPriority,
      summary,
      description,
    } = req.body || {};

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
      prisma.user.findUnique({ where: { id: requesterId } }),
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
            itPriority: requestedPriority,
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
    const authUser = (req as AuthenticatedRequest).user;
    if (authUser && authUser.mustChangePassword) {
      res.status(403).json({
        error: {
          code: "MUST_CHANGE_PASSWORD",
          message: "Password change is required before accessing application resources.",
        },
      });
      return;
    }
    let requesterId: number;

    if (authUser) {
      requesterId = authUser.id;
    } else {
      const reqHeaderId = req.headers["x-development-requester-id"];
      const queryRequesterId = req.query.requesterId;
      const rawRequesterId = reqHeaderId || queryRequesterId;
      requesterId = Number(rawRequesterId);

      if (!rawRequesterId || isNaN(requesterId)) {
        res.status(400).json({
          error: {
            code: "MISSING_REQUESTER_ID",
            message: "Development Requester ID is required (header or query parameter).",
          },
        });
        return;
      }
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
        itPriority: true,
        ownerName: true,
        resolutionSummary: true,
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
        attachments: {
          where: { isDeleted: false },
          select: { id: true },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy,
      skip,
      take: limit,
    });

    const data = tickets.map((t) => {
      const { attachments, ...ticket } = t;
      return {
        ...ticket,
        attachmentCount: attachments ? attachments.length : 0,
      };
    });

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

// ---------------------------------------------------------------------------
// Feature 8 — Requester Ticket Detail API Endpoint
// GET /api/tickets/:id
// ---------------------------------------------------------------------------
app.get("/api/tickets/:id", async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const authUser = (req as AuthenticatedRequest).user;
    if (authUser && authUser.mustChangePassword) {
      res.status(403).json({
        error: {
          code: "MUST_CHANGE_PASSWORD",
          message: "Password change is required before accessing application resources.",
        },
      });
      return;
    }
    let legacyRequesterId: number | null = null;

    if (!authUser) {
      const reqHeaderId = req.headers["x-development-requester-id"];
      const queryRequesterId = req.query.requesterId;
      const rawRequesterId = reqHeaderId || queryRequesterId;
      legacyRequesterId = Number(rawRequesterId);

      if (!rawRequesterId || isNaN(legacyRequesterId)) {
        res.status(400).json({
          error: {
            code: "MISSING_REQUESTER_ID",
            message: "Development Requester ID is required (header or query parameter).",
          },
        });
        return;
      }
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        ticketNo: true,
        summary: true,
        description: true,
        status: true,
        requestedPriority: true,
        itPriority: true,
        ownerName: true,
        ownerId: true,
        owner: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        resolutionSummary: true,
        isProblemAppearsResolved: true,
        requesterId: true,
        version: true,

        requester: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
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
        attachments: {
          select: {
            id: true,
            originalFilename: true,
            mimeType: true,
            sizeBytes: true,
            isDeleted: true,
            deletedAt: true,
            deletedById: true,
            deletionReason: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
        comments: {
          select: {
            id: true,
            ticketId: true,
            authorId: true,
            author: {
              select: {
                displayName: true,
                role: true,
              },
            },
            content: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!ticket) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Ticket not found.",
        },
      });
      return;
    }

    if (authUser) {
      if (authUser.role === "REQUESTER" && ticket.requesterId !== authUser.id) {
        res.status(403).json({
          error: {
            code: "OWNERSHIP_DENIED",
            message: "You are not authorized to view this ticket.",
            correlationId: crypto.randomUUID(),
          },
        });
        return;
      }
    } else if (legacyRequesterId !== null && ticket.requesterId !== legacyRequesterId) {
      res.status(403).json({
        error: {
          code: "OWNERSHIP_DENIED",
          message: "You are not authorized to view this ticket.",
          correlationId: crypto.randomUUID(),
        },
      });
      return;
    }

    res.status(200).json({
      ...ticket,
      itPriority: ticket.itPriority || ticket.requestedPriority,
    });
  } catch (error) {
    console.error("Error fetching ticket detail", error);
    res.status(500).json({ error: "Failed to fetch ticket detail." });
  }
});

// ---------------------------------------------------------------------------
// Feature 8 — Upload Attachment Endpoint
// POST /api/tickets/:id/attachments
// ---------------------------------------------------------------------------
app.post("/api/tickets/:id/attachments", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const reqHeaderId = req.headers["x-development-requester-id"];
    const bodyUploaderId = req.body?.uploaderId;
    const queryUploaderId = req.query?.uploaderId;
    const rawUploaderId = reqHeaderId || bodyUploaderId || queryUploaderId;
    const uploaderId = Number(rawUploaderId);

    if (!rawUploaderId || isNaN(uploaderId)) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(400).json({
        error: {
          code: "MISSING_REQUESTER_ID",
          message: "Development Requester identity must be provided.",
        },
      });
      return;
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      select: { id: true, requesterId: true },
    });

    if (!ticket) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Ticket not found.",
        },
      });
      return;
    }

    if (ticket.requesterId !== uploaderId) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(403).json({
        error: {
          code: "OWNERSHIP_DENIED",
          message: "You are not authorized to upload attachments for this ticket.",
          correlationId: crypto.randomUUID(),
        },
      });
      return;
    }

    if (!req.file) {
      res.status(422).json({
        error: {
          code: "INVALID_ATTACHMENT",
          message: "No attachment file provided.",
          correlationId: crypto.randomUUID(),
        },
      });
      return;
    }

    const activeAttachmentCount = await prisma.attachment.count({
      where: { ticketId: ticket.id, isDeleted: false },
    });

    const validation = validateAttachmentFile(
      req.file.originalname,
      req.file.size,
      activeAttachmentCount,
      req.file.mimetype
    );

    if (!validation.valid) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      const isMax = activeAttachmentCount >= 5;
      res.status(422).json({
        error: {
          code: isMax ? "MAX_ATTACHMENTS_EXCEEDED" : "INVALID_ATTACHMENT",
          message: validation.error,
          correlationId: crypto.randomUUID(),
        },
      });
      return;
    }

    const attachment = await prisma.attachment.create({
      data: {
        ticketId: ticket.id,
        originalFilename: req.file.originalname,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        storageKey: req.file.filename,
        isDeleted: false,
      },
    });

    res.status(201).json({
      id: attachment.id,
      ticketId: attachment.ticketId,
      originalFilename: attachment.originalFilename,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      isDeleted: attachment.isDeleted,
      createdAt: attachment.createdAt,
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error("Error uploading attachment", error);
    res.status(500).json({ error: "Failed to upload attachment." });
  }
});

// ---------------------------------------------------------------------------
// Feature 8 — Download Attachment Binary Endpoint
// GET /api/attachments/:id/download
// ---------------------------------------------------------------------------
app.get("/api/attachments/:id/download", async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const reqHeaderId = req.headers["x-development-requester-id"];
    const queryRequesterId = req.query.requesterId;
    const rawRequesterId = reqHeaderId || queryRequesterId;
    const requesterId = Number(rawRequesterId);

    const attachment = await prisma.attachment.findUnique({
      where: { id: req.params.id },
      include: {
        ticket: { select: { requesterId: true } },
      },
    });

    if (!attachment) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Attachment not found.",
        },
      });
      return;
    }

    if (rawRequesterId && !isNaN(requesterId) && attachment.ticket.requesterId !== requesterId) {
      res.status(403).json({
        error: {
          code: "OWNERSHIP_DENIED",
          message: "You are not authorized to download this attachment.",
          correlationId: crypto.randomUUID(),
        },
      });
      return;
    }

    if (attachment.isDeleted) {
      res.status(410).json({
        error: {
          code: "ATTACHMENT_DELETED",
          message: "This attachment has been soft-removed and cannot be downloaded.",
          correlationId: crypto.randomUUID(),
        },
      });
      return;
    }

    const filePath = path.join(uploadsDir, attachment.storageKey);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({
        error: {
          code: "FILE_NOT_FOUND",
          message: "Attachment file binary does not exist on storage.",
        },
      });
      return;
    }

    res.setHeader("Content-Type", attachment.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(attachment.originalFilename)}"`);
    res.sendFile(filePath);
  } catch (error) {
    console.error("Error downloading attachment", error);
    res.status(500).json({ error: "Failed to download attachment." });
  }
});

// ---------------------------------------------------------------------------
// Feature 8 — Soft-Remove Attachment Endpoint
// DELETE /api/attachments/:id
// ---------------------------------------------------------------------------
app.delete("/api/attachments/:id", async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const reqHeaderId = req.headers["x-development-requester-id"];
    const { removerId: bodyRemoverId, reason } = req.body || {};
    const queryRemoverId = req.query.removerId;
    const rawRemoverId = reqHeaderId || bodyRemoverId || queryRemoverId;
    const removerId = Number(rawRemoverId);

    const attachment = await prisma.attachment.findUnique({
      where: { id: req.params.id },
      include: {
        ticket: { select: { requesterId: true } },
      },
    });

    if (!attachment) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Attachment not found.",
        },
      });
      return;
    }

    if (rawRemoverId && !isNaN(removerId) && attachment.ticket.requesterId !== removerId) {
      res.status(403).json({
        error: {
          code: "OWNERSHIP_DENIED",
          message: "You are not authorized to soft-remove this attachment.",
          correlationId: crypto.randomUUID(),
        },
      });
      return;
    }

    const trimmedReason = typeof reason === "string" ? reason.trim() : "";
    if (!trimmedReason || trimmedReason.length > 255) {
      res.status(422).json({
        error: {
          code: "VALIDATION_FAILED",
          fieldErrors: [{ field: "reason", message: "Reason must not exceed 255 characters." }],
          correlationId: crypto.randomUUID(),
        },
      });
      return;
    }

    const updated = await prisma.attachment.update({
      where: { id: attachment.id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedById: !isNaN(removerId) ? removerId : attachment.ticket.requesterId,
        deletionReason: trimmedReason,
      },
    });

    // Remove binary file from disk (SDS decision D-11)
    const filePath = path.join(uploadsDir, attachment.storageKey);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error("Failed to delete attachment binary file:", e);
      }
    }

    res.status(200).json({
      message: "Attachment soft-removed successfully.",
      attachmentId: updated.id,
      deletedAt: updated.deletedAt,
    });
  } catch (error) {
    console.error("Error soft-removing attachment", error);
    res.status(500).json({ error: "Failed to soft-remove attachment." });
  }
});

export default app;



