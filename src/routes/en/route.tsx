import { Outlet, createFileRoute } from "@tanstack/react-router";

/** English segment: same Lithuanian slugs, translated copy. */
export const Route = createFileRoute("/en")({
  component: () => <Outlet />,
});
