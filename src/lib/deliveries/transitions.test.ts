import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  OPERATIONAL_DELIVERY_STATUSES,
  allowedNextStatuses,
  canAssignOrClearDeliveryDriver,
  canReassignResponsibleStaff,
  canTransitionDeliveryStatus,
  isTerminalDeliveryStatus,
  statusActionLabel,
} from "@/lib/deliveries/transitions";

describe("delivery transitions", () => {
  it("allows the approved PENDING and DISPATCHED transitions", () => {
    assert.deepEqual(allowedNextStatuses("PENDING"), ["DISPATCHED", "CANCELLED"]);
    assert.deepEqual(allowedNextStatuses("DISPATCHED"), ["DELIVERED", "FAILED"]);
    assert.equal(canTransitionDeliveryStatus("PENDING", "DISPATCHED"), true);
    assert.equal(canTransitionDeliveryStatus("PENDING", "CANCELLED"), true);
    assert.equal(canTransitionDeliveryStatus("DISPATCHED", "DELIVERED"), true);
    assert.equal(canTransitionDeliveryStatus("DISPATCHED", "FAILED"), true);
  });

  it("blocks terminal outgoing transitions and ASSIGNED workflow use", () => {
    for (const status of ["DELIVERED", "FAILED", "CANCELLED"] as const) {
      assert.deepEqual(allowedNextStatuses(status), []);
      assert.equal(isTerminalDeliveryStatus(status), true);
      assert.equal(canTransitionDeliveryStatus(status, "PENDING"), false);
    }
    assert.deepEqual(allowedNextStatuses("ASSIGNED"), []);
    assert.equal(canTransitionDeliveryStatus("PENDING", "ASSIGNED"), false);
    assert.equal(
      (OPERATIONAL_DELIVERY_STATUSES as readonly string[]).includes("ASSIGNED"),
      false,
    );
  });

  it("limits driver and staff mutations by lifecycle", () => {
    assert.equal(canAssignOrClearDeliveryDriver("PENDING"), true);
    assert.equal(canAssignOrClearDeliveryDriver("DISPATCHED"), true);
    assert.equal(canAssignOrClearDeliveryDriver("DELIVERED"), false);
    assert.equal(canAssignOrClearDeliveryDriver("FAILED"), false);
    assert.equal(canAssignOrClearDeliveryDriver("CANCELLED"), false);

    assert.equal(canReassignResponsibleStaff("PENDING"), true);
    assert.equal(canReassignResponsibleStaff("DISPATCHED"), true);
    assert.equal(canReassignResponsibleStaff("DELIVERED"), false);
    assert.equal(canReassignResponsibleStaff("FAILED"), false);
    assert.equal(canReassignResponsibleStaff("CANCELLED"), false);
  });

  it("labels operational status actions without exposing ASSIGNED", () => {
    assert.equal(statusActionLabel("DISPATCHED"), "Dispatch");
    assert.equal(statusActionLabel("DELIVERED"), "Mark delivered");
    assert.equal(statusActionLabel("FAILED"), "Mark failed");
    assert.equal(statusActionLabel("CANCELLED"), "Cancel delivery");
  });
});
