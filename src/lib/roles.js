const ORDER = ["FRANCHISE_SALES_EXECUTIVE", "FRANCHISE_SALES_MANAGER", "ADMIN"];
const NEED = { MANAGER: "FRANCHISE_SALES_MANAGER", ADMIN: "ADMIN" };

/** UI only — the backend enforces the same rule (403) */
export const hasSalesRole = (scope, min) => ORDER.indexOf(scope?.salesRole) >= ORDER.indexOf(NEED[min] || min);
