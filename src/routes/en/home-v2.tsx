import { createFileRoute, redirect } from "@tanstack/react-router";

/** Home V2 is now the main home page — keep old preview links working. */
export const Route = createFileRoute("/en/home-v2")({
  beforeLoad: () => {
    throw redirect({ to: "/en", statusCode: 301 });
  },
});
