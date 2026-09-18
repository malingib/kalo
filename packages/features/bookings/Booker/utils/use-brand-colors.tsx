import useGetBrandingColours from "@kalo/lib/getBrandColours";
import useTheme from "@kalo/lib/hooks/useTheme";
import { useCalcomTheme } from "@kalo/ui/styles";

export const useBrandColors = ({
  brandColor,
  darkBrandColor,
  theme,
}: {
  brandColor?: string;
  darkBrandColor?: string;
  theme?: string | null;
}) => {
  const brandTheme = useGetBrandingColours({
    lightVal: brandColor,
    darkVal: darkBrandColor,
  });

  useCalcomTheme(brandTheme);
  useTheme(theme);
};
