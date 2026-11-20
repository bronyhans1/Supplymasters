import type { AppRole } from "@/lib/auth/roles";
import { ROLE_PERMISSIONS } from "@/lib/auth/roles";
import { roleHomePath } from "@/lib/auth/access";

export type NavItem = {
  id: string;
  label: string;
  href?: string;
  available: boolean;
  /** Coming-soon modules stay visible but not navigable. */
  comingSoon?: boolean;
};

export type NavSection = {
  id: string;
  label: string;
  items: NavItem[];
};

export function dashboardHrefForRole(role: AppRole): string {
  return roleHomePath(role);
}

export function canAccessMasterData(role: AppRole): boolean {
  return role === "ADMIN" || role === "STAFF";
}

export function canAccessUserManagement(role: AppRole): boolean {
  return role === "ADMIN";
}

export function canAccessOperations(role: AppRole): boolean {
  return role === "ADMIN" || role === "STAFF";
}

export function canAccessPurchasingNav(role: AppRole): boolean {
  return ROLE_PERMISSIONS[role].managePurchases;
}

export function canAccessDriverManagementNav(role: AppRole): boolean {
  return ROLE_PERMISSIONS[role].manageDrivers;
}

export function canAccessSupplierManagementNav(role: AppRole): boolean {
  return ROLE_PERMISSIONS[role].manageSuppliers;
}

export function canAccessCategoryManagementNav(role: AppRole): boolean {
  return ROLE_PERMISSIONS[role].manageProducts;
}

export function canAccessReportsNav(role: AppRole): boolean {
  return ROLE_PERMISSIONS[role].viewReports;
}

export function canAccessAuditLogsNav(role: AppRole): boolean {
  return ROLE_PERMISSIONS[role].viewAuditLogs;
}

export function canAccessDispatchNav(role: AppRole): boolean {
  return ROLE_PERMISSIONS[role].manageDeliveryAssignments;
}

/**
 * Role-filtered sidebar sections. Visibility only — never used as authorization.
 */
export function buildAppNav(role: AppRole): NavSection[] {
  const dashboard: NavItem = {
    id: "dashboard",
    label: "Dashboard",
    href: dashboardHrefForRole(role),
    available: true,
  };

  // Legacy DRIVER Auth accounts: dashboard only — no operational navigation.
  if (role === "DRIVER") {
    return [
      {
        id: "workspace",
        label: "Workspace",
        items: [dashboard],
      },
    ];
  }

  const masterData: NavItem[] = [];
  if (canAccessMasterData(role)) {
    masterData.push({
      id: "products",
      label: "Products",
      href: "/app/products",
      available: true,
    });
    if (canAccessCategoryManagementNav(role)) {
      masterData.push({
        id: "categories",
        label: "Product Categories",
        href: "/app/categories",
        available: true,
      });
    }
    masterData.push({
      id: "vendors",
      label: "Vendors",
      href: "/app/vendors",
      available: true,
    });
    if (canAccessSupplierManagementNav(role)) {
      masterData.push({
        id: "suppliers",
        label: "Stock Suppliers",
        href: "/app/suppliers",
        available: true,
      });
    }
    if (canAccessDriverManagementNav(role)) {
      masterData.push({
        id: "drivers",
        label: "Drivers",
        href: "/app/drivers",
        available: true,
      });
    }
  }

  const operations: NavItem[] = [];
  if (canAccessOperations(role)) {
    if (canAccessPurchasingNav(role)) {
      operations.push({
        id: "purchasing",
        label: "Purchasing",
        href: "/app/purchasing",
        available: true,
      });
    }
    operations.push(
      {
        id: "inventory",
        label: "Inventory",
        href: "/app/inventory",
        available: true,
      },
      {
        id: "supplies",
        label: "Supplies",
        href: "/app/supplies",
        available: true,
      },
    );
    if (canAccessDispatchNav(role)) {
      operations.push(
        {
          id: "dispatch",
          label: "Dispatch",
          href: "/app/dispatch",
          available: true,
        },
        {
          id: "assignments",
          label: "Assignments",
          href: "/app/assignments",
          available: true,
        },
      );
    }
    operations.push(
      {
        id: "payments",
        label: "Payments",
        href: "/app/payments",
        available: true,
      },
      {
        id: "deliveries",
        label: "Deliveries",
        href: "/app/deliveries",
        available: true,
      },
      {
        id: "returns",
        label: "Returns",
        href: "/app/returns",
        available: true,
      },
    );
  }

  const management: NavItem[] = [];
  if (canAccessUserManagement(role)) {
    management.push({
      id: "users",
      label: "User Management",
      href: "/app/admin/users",
      available: true,
    });
  }
  if (canAccessReportsNav(role)) {
    management.push({
      id: "reports",
      label: "Reports",
      href: "/app/reports",
      available: true,
    });
  }
  if (canAccessAuditLogsNav(role)) {
    management.push({
      id: "audit-logs",
      label: "Activity History",
      href: "/app/audit-logs",
      available: true,
    });
  }

  const sections: NavSection[] = [
    {
      id: "workspace",
      label: "Workspace",
      items: [dashboard],
    },
  ];

  if (masterData.length > 0) {
    sections.push({
      id: "master-data",
      label: "Master Data",
      items: masterData,
    });
  }

  if (operations.length > 0) {
    sections.push({
      id: "operations",
      label: "Operations",
      items: operations,
    });
  }

  if (management.length > 0) {
    sections.push({
      id: "management",
      label: "Management",
      items: management,
    });
  }

  return sections;
}

export function isNavItemActive(pathname: string, href: string | undefined): boolean {
  if (!href) return false;
  if (pathname === href) return true;
  // Role dashboards are exact matches only so /app/admin/users does not highlight Dashboard.
  if (href === "/app/admin" || href === "/app/staff" || href === "/app/driver") {
    return pathname === href;
  }
  return pathname.startsWith(`${href}/`);
}
