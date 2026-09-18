import { Reflector } from "@nestjs/core";

import { PERMISSIONS } from "@kalo/platform-constants";

export const Permissions = Reflector.createDecorator<(typeof PERMISSIONS)[number][]>();
