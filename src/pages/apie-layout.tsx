import { Outlet } from "@tanstack/react-router";

export function apieLayoutRoute() {
  return { component: () => <Outlet /> };
}
