import { createFileRoute } from "@tanstack/react-router";

import { redirectToStaysRoute } from "@/pages/redirect-to-stays";

export const Route = createFileRoute("/namelis")(redirectToStaysRoute("lt") as never);
