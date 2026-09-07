import { createFileRoute } from "@tanstack/react-router";

import { contactsRoute } from "@/pages/kontaktai";

export const Route = createFileRoute("/en/kontaktai")(contactsRoute("en") as never);
