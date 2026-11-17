import { NextResponse } from "next/server";
import { getHealth } from "@/services/health";

export function GET() {
  return NextResponse.json(getHealth());
}
