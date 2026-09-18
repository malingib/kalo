"use client";

import type { FilterableColumn } from "@kalo/features/data-table/lib/types";
import { ColumnFilterType, ZSingleSelectFilterValue } from "@kalo/features/data-table/lib/types";
import type { FilterType } from "@kalo/types/data-table";
import { useDataTable } from "~/data-table/hooks";
import { BaseSelectFilterOptions } from "./BaseSelectFilterOptions";

export type SingleSelectFilterOptionsProps = {
  column: Extract<FilterableColumn, { type: Extract<FilterType, "ss"> }>;
};

export function SingleSelectFilterOptions({ column }: SingleSelectFilterOptionsProps) {
  const { updateFilter } = useDataTable();

  return (
    <BaseSelectFilterOptions<Extract<FilterType, "ss">>
      column={column}
      filterValueSchema={ZSingleSelectFilterValue}
      testIdPrefix="select-filter-options"
      isOptionSelected={(filterValue, optionValue) => filterValue?.data === optionValue}
      onOptionSelect={(column, filterValue, optionValue) => {
        updateFilter(column.id, { type: ColumnFilterType.SINGLE_SELECT, data: optionValue });
      }}
    />
  );
}
