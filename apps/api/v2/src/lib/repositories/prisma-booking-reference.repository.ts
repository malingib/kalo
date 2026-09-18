import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

import { PrismaBookingReferenceRepository as BasePrismaBookingReferenceRepository } from "@kalo/platform-libraries/repositories";

@Injectable()
export class PrismaBookingReferenceRepository extends BasePrismaBookingReferenceRepository {
  constructor(private readonly dbWrite: PrismaWriteService) {
    super({ prismaClient: dbWrite.prisma });
  }
}
