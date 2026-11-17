import type { Database } from "@/types/database";

export type ProductCategoryRow =
  Database["public"]["Tables"]["product_categories"]["Row"];

export type CategorySelectOption = {
  id: string;
  name: string;
  is_active: boolean;
};
