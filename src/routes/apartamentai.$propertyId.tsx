import { createFileRoute } from "@tanstack/react-router";

import { propertyRoute } from "@/pages/apartamentai-property";

export const Route = createFileRoute("/apartamentai/$propertyId")(propertyRoute("lt") as never);
