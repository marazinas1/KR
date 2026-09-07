import { createFileRoute } from "@tanstack/react-router";

import { aboutRoute } from "@/pages/about";

export const Route = createFileRoute("/apie/")(aboutRoute("lt") as never);
