import { createFileRoute } from "@tanstack/react-router";

import { propertyRoute } from "@/pages/apartamentai-property";

export const Route = createFileRoute("/en/apartamentai/$propertyId")(propertyRoute("en") as never);
