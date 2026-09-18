import React from "react";
import type { Control, FieldValues } from "react-hook-form";

import {
  ScheduleComponent,
  type FieldPathByValue,
  type ScheduleLabelsType,
} from "@kalo/features/schedules/components/ScheduleComponent";
import useMeQuery from "@kalo/trpc/react/hooks/useMeQuery";
import type { TimeRange } from "@kalo/types/schedule";

const Schedule = <
  TFieldValues extends FieldValues,
  TPath extends FieldPathByValue<TFieldValues, TimeRange[][]>,
>(props: {
  name: TPath;
  control: Control<TFieldValues>;
  weekStart?: number;
  disabled?: boolean;
  labels?: ScheduleLabelsType;
  userTimeFormat?: number | null;
}) => {
  const query = useMeQuery();
  const { timeFormat } = query.data || { timeFormat: null };

  return <ScheduleComponent userTimeFormat={timeFormat} {...props} />;
};

export default Schedule;
