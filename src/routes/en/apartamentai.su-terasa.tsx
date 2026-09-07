import { createFileRoute } from "@tanstack/react-router";

import { redirectToStaysRoute } from "@/pages/redirect-to-stays";

export const Route = createFileRoute("/en/apartamentai/su-terasa")(redirectToStaysRoute("en") as never);
