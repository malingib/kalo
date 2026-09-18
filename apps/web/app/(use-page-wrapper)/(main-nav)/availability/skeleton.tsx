"use client";

import SkeletonLoader from "@kalo/features/availability/components/SkeletonLoader";
import { useLocale } from "@kalo/lib/hooks/useLocale";
import { ShellMainAppDir } from "app/(use-page-wrapper)/(main-nav)/ShellMainAppDir";
import { AvailabilityCTA } from "~/availability/availability-view";

export default function AvailabilityLoader() {
  const { t } = useLocale();

  return (
    <ShellMainAppDir
      heading={t("availability")}
      subtitle={t("configure_availability")}
      CTA={<AvailabilityCTA />}>
      <SkeletonLoader />
    </ShellMainAppDir>
  );
}
