import { describe, it, expect, vi } from "vitest";
import { generateTicketNo } from "../../src/services/ticketNoGenerator.js";

describe("UNIT-01: Ticket Number Generator Service", () => {
  it("should generate TKT-YYYY-00001 when no prior tickets exist for the year", async () => {
    const mockPrisma = {
      ticket: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };

    const testDate = new Date(2026, 8, 4); // 2026-09-04
    const ticketNo = await generateTicketNo(mockPrisma as any, testDate);

    expect(mockPrisma.ticket.findFirst).toHaveBeenCalledWith({
      where: {
        ticketNo: {
          startsWith: "TKT-2026-",
        },
      },
      orderBy: {
        ticketNo: "desc",
      },
      select: {
        ticketNo: true,
      },
    });

    expect(ticketNo).toBe("TKT-2026-00001");
  });

  it("should increment sequence number correctly for existing tickets", async () => {
    const mockPrisma = {
      ticket: {
        findFirst: vi.fn().mockResolvedValue({ ticketNo: "TKT-2026-00042" }),
      },
    };

    const testDate = new Date(2026, 8, 4);
    const ticketNo = await generateTicketNo(mockPrisma as any, testDate);

    expect(ticketNo).toBe("TKT-2026-00043");
  });
});
