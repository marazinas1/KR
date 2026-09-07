import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPropertySettings } from "@/lib/property-settings.functions";
import { pageTitle } from "@/lib/brand";

/**
 * Nustato naršyklės kortelės pavadinimą pagal objekto pavadinimą iš nustatymų.
 * Naudoti TIK autentifikuotuose (admin) puslapiuose.
 */
export function useBrandedTitle(page: string) {
  const fetchSettings = useServerFn(getPropertySettings);
  const { data } = useQuery({
    queryKey: ["property-settings"],
    queryFn: () => fetchSettings(),
  });
  const brand = data?.settings.displayName;

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.title = pageTitle(page, brand);
  }, [page, brand]);
}
