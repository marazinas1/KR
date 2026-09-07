import { createFileRoute } from "@tanstack/react-router";

import { categoryRoute } from "@/pages/apartamentai-category";

export const Route = createFileRoute("/en/apartamentai/tipas/$categorySlug")(categoryRoute("en") as never);
