import { PrismaClient } from "@prisma/client";
import { getPrisma } from "../prisma.js";

type PrismaTx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Generates the official Ticket Number in format `TKT-YYYY-NNNNN`.
 * @param prismaClient Optional Prisma client or transaction client
 * @param date Optional date instance (defaults to current date)
 */
export async function generateTicketNo(
  prismaClient?: PrismaTx | PrismaClient,
  date: Date = new Date()
): Promise<string> {
  const db = prismaClient || getPrisma();
  const year = date.getFullYear();
  const yearPrefix = `TKT-${year}-`;

  // Find the ticket with the highest ticketNo sequence for the target year
  const lastTicket = await db.ticket.findFirst({
    where: {
      ticketNo: {
        startsWith: yearPrefix,
      },
    },
    orderBy: {
      ticketNo: "desc",
    },
    select: {
      ticketNo: true,
    },
  });

  let nextSeq = 1;
  if (lastTicket && lastTicket.ticketNo) {
    const parts = lastTicket.ticketNo.split("-");
    if (parts.length === 3) {
      const parsedSeq = parseInt(parts[2], 10);
      if (!isNaN(parsedSeq)) {
        nextSeq = parsedSeq + 1;
      }
    }
  }

  const paddedSeq = String(nextSeq).padStart(5, "0");
  return `${yearPrefix}${paddedSeq}`;
}
