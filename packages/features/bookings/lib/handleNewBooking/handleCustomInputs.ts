import { isValidPhoneNumber } from "libphonenumber-js/max";
import z from "zod";

import type { EventTypeCustomInput } from "@kalo/prisma/client";

type CustomInput = {
  value: string | boolean;
  label: string;
};

export function handleCustomInputs(
  eventTypeCustomInputs: EventTypeCustomInput[],
  reqCustomInputs: CustomInput[]
) {
  eventTypeCustomInputs.forEach((etcInput) => {
    if (etcInput.required) {
      const input = reqCustomInputs.find((input) => input.label === etcInput.label);
      validateInput(etcInput, input?.value);
    }
  });
}

function validateInput(etcInput: EventTypeCustomInput, value: string | boolean | undefined) {
  const errorMessage = `Missing ${etcInput.type} customInput: '${etcInput.label}'`;

  if (etcInput.type === "BOOL") {
    validateBooleanInput(value, errorMessage);
  } else if (etcInput.type === "PHONE") {
    validatePhoneInput(value, errorMessage);
  } else {
    validateStringInput(value, errorMessage);
  }
}

function validateBooleanInput(value: string | boolean | undefined, errorMessage: string) {
  z.boolean().refine((input) => input, { message: errorMessage }).parse(value);
}

function validatePhoneInput(value: string | boolean | undefined, errorMessage: string) {
  z.string()
    .min(1, { message: errorMessage })
    .refine((val) => isValidPhoneNumber(val), {
      message: "Phone number is invalid",
    })
    .parse(value);
}

function validateStringInput(value: string | boolean | undefined, errorMessage: string) {
  z.string().min(1, { message: errorMessage })
    .parse(value);
}
