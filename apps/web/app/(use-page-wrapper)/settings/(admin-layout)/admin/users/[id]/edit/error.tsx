"use client";

import { useLocale } from "@kalo/lib/hooks/useLocale";
import { Alert } from "@kalo/ui/components/alert";

export default function Error() {
  const { t } = useLocale();
  return <Alert severity="error" title={t("something_went_wrong")} />;
}
