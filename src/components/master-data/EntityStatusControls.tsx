"use client";

import { setProductActive } from "@/lib/master-data/products/actions";
import { setVendorActive } from "@/lib/master-data/vendors/actions";
import { setSupplierActive } from "@/lib/master-data/suppliers/actions";
import { setDriverActive } from "@/lib/master-data/drivers/actions";
import { setCategoryActive } from "@/lib/master-data/categories/actions";
import { StatusToggleButton } from "@/components/master-data/StatusToggleButton";

export function ProductStatusControl({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  return (
    <StatusToggleButton
      entityLabel="product"
      isActive={isActive}
      onToggle={async (next) => setProductActive({ id, isActive: next })}
    />
  );
}

export function VendorStatusControl({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  return (
    <StatusToggleButton
      entityLabel="vendor"
      isActive={isActive}
      onToggle={async (next) => setVendorActive({ id, isActive: next })}
    />
  );
}

export function SupplierStatusControl({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  return (
    <StatusToggleButton
      entityLabel="stock supplier"
      isActive={isActive}
      onToggle={async (next) => setSupplierActive({ id, isActive: next })}
    />
  );
}

export function DriverStatusControl({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  return (
    <StatusToggleButton
      entityLabel="driver"
      isActive={isActive}
      onToggle={async (next) => setDriverActive({ id, isActive: next })}
    />
  );
}

export function CategoryStatusControl({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  return (
    <StatusToggleButton
      entityLabel="product category"
      isActive={isActive}
      onToggle={async (next) => setCategoryActive({ id, isActive: next })}
    />
  );
}
