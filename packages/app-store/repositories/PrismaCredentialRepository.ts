import { buildNonDelegationCredentials } from "@kalo/lib/delegationCredential";
import { prisma } from "@kalo/prisma";
import type { Prisma } from "@kalo/prisma/client";  
import type { AppCategories } from "@kalo/prisma/client";
import { credentialForCalendarServiceSelect } from "@kalo/prisma/selects/credential";

export class PrismaCredentialRepository {
    constructor(private readonly prismaClient: typeof prisma){}

    async findNonDelegationCredentialsByAppCategories({
        idToSearchObject,  
        appCategories,
    }: {
        idToSearchObject: Prisma.CredentialWhereInput;  
        appCategories: AppCategories[];  
    }){

        const credentials = await this.prismaClient.credential.findMany({
            where: {
                ...idToSearchObject,
                app: {
                    categories: {
                        hasSome: appCategories
                    }
                }
            },
            select: {
                ...credentialForCalendarServiceSelect,
                team: {
                    select: {
                        name: true
                    }
                }
            }
        })


        return buildNonDelegationCredentials(credentials)
    }
}