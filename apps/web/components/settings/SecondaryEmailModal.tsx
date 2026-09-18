import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Dialog } from "@kalo/features/components/controlled-dialog";
import { emailSchema } from "@kalo/lib/emailSchema";
import { useLocale } from "@kalo/lib/hooks/useLocale";
import { Button } from "@kalo/ui/components/button";
import { DialogContent, DialogFooter, DialogClose } from "@kalo/ui/components/dialog";
import { Form, TextField, InputError } from "@kalo/ui/components/form";

interface SecondaryEmailModalProps {
  isLoading: boolean;
  errorMessage?: string;
  handleAddEmail: (value: { email: string }) => void;
  onCancel: () => void;
  clearErrorMessage: () => void;
}

const SecondaryEmailModal = ({
  isLoading,
  errorMessage,
  handleAddEmail,
  onCancel,
  clearErrorMessage,
}: SecondaryEmailModalProps) => {
  const { t } = useLocale();
  type FormValues = {
    email: string;
  };
  const formMethods = useForm<FormValues>({
    resolver: zodResolver(
      z.object({
        email: emailSchema,
      })
    ),
  });

  useEffect(() => {
    // We will reset the errorMessage once the user starts modifying the email
    const subscription = formMethods.watch(() => clearErrorMessage());
    return () => subscription.unsubscribe();
  }, [formMethods.watch]);

  return (
    <Dialog open={true}>
      <DialogContent
        title={t("add_email")}
        description={t("add_email_description")}
        type="creation"
        data-testid="secondary-email-add-dialog">
        <Form form={formMethods} handleSubmit={handleAddEmail}>
          <div className="text-subtle mb-4 text-sm">{t("change_email_hint")}</div>
          <TextField
            label={t("email_address")}
            data-testid="secondary-email-input"
            {...formMethods.register("email")}
          />
          {errorMessage && <InputError message={errorMessage} />}
          <DialogFooter showDivider className="mt-10">
            <DialogClose onClick={onCancel}>{t("cancel")}</DialogClose>
            <Button type="submit" data-testid="add-secondary-email-button" disabled={isLoading}>
              {t("add_email")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default SecondaryEmailModal;
