import { createFileRoute } from "@tanstack/react-router";

import { rulesRoute } from "@/pages/rules";

export const Route = createFileRoute("/en/apie/taisykles")(rulesRoute("en") as never);
