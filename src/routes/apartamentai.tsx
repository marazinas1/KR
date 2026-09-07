import { createFileRoute } from "@tanstack/react-router";

import { staysLayoutRoute } from "@/pages/apartamentai-layout";

export const Route = createFileRoute("/apartamentai")(staysLayoutRoute() as never);
