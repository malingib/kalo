import { revalidateAvailabilityList } from "app/(use-page-wrapper)/(main-nav)/availability/actions";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { Dialog } from "@kalo/features/components/controlled-dialog";
import { useLocale } from "@kalo/lib/hooks/useLocale";
import { HttpError } from "@kalo/lib/http-error";
import { trpc } from "@kalo/trpc/react";
import { Button } from "@kalo/ui/components/button";
import { DialogContent, DialogFooter, DialogTrigger, DialogClose } from "@kalo/ui/components/dialog";
import { Form } from "@kalo/ui/components/form";
import { InputField } from "@kalo/ui/components/form";
import { showToast } from "@kalo/ui/components/toast";

export function NewScheduleButton({
  name = "new-schedule",
  fromEventType,
}: {
  name?: string;
  fromEventType?: boolean;
}) {
  const router = useRouter();
  const { t } = useLocale();

  const form = useForm<{
    name: string;
  }>();
  const { register } = form;
  const utils = trpc.useUtils();

  const createMutation = trpc.viewer.availability.schedule.create.useMutation({
    onSuccess: async ({ schedule }) => {
      await router.push(`/availability/${schedule.id}${fromEventType ? "?fromEventType=true" : ""}`);
      showToast(t("schedule_created_successfully", { scheduleName: schedule.name }), "success");
      revalidateAvailabilityList();
      utils.viewer.availability.list.setData(undefined, (data) => {
        const newSchedule = { ...schedule, isDefault: false, availability: [] };
        if (!data)
          return {
            schedules: [newSchedule],
          };
        return {
          ...data,
          schedules: [...data.schedules, newSchedule],
        };
      });
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }

      if (err.data?.code === "UNAUTHORIZED") {
        const message = `${err.data.code}: ${t("error_schedule_unauthorized_create")}`;
        showToast(message, "error");
      }
    },
  });

  return (
    <Dialog name={name} clearQueryParamsOnClose={["copy-schedule-id"]}>
      <DialogTrigger asChild>
        <Button variant="fab" data-testid={name} StartIcon="plus" size="sm">
          {t("new")}
        </Button>
      </DialogTrigger>
      <DialogContent title={t("add_new_schedule")}>
        <Form
          form={form}
          handleSubmit={(values) => {
            createMutation.mutate(values);
          }}>
          <InputField
            label={t("name")}
            type="text"
            id="name"
            required
            placeholder={t("default_schedule_name")}
            {...register("name", {
              setValueAs: (v) => (!v || v.trim() === "" ? null : v),
            })}
          />
          <DialogFooter>
            <DialogClose />
            <Button type="submit" loading={createMutation.isPending}>
              {t("continue")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
