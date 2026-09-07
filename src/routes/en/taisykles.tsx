import { createFileRoute } from "@tanstack/react-router";

import { legalRoute } from "@/pages/legal";

export const Route = createFileRoute("/en/taisykles")(legalRoute("en", "rental") as never);
