"use client";

import { useEffect } from "react";

type CssVariables = Record<string, string>;

// Sets up CSS variables based on Kalo brand colours.
const useKaloTheme = (theme: Record<string, CssVariables>) => {
  useEffect(() => {
    Object.entries(theme).forEach(([key, value]) => {
      if (!value) return;
      if (key === "root") {
        const root = document.documentElement;
        Object.entries(value).forEach(([key, value]) => {
          root.style.setProperty(`--${key}`, value);
        });
        return;
      }
      const elements = document.querySelectorAll(`.${key}`);
      const nestedEntries = Object.entries(value);
      nestedEntries.forEach(([nestedKey, nestedValue]) => {
        elements.forEach((element) => {
          (element as HTMLElement).style.setProperty(`--${nestedKey}`, nestedValue);
        });
      });
    });
  }, [theme]);
};

/** @deprecated Use useKaloTheme. Kept for compatibility with existing imports. */
const useCalcomTheme = useKaloTheme;

export { useKaloTheme, useCalcomTheme };
