"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo, useEffect } from "react";
import { z } from "zod";

import { useRouterQuery } from "./useRouterQuery";

type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

type ArrayKeys<T> = {
  [K in keyof T]-?: T[K] extends unknown[] ? K : never;
}[keyof T];

const toSearchParams = (query: Record<string, unknown>) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, String(item)));
    } else {
      params.set(key, String(value));
    }
  });
  return params;
};

// Take array as a string and return zod array
export const queryNumberArray = z
  .string()
  .or(z.number())
  .or(z.array(z.number()))
  .transform((a) => {
    if (typeof a === "string") return a.split(",").map((a) => Number(a));
    if (Array.isArray(a)) return a;
    return [a];
  });

// Take string and return zod string array - comma separated
export const queryStringArray = z
  .preprocess((a) => z.string().parse(a).split(","), z.string().array())
  .or(z.string().array());

export function useTypedQuery<T extends z.ZodObject>(schema: T) {
  type Output = z.output<T>;
  type OutputKeys = keyof Output;
  type OutputOptionalKeys = OptionalKeys<Output>;
  type ArrayOutputKeys = ArrayKeys<Output>;
  const router = useRouter();
  const unparsedQuery = useRouterQuery();
  const pathname = usePathname();
  const parsedQuerySchema = schema.safeParse(unparsedQuery);
  let parsedQuery: Output = useMemo(() => {
    return {} as Output;
  }, []);

  useEffect(() => {
    if (parsedQuerySchema.success && parsedQuerySchema.data) {
      Object.entries(parsedQuerySchema.data).forEach(([key, value]) => {
        if (key in unparsedQuery || !value) return;
        const search = toSearchParams(parsedQuerySchema.data as Record<string, unknown>);
        search.set(String(key), String(value));
        router.replace(`${pathname}?${search.toString()}`);
      });
    }
  }, [parsedQuerySchema, schema, router, pathname, unparsedQuery]);

  if (parsedQuerySchema.success) parsedQuery = parsedQuerySchema.data;
  else if (!parsedQuerySchema.success) console.error(parsedQuerySchema.error);

  const setQuery = useCallback(
    function setQuery<J extends OutputKeys>(key: J, value: Output[J]) {
      const search = toSearchParams(parsedQuery as Record<string, unknown>);
      search.set(String(key), String(value));
      router.replace(`${pathname}?${search.toString()}`);
    },
    [parsedQuery, router, pathname]
  );

  function removeByKey(key: OutputOptionalKeys) {
    const search = toSearchParams(parsedQuery as Record<string, unknown>);
    search.delete(String(key));
    router.replace(`${pathname}?${search.toString()}`);
  }

  function pushItemToKey<J extends ArrayOutputKeys>(
    key: J,
    value: Output[J] extends (infer Item)[] ? Item : never
  ) {
    const existingValue = parsedQuery[key];
    if (Array.isArray(existingValue)) {
      if (existingValue.includes(value)) return;
      setQuery(key, [...existingValue, value] as Output[J]);
    } else {
      setQuery(key, [value] as Output[J]);
    }
  }

  function removeItemByKeyAndValue<J extends ArrayOutputKeys>(
    key: J,
    value: Output[J] extends (infer Item)[] ? Item : never
  ) {
    const existingValue = parsedQuery[key];
    if (Array.isArray(existingValue) && existingValue.length > 1) {
      const newValue = existingValue.filter((item) => item !== value);
      setQuery(key, newValue as Output[J]);
    } else {
      removeByKey(key as unknown as OutputOptionalKeys);
    }
  }

  function removeAllQueryParams() {
    if (pathname !== null) {
      router.replace(pathname);
    }
  }

  return {
    data: parsedQuery,
    setQuery,
    removeByKey,
    pushItemToKey,
    removeItemByKeyAndValue,
    removeAllQueryParams,
  };
}
