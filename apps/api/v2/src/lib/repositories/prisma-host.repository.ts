import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

import { PrismaHostRepository as PrismaHostRepositoryLib } from "@kalo/platform-libraries/repositories";
import type { PrismaClient } from "@kalo/prisma";

@Injectable()
export class PrismaHostRepository extends PrismaHostRepositoryLib {
  constructor(private readonly dbWrite: PrismaWriteService) {
    super(dbWrite.prisma as unknown as PrismaClient);
  }
}
