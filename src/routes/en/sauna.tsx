import { createFileRoute } from "@tanstack/react-router";

import { saunaRoute } from "@/pages/sauna";

export const Route = createFileRoute("/en/sauna")(saunaRoute("en") as never);
