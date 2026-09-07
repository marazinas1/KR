import { createFileRoute } from "@tanstack/react-router";

import { banquetRoute } from "@/pages/banketine-sale";

export const Route = createFileRoute("/banketine-sale")(banquetRoute("lt") as never);
