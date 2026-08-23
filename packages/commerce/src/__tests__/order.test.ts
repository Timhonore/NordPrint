import { describe, expect, it } from "vitest";
import { deriveOrderStatus } from "@nordprint/types";

describe("deriveOrderStatus", () => {
  it("keeps payment and fulfilment as independent axes", () => {
    expect(deriveOrderStatus("not_paid", "not_fulfilled")).toBe("received");
    expect(deriveOrderStatus("captured", "not_fulfilled")).toBe("payment_approved");
    expect(deriveOrderStatus("authorized", "not_fulfilled")).toBe("payment_approved");
    expect(deriveOrderStatus("captured", "packing")).toBe("packing");
    // Shipped on account: not paid yet, but already on its way.
    expect(deriveOrderStatus("not_paid", "shipped")).toBe("shipped");
    expect(deriveOrderStatus("captured", "delivered")).toBe("delivered");
  });

  it("lets cancellation and refunds win", () => {
    expect(deriveOrderStatus("captured", "shipped", true)).toBe("canceled");
    expect(deriveOrderStatus("refunded", "delivered")).toBe("refunded");
  });
});
