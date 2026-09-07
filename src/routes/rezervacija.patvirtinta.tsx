import { createFileRoute } from "@tanstack/react-router";

import { confirmationRoute } from "@/pages/rezervacija-patvirtinta";

export const Route = createFileRoute("/rezervacija/patvirtinta")(confirmationRoute("lt") as never);
