import { createFileRoute } from "@tanstack/react-router";

import { staysLayoutRoute } from "@/pages/apartamentai-layout";

export const Route = createFileRoute("/en/apartamentai")(staysLayoutRoute() as never);
