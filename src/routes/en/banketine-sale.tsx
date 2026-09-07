import { createFileRoute } from "@tanstack/react-router";

import { banquetRoute } from "@/pages/banketine-sale";

export const Route = createFileRoute("/en/banketine-sale")(banquetRoute("en") as never);
