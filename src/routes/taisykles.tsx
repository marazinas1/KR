import { createFileRoute } from "@tanstack/react-router";

import { legalRoute } from "@/pages/legal";

export const Route = createFileRoute("/taisykles")(legalRoute("lt", "rental") as never);
