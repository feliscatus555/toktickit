import { Request, Response, NextFunction } from "express";
import { verifyToken, TokenPayload } from "../services/authService.js";
import { getPrisma } from "../prisma.js";

export interface AuthenticatedUser extends TokenPayload {
  isActive: boolean;
  mustChangePassword: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication token is required.",
      },
    });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Authentication token is invalid or expired.",
      },
    });
    return;
  }

  try {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        email: true,
        role: true,
        displayName: true,
        isActive: true,
        mustChangePassword: true,
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({
        error: {
          code: "ACCOUNT_INACTIVE",
          message: "User account is inactive or does not exist.",
        },
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication middleware error", error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to authenticate request.",
      },
    });
  }
}

export async function optionalAuthenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return next();
  }

  const payload = verifyToken(token);
  if (!payload) {
    return next();
  }

  try {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        email: true,
        role: true,
        displayName: true,
        isActive: true,
        mustChangePassword: true,
      },
    });

    if (user && user.isActive) {
      req.user = user;
    }
  } catch {
    // Ignore error in optional auth
  }

  next();
}

export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required.",
        },
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "You do not have permission to perform this action.",
        },
      });
      return;
    }

    next();
  };
}
