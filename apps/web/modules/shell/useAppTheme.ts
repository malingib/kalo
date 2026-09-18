"use client";

import getBrandColours from "@kalo/lib/getBrandColours";
import useTheme from "@kalo/lib/hooks/useTheme";
import useMeQuery from "@kalo/trpc/react/hooks/useMeQuery";
import { useCalcomTheme } from "@kalo/ui/styles";

export const useAppTheme = () => {
  const { data: user } = useMeQuery();
  const brandTheme = getBrandColours({
    lightVal: user?.brandColor,
    darkVal: user?.darkBrandColor,
  });
  useCalcomTheme(brandTheme);
  useTheme(user?.appTheme);
};
