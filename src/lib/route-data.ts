import { useLoaderData, useParams, useSearch } from "@tanstack/react-router";

/**
 * Loose, locale-agnostic route accessors. Shared page modules render under two
 * route trees (LT and /en), so they can't reference a single `Route` object;
 * the casts also keep TS from instantiating the full route-union generics.
 */
export function useLooseLoaderData<T>(): T {
  return (useLoaderData as unknown as (opts: { strict: false }) => T)({ strict: false });
}

export function useLooseSearch<T>(): T {
  return (useSearch as unknown as (opts: { strict: false }) => T)({ strict: false });
}

export function useLooseParams<T>(): T {
  return (useParams as unknown as (opts: { strict: false }) => T)({ strict: false });
}
