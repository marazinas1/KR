import { Outlet } from "@tanstack/react-router";

export function staysLayoutRoute() {
  return {
    component: () => <Outlet />,
  };
}
