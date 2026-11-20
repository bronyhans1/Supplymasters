/**
 * Database types for SUPPLY MASTERS.
 *
 * Prefer regenerating from the live Supabase project after migrations are applied:
 *   npx supabase gen types typescript --linked --schema public > src/types/database.ts
 *   # or: npx supabase gen types typescript --remote=<project-ref> --schema public > src/types/database.ts
 *
 * Or against a local stack:
 *   npx supabase gen types typescript --local > src/types/database.ts
 *
 * Phase 7 (2026-11-08): remote CLI generation failed (account lacks Management API
 * privileges; Docker unavailable for --local). This file was migration-synced from
 * applied SQL through 20261108000500. Re-run official gen types when access is available.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AppRole = "ADMIN" | "STAFF" | "DRIVER";
export type PaymentStatus = "PAID" | "UNPAID";
export type PaymentMethod = "CASH" | "MOBILE_MONEY" | "BANK_TRANSFER" | "CHEQUE" | "OTHER";
export type StockMovementType =
  | "PURCHASE"
  | "SUPPLY_DISPATCH"
  | "ADJUSTMENT"
  | "CORRECTION"
  | "DELIVERY_RETURN";
export type DeliveryStatus =
  | "PENDING"
  | "ASSIGNED"
  | "DISPATCHED"
  | "DELIVERED"
  | "FAILED"
  | "CANCELLED";

type Timestamps = {
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          phone: string | null;
          role: AppRole;
          is_active: boolean;
          must_change_password: boolean;
        } & Timestamps;
        // Authenticated clients cannot INSERT profiles (DB revoke + RLS).
        // Provisioning uses Auth triggers / admin RPCs, not table inserts.
        Insert: Record<string, never>;
        // Personal fields only — matches column UPDATE grant (full_name, phone).
        Update: {
          full_name?: string;
          phone?: string | null;
        };
        Relationships: [];
      };
      vendors: {
        Row: {
          id: string;
          vendor_code: string;
          business_name: string;
          contact_person: string;
          phone: string;
          alt_phone: string | null;
          location: string;
          digital_address: string | null;
          notes: string | null;
          is_active: boolean;
          created_by: string | null;
          updated_by: string | null;
        } & Timestamps;
        // Authenticated INSERT may only target business columns (see migration 012).
        Insert: {
          business_name: string;
          contact_person: string;
          phone: string;
          alt_phone?: string | null;
          location: string;
          digital_address?: string | null;
          notes?: string | null;
          is_active?: boolean;
        };
        Update: {
          business_name?: string;
          contact_person?: string;
          phone?: string;
          alt_phone?: string | null;
          location?: string;
          digital_address?: string | null;
          notes?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      stock_suppliers: {
        Row: {
          id: string;
          supplier_code: string;
          name: string;
          contact_person: string | null;
          phone: string | null;
          location: string | null;
          notes: string | null;
          is_active: boolean;
          created_by: string | null;
          updated_by: string | null;
        } & Timestamps;
        Insert: {
          name: string;
          contact_person?: string | null;
          phone?: string | null;
          location?: string | null;
          notes?: string | null;
          is_active?: boolean;
        };
        Update: {
          name?: string;
          contact_person?: string | null;
          phone?: string | null;
          location?: string | null;
          notes?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      product_categories: {
        Row: {
          id: string;
          name: string;
          is_active: boolean;
          created_by: string | null;
          updated_by: string | null;
        } & Timestamps;
        Insert: {
          name: string;
          is_active?: boolean;
        };
        Update: {
          name?: string;
          is_active?: boolean;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          product_code: string;
          name: string;
          brand: string;
          category: string;
          category_id: string;
          packaging_size: string;
          unit_of_measure: string;
          is_active: boolean;
          created_by: string | null;
          updated_by: string | null;
        } & Timestamps;
        Insert: {
          name: string;
          brand: string;
          category_id: string;
          packaging_size: string;
          unit_of_measure: string;
          is_active?: boolean;
        };
        Update: {
          name?: string;
          brand?: string;
          category_id?: string;
          packaging_size?: string;
          unit_of_measure?: string;
          is_active?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "product_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory: {
        Row: {
          id: string;
          product_id: string;
          quantity_on_hand: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          quantity_on_hand?: number;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["inventory"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "inventory_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: true;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_movements: {
        Row: {
          id: string;
          product_id: string;
          movement_type: StockMovementType;
          quantity_delta: number;
          quantity_before: number;
          quantity_after: number;
          reason: string | null;
          reference_type: string | null;
          reference_id: string | null;
          recorded_by: string | null;
          client_request_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          movement_type: StockMovementType;
          quantity_delta: number;
          quantity_before: number;
          quantity_after: number;
          reason?: string | null;
          reference_type?: string | null;
          reference_id?: string | null;
          recorded_by?: string | null;
          client_request_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["stock_movements"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      supplies: {
        Row: {
          id: string;
          supply_ref: string;
          vendor_id: string;
          supply_date: string;
          grand_total: number;
          payment_status: PaymentStatus;
          recorded_by: string | null;
          notes: string | null;
          client_request_id: string;
          client_request_fingerprint: string;
        } & Timestamps;
        Insert: {
          id?: string;
          supply_ref?: string;
          vendor_id: string;
          supply_date?: string;
          grand_total?: number;
          payment_status?: PaymentStatus;
          recorded_by?: string | null;
          notes?: string | null;
          client_request_id: string;
          client_request_fingerprint: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["supplies"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "supplies_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      supply_items: {
        Row: {
          id: string;
          supply_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          line_total: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          supply_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          line_total: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["supply_items"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "supply_items_supply_id_fkey";
            columns: ["supply_id"];
            isOneToOne: false;
            referencedRelation: "supplies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "supply_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          payment_ref: string;
          supply_id: string;
          vendor_id: string;
          amount: number;
          payment_method: PaymentMethod;
          payment_date: string;
          transaction_reference: string | null;
          recorded_by: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          payment_ref?: string;
          supply_id: string;
          vendor_id: string;
          amount: number;
          payment_method: PaymentMethod;
          payment_date?: string;
          transaction_reference?: string | null;
          recorded_by?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["payments"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "payments_supply_id_fkey";
            columns: ["supply_id"];
            isOneToOne: true;
            referencedRelation: "supplies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      drivers: {
        Row: {
          id: string;
          driver_code: string;
          full_name: string;
          phone: string | null;
          notes: string | null;
          is_active: boolean;
          created_by: string | null;
          updated_by: string | null;
        } & Timestamps;
        // Authenticated INSERT/UPDATE may only target business columns (see migration 004/005).
        Insert: {
          full_name: string;
          phone?: string | null;
          notes?: string | null;
          is_active?: boolean;
        };
        Update: {
          full_name?: string;
          phone?: string | null;
          notes?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      deliveries: {
        Row: {
          id: string;
          delivery_ref: string;
          supply_id: string;
          /** Operational drivers.id — optional; not an Auth user. */
          driver_id: string | null;
          /** Active STAFF or ADMIN profile responsible for the delivery. */
          responsible_staff_id: string;
          vendor_location: string;
          delivery_date: string;
          status: DeliveryStatus;
          dispatched_at: string | null;
          completed_at: string | null;
          notes: string | null;
          created_by: string | null;
          updated_by: string | null;
        } & Timestamps;
        // Authenticated clients cannot INSERT/UPDATE deliveries (RPC-only mutations).
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "deliveries_supply_id_fkey";
            columns: ["supply_id"];
            isOneToOne: false;
            referencedRelation: "supplies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deliveries_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "drivers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deliveries_responsible_staff_id_fkey";
            columns: ["responsible_staff_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      delivery_status_history: {
        Row: {
          id: string;
          delivery_id: string;
          from_status: DeliveryStatus | null;
          to_status: DeliveryStatus;
          changed_by: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          delivery_id: string;
          from_status?: DeliveryStatus | null;
          to_status: DeliveryStatus;
          changed_by?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["delivery_status_history"]["Insert"]>;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>;
        Relationships: [];
      };
      stock_purchases: {
        Row: {
          id: string;
          purchase_ref: string;
          supplier_id: string;
          purchase_date: string;
          supplier_invoice_ref: string | null;
          total_cost: number;
          notes: string | null;
          recorded_by: string | null;
          created_at: string;
          client_request_id: string;
          client_request_fingerprint: string;
        };
        Insert: {
          id?: string;
          purchase_ref?: string;
          supplier_id: string;
          purchase_date?: string;
          supplier_invoice_ref?: string | null;
          total_cost?: number;
          notes?: string | null;
          recorded_by?: string | null;
          created_at?: string;
          client_request_id: string;
          client_request_fingerprint: string;
        };
        Update: Partial<Database["public"]["Tables"]["stock_purchases"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "stock_purchases_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "stock_suppliers";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_purchase_items: {
        Row: {
          id: string;
          purchase_id: string;
          product_id: string;
          quantity_boxes: number;
          unit_purchase_cost: number;
          line_total: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          purchase_id: string;
          product_id: string;
          quantity_boxes: number;
          unit_purchase_cost: number;
          line_total: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["stock_purchase_items"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "stock_purchase_items_purchase_id_fkey";
            columns: ["purchase_id"];
            isOneToOne: false;
            referencedRelation: "stock_purchases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_purchase_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      delivery_stock_returns: {
        Row: {
          id: string;
          return_ref: string;
          delivery_id: string;
          returned_by: string | null;
          notes: string | null;
          client_request_id: string;
          client_request_fingerprint: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          return_ref?: string;
          delivery_id: string;
          returned_by?: string | null;
          notes?: string | null;
          client_request_id: string;
          client_request_fingerprint: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["delivery_stock_returns"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "delivery_stock_returns_delivery_id_fkey";
            columns: ["delivery_id"];
            isOneToOne: false;
            referencedRelation: "deliveries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "delivery_stock_returns_returned_by_fkey";
            columns: ["returned_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      delivery_stock_return_items: {
        Row: {
          id: string;
          return_id: string;
          product_id: string;
          quantity: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          return_id: string;
          product_id: string;
          quantity: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["delivery_stock_return_items"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "delivery_stock_return_items_return_id_fkey";
            columns: ["return_id"];
            isOneToOne: false;
            referencedRelation: "delivery_stock_returns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "delivery_stock_return_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      code_sequences: {
        Row: {
          name: string;
          prefix: string;
          last_value: number;
        };
        Insert: {
          name: string;
          prefix: string;
          last_value?: number;
        };
        Update: Partial<Database["public"]["Tables"]["code_sequences"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      // Internal-only (not granted to authenticated): apply_stock_movement, next_business_code, write_audit_log
      // service_role only — first-admin bootstrap (CLI / privileged server); never call from browser
      bootstrap_first_admin: {
        Args: { p_user_id: string };
        Returns: Database["public"]["Tables"]["profiles"]["Row"];
      };
      create_supply_transaction: {
        Args: {
          p_client_request_id: string;
          p_vendor_id: string;
          p_supply_date: string;
          p_items: Json;
          p_notes?: string | null;
        };
        Returns: Database["public"]["Tables"]["supplies"]["Row"];
      };
      record_full_payment: {
        Args: {
          p_supply_id: string;
          p_payment_method: PaymentMethod;
          p_payment_date?: string | null;
          p_transaction_reference?: string | null;
          p_notes?: string | null;
        };
        Returns: Database["public"]["Tables"]["payments"]["Row"];
      };
      set_delivery_driver: {
        Args: {
          p_delivery_id: string;
          p_driver_id?: string | null;
        };
        Returns: Database["public"]["Tables"]["deliveries"]["Row"];
      };
      set_delivery_responsible_staff: {
        Args: {
          p_delivery_id: string;
          p_staff_id: string;
        };
        Returns: Database["public"]["Tables"]["deliveries"]["Row"];
      };
      update_delivery_status: {
        Args: {
          p_delivery_id: string;
          p_to_status: DeliveryStatus;
          p_notes?: string | null;
        };
        Returns: Database["public"]["Tables"]["deliveries"]["Row"];
      };
      is_valid_delivery_transition: {
        Args: {
          p_from: DeliveryStatus;
          p_to: DeliveryStatus;
        };
        Returns: boolean;
      };
      receive_stock_purchase: {
        Args: {
          p_client_request_id: string;
          p_supplier_id: string;
          p_purchase_date: string;
          p_items: Json;
          p_supplier_invoice_ref?: string | null;
          p_notes?: string | null;
        };
        Returns: Database["public"]["Tables"]["stock_purchases"]["Row"];
      };
      get_reports_center_data: {
        Args: {
          p_from_date: string;
          p_to_date: string;
          p_vendor_id?: string | null;
          p_product_id?: string | null;
          p_supplier_id?: string | null;
          p_payment_method?: PaymentMethod | null;
          p_delivery_status?: DeliveryStatus | null;
          p_staff_id?: string | null;
          p_page?: number;
          p_page_size?: number;
        };
        Returns: Json;
      };
      reports_accra_day_bounds: {
        Args: {
          p_from_date: string;
          p_to_date: string;
        };
        Returns: {
          from_ts: string;
          to_ts_exclusive: string;
        };
      };
      get_dashboard_summary_data: {
        Args: Record<string, never>;
        Returns: Json;
      };
      get_dashboard_purchase_aggregates: {
        Args: Record<string, never>;
        Returns: Json;
      };
      get_inventory_summary_data: {
        Args: Record<string, never>;
        Returns: Json;
      };
      record_delivery_stock_return: {
        Args: {
          p_client_request_id: string;
          p_delivery_id: string;
          p_items: Json;
          p_notes?: string | null;
        };
        Returns: Database["public"]["Tables"]["delivery_stock_returns"]["Row"];
      };
      adjust_inventory: {
        Args: {
          p_client_request_id: string;
          p_product_id: string;
          p_quantity_delta: number;
          p_reason: string;
        };
        Returns: Database["public"]["Tables"]["stock_movements"]["Row"];
      };
      admin_set_user_role: {
        Args: {
          p_user_id: string;
          p_role: AppRole;
          p_is_active?: boolean | null;
        };
        Returns: Database["public"]["Tables"]["profiles"]["Row"];
      };
      admin_require_password_change: {
        Args: { p_user_id: string };
        Returns: Database["public"]["Tables"]["profiles"]["Row"];
      };
      admin_sync_profile_email: {
        Args: { p_user_id: string };
        Returns: Database["public"]["Tables"]["profiles"]["Row"];
      };
      admin_repair_missing_profile: {
        Args: { p_user_id: string };
        Returns: Database["public"]["Tables"]["profiles"]["Row"];
      };
      // service_role only — call via createAdminClient after Auth password update succeeds
      service_clear_must_change_password: {
        Args: { p_user_id: string };
        Returns: Database["public"]["Tables"]["profiles"]["Row"];
      };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_staff_or_admin: { Args: Record<string, never>; Returns: boolean };
      is_driver: { Args: Record<string, never>; Returns: boolean };
      is_active_user: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      app_role: AppRole;
      payment_status: PaymentStatus;
      payment_method: PaymentMethod;
      stock_movement_type: StockMovementType;
      delivery_status: DeliveryStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
