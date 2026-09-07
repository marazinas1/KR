import { createFileRoute } from "@tanstack/react-router";

import { apieLayoutRoute } from "@/pages/apie-layout";

export const Route = createFileRoute("/en/apie")(apieLayoutRoute() as never);
