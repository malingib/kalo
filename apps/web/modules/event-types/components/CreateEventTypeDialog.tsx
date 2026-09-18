import { Dialog } from "@kalo/features/components/controlled-dialog";
import CreateEventTypeForm from "@kalo/features/eventtypes/components/CreateEventTypeForm";
import { useLocale } from "@kalo/lib/hooks/useLocale";
import { useTypedQuery } from "@kalo/lib/hooks/useTypedQuery";
import type { EventType } from "@kalo/prisma/client";
import type { MembershipRole } from "@kalo/prisma/enums";
import { SchedulingType } from "@kalo/prisma/enums";
import { trpc } from "@kalo/trpc/react";
import { Button } from "@kalo/ui/components/button";
import { DialogClose, DialogContent, DialogFooter } from "@kalo/ui/components/dialog";
import { showToast } from "@kalo/ui/components/toast";
import { isValidPhoneNumber } from "libphonenumber-js/max";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useCreateEventType } from "~/event-types/hooks/useCreateEventType";

const WEBSITE_URL = process.env.NEXT_PUBLIC_WEBSITE_URL ?? "";

// this describes the uniform data needed to create a new event type on Profile or Team
export interface EventTypeParent {
  teamId: number | null | undefined; // if undefined, then it's a profile
  membershipRole?: MembershipRole | null;
  name?: string | null;
  slug?: string | null;
  image?: string | null;
}

export interface ProfileOption {
  teamId: number | null | undefined;
  label: string | null;
  image: string;
  membershipRole: MembershipRole | null | undefined;
  slug: string | null;
  permissions: {
    canCreateEventType: boolean;
  };
}

const locationFormSchema = z.array(
  z.object({
    locationType: z.string(),
    locationAddress: z.string().optional(),
    displayLocationPublicly: z.boolean().optional(),
    locationPhoneNumber: z
      .string()
      .refine((val) => isValidPhoneNumber(val))
      .optional(),
    locationLink: z.string().url().optional(), // URL validates as new URL() - which requires HTTPS:// In the input field
  })
);

const querySchema = z.object({
  eventPage: z.string().optional(),
  teamId: z.union([z.string().transform((val) => +val), z.number()]).optional(),
  title: z.string().optional(),
  slug: z.string().optional(),
  length: z.union([z.string().transform((val) => +val), z.number()]).optional(),
  description: z.string().optional(),
  schedulingType: z.nativeEnum(SchedulingType).optional(),
  locations: z
    .string()
    .transform((jsonString) => locationFormSchema.parse(JSON.parse(jsonString)))
    .optional(),
});

export function CreateEventTypeDialog({ profileOptions }: { profileOptions: ProfileOption[] }) {
  const { t } = useLocale();
  const router = useRouter();
  const orgBranding = null;

  const {
    data: { teamId, eventPage: pageSlug },
  } = useTypedQuery(querySchema);

  const teamProfile = profileOptions.find((profile) => profile.teamId === teamId);

  const permissions = teamProfile?.permissions ?? { canCreateEventType: false };

  const onSuccessMutation = (eventType: EventType) => {
    router.replace(`/event-types/${eventType.id}${teamId ? "?tabName=team" : ""}`);
    showToast(
      t("event_type_created_successfully", {
        eventTypeTitle: eventType.title,
      }),
      "success"
    );
  };

  const onErrorMutation = (err: string) => {
    showToast(err, "error");
  };

  const SubmitButton = (isPending: boolean) => {
    return (
      <DialogFooter showDivider>
        <DialogClose />
        <Button type="submit" loading={isPending}>
          {t("continue")}
        </Button>
      </DialogFooter>
    );
  };

  const { form, createMutation, isManagedEventType } = useCreateEventType(onSuccessMutation, onErrorMutation);

  const urlPrefix = WEBSITE_URL;

  return (
    <Dialog
      name="new"
      clearQueryParamsOnClose={["eventPage", "type", "description", "title", "length", "slug", "locations"]}>
      <DialogContent
        type="creation"
        enableOverflow
        title={teamId ? t("add_new_team_event_type") : t("add_new_event_type")}
        description={t("new_event_type_to_book_description")}>
        {teamId ? null : (
          <CreateEventTypeForm
            urlPrefix={urlPrefix}
            isPending={createMutation.isPending}
            form={form}
            isManagedEventType={isManagedEventType}
            handleSubmit={(values) => {
              createMutation.mutate(values);
            }}
            SubmitButton={SubmitButton}
            pageSlug={pageSlug}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
