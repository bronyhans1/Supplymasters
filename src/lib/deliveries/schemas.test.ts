import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  listDeliveriesQuerySchema,
  setDeliveryDriverSchema,
  setDeliveryResponsibleStaffSchema,
  updateDeliveryStatusSchema,
} from "@/lib/deliveries/schemas";
import { mapDeliveryRpcError } from "@/lib/deliveries/db-errors";
import { deliveryStatusLabel } from "@/lib/deliveries/presentation";

const deliveryId = "11111111-1111-4111-8111-111111111111";
const staffId = "22222222-2222-4222-8222-222222222222";
const driverId = "33333333-3333-4333-8333-333333333333";

describe("listDeliveriesQuerySchema", () => {
  it("defaults and paginates safely", () => {
    const empty = listDeliveriesQuerySchema.parse({});
    assert.equal(empty.q, "");
    assert.equal(empty.status, "");
    assert.equal(empty.assignmentState, "");
    assert.equal(empty.page, 1);

    const filtered = listDeliveriesQuerySchema.parse({
      q: "  NM-DLV  ",
      status: "PENDING",
      driverId: "unassigned",
      assignmentState: "NEEDS_DRIVER",
      page: "2",
    });
    assert.equal(filtered.q, "NM-DLV");
    assert.equal(filtered.status, "PENDING");
    assert.equal(filtered.driverId, "unassigned");
    assert.equal(filtered.assignmentState, "NEEDS_DRIVER");
    assert.equal(filtered.page, 2);

    assert.equal(
      listDeliveriesQuerySchema.safeParse({ status: "ASSIGNED" }).success,
      false,
    );
    assert.equal(
      listDeliveriesQuerySchema.parse({ status: "OPEN" }).status,
      "OPEN",
    );
    assert.equal(
      listDeliveriesQuerySchema.parse({ assignmentState: "HAS_DRIVER" })
        .assignmentState,
      "HAS_DRIVER",
    );
  });
});

describe("setDeliveryDriverSchema", () => {
  it("allows assign and clear while PENDING or DISPATCHED", () => {
    assert.equal(
      setDeliveryDriverSchema.safeParse({
        deliveryId,
        driverId,
        currentStatus: "PENDING",
      }).success,
      true,
    );
    const cleared = setDeliveryDriverSchema.parse({
      deliveryId,
      driverId: "",
      currentStatus: "DISPATCHED",
    });
    assert.equal(cleared.driverId, null);
  });

  it("rejects terminal reassignment", () => {
    assert.equal(
      setDeliveryDriverSchema.safeParse({
        deliveryId,
        driverId,
        currentStatus: "DELIVERED",
      }).success,
      false,
    );
  });
});

describe("setDeliveryResponsibleStaffSchema", () => {
  it("allows reassignment before terminal statuses", () => {
    assert.equal(
      setDeliveryResponsibleStaffSchema.safeParse({
        deliveryId,
        staffId,
        currentStatus: "PENDING",
      }).success,
      true,
    );
    assert.equal(
      setDeliveryResponsibleStaffSchema.safeParse({
        deliveryId,
        staffId,
        currentStatus: "FAILED",
      }).success,
      false,
    );
  });
});

describe("updateDeliveryStatusSchema", () => {
  it("accepts only valid next statuses and optional notes", () => {
    const ok = updateDeliveryStatusSchema.parse({
      deliveryId,
      fromStatus: "PENDING",
      toStatus: "DISPATCHED",
      notes: "  Out for delivery  ",
    });
    assert.equal(ok.toStatus, "DISPATCHED");
    assert.equal(ok.notes, "Out for delivery");

    assert.equal(
      updateDeliveryStatusSchema.safeParse({
        deliveryId,
        fromStatus: "PENDING",
        toStatus: "DELIVERED",
      }).success,
      false,
    );
    assert.equal(
      updateDeliveryStatusSchema.safeParse({
        deliveryId,
        fromStatus: "DELIVERED",
        toStatus: "FAILED",
      }).success,
      false,
    );
  });
});

describe("delivery presentation and rpc errors", () => {
  it("labels statuses without inventing ASSIGNED workflow actions", () => {
    assert.equal(deliveryStatusLabel("PENDING"), "Pending");
    assert.equal(deliveryStatusLabel("ASSIGNED"), "Assigned (legacy)");
  });

  it("maps common RPC failures to actionable messages", () => {
    assert.equal(
      mapDeliveryRpcError({
        message: "Only administrators may set delivery drivers.",
      }).code,
      "FORBIDDEN",
    );
    assert.equal(
      mapDeliveryRpcError({
        message: "Only administrators may set delivery responsibility.",
      }).message,
      "Only administrators may change delivery assignments.",
    );
    assert.equal(
      mapDeliveryRpcError({
        message: "Only staff or administrators may update delivery status.",
      }).code,
      "FORBIDDEN",
    );
    assert.equal(
      mapDeliveryRpcError({ message: "Cannot assign an inactive driver." }).code,
      "INACTIVE_DRIVER",
    );
    assert.equal(
      mapDeliveryRpcError({
        message: "Cannot change responsible staff on a terminal delivery.",
      }).code,
      "STAFF_REASSIGN_LOCKED",
    );
    assert.equal(
      mapDeliveryRpcError({
        message: "Invalid delivery transition from PENDING to DELIVERED.",
      }).code,
      "INVALID_TRANSITION",
    );
  });
});
