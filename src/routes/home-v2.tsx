import { createFileRoute, redirect } from "@tanstack/react-router";

/** Home V2 is now the main home page — keep old preview links working. */
export const Route = createFileRoute("/home-v2")({
  beforeLoad: () => {
    throw redirect({ to: "/", statusCode: 301 });
  },
});
