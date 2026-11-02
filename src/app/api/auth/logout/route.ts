import { NextResponse } from "next/server";
import { checkJsonRequest } from "@/lib/api";
import { clearSession } from "@/lib/auth";

export async function POST(request: Request) {
  const invalidRequest = checkJsonRequest(request);
  if (invalidRequest) return invalidRequest;

  try {
    await clearSession();
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    console.error("退出登录失败", error);
    return NextResponse.json(
      { error: "退出登录失败" },
      { status: 500 },
    );
  }
}
