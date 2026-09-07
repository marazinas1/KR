import { createFileRoute } from "@tanstack/react-router";

import { categoryRoute } from "@/pages/apartamentai-category";

export const Route = createFileRoute("/apartamentai/tipas/$categorySlug")(categoryRoute("lt") as never);
