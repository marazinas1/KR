import { createFileRoute } from "@tanstack/react-router";

import { rulesRoute } from "@/pages/rules";

export const Route = createFileRoute("/apie/taisykles")(rulesRoute("lt") as never);
