import getIP from "@kalo/lib/getIP";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const requestorIp = getIP(req);
  return NextResponse.json({ ip: requestorIp });
}
