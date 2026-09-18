import { Reflector } from "@nestjs/core";

import { MembershipRole } from "@kalo/platform-libraries";

export const MembershipRoles = Reflector.createDecorator<MembershipRole[]>();
