import type { GroupBase, SelectComponentsConfig, MenuPlacement } from "react-select";

import { InputComponent, OptionComponent, ControlComponent } from "./components";

export const getReactSelectProps = <
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
>({
  components,
  menuPlacement = "auto",
}: {
  components: SelectComponentsConfig<Option, IsMulti, Group>;
  menuPlacement?: MenuPlacement;
}): {
  menuPlacement: MenuPlacement;
  components: SelectComponentsConfig<Option, IsMulti, Group>;
  unstyled: true;
} => {
  return {
    menuPlacement,
    components: {
      Input: InputComponent,
      Option: OptionComponent,
      Control: ControlComponent,
      ...components,
    },
    unstyled: true,
  };
};
