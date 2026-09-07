import { useTranslation } from "react-i18next";
import { CheckCircle2, Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type IntegrationCard = {
  key: string;
  name: string;
  description: string;
  status: "connected" | "coming_soon";
  detail?: string;
};

export function IntegrationsSection({ items }: { items: IntegrationCard[] }) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <span aria-hidden>🔌</span>
          {t("settings.integrations.title")}
        </CardTitle>
        <CardDescription>
          {t("settings.integrations.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {items.map((it) => (
          <div
            key={it.key}
            className="flex flex-col justify-between gap-3 rounded-lg border p-4"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold">{it.name}</h3>
                {it.status === "connected" ? (
                  <Badge className="gap-1 whitespace-nowrap">
                    <CheckCircle2 className="h-3 w-3" />
                    {t("settings.integrations.connected")}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1 whitespace-nowrap">
                    <Clock className="h-3 w-3" />
                    {t("settings.integrations.comingSoon")}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{it.description}</p>
            </div>
            {it.detail && (
              <p className="text-xs font-medium text-muted-foreground">{it.detail}</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}