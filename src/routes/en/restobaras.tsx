import { createFileRoute } from "@tanstack/react-router";

import { restobarasRoute } from "@/pages/restobaras";

export const Route = createFileRoute("/en/restobaras")(restobarasRoute("en") as never);
