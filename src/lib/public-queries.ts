import { queryOptions } from "@tanstack/react-query";

import { getPublicOrg, getVacancy, listVacancies } from "@/lib/public-vacancies.functions";

export const vacanciesQuery = queryOptions({
  queryKey: ["public", "vacancies"],
  queryFn: () => listVacancies(),
  staleTime: 60_000,
});

export const vacancyQuery = (id: string) =>
  queryOptions({
    queryKey: ["public", "vacancy", id],
    queryFn: () => getVacancy({ data: { id } }),
    staleTime: 60_000,
  });

export const publicOrgQuery = queryOptions({
  queryKey: ["public", "org"],
  queryFn: () => getPublicOrg(),
  staleTime: 300_000,
});
