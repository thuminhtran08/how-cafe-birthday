import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const BRANCHES = new Set(["Nguyễn Văn Lộc", "Nguyễn Thị Thập", "Trấn Vũ", "Láng Hạ", "Võng Thị"]);
const ALLOWED_FIELDS = new Set(["name", "phone", "email", "branch", "zalo"]);
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 8;

type RateEntry = { count: number; resetAt: number };
const globalRate = globalThis as typeof globalThis & {
  __howCheckInRate?: Map<string, RateEntry>;
};
const rateStore = globalRate.__howCheckInRate ?? new Map<string, RateEntry>();
globalRate.__howCheckInRate = rateStore;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function getClientKey(request: NextRequest) {
  // Used only transiently for abuse prevention; never persisted with check-in data.
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

function rateLimited(key: string) {
  const now = Date.now();
  const current = rateStore.get(key);
  if (!current || current.resetAt <= now) {
    rateStore.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  current.count += 1;
  rateStore.set(key, current);
  return current.count > MAX_REQUESTS;
}

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
}

export async function POST(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === "production") {
      const proto = request.headers.get("x-forwarded-proto");
      if (proto && proto !== "https") return json({ ok: false, message: "Yêu cầu không hợp lệ." }, 400);
    }

    // Endpoint is not session/cookie-authenticated. Enforce same-origin for browser submissions.
    const origin = request.headers.get("origin");
    if (origin && origin !== request.nextUrl.origin) {
      return json({ ok: false, message: "Yêu cầu không hợp lệ." }, 403);
    }

    const clientKey = getClientKey(request);
    if (rateLimited(clientKey)) {
      return json({ ok: false, message: "Bạn thao tác quá nhanh. Vui lòng thử lại sau." }, 429);
    }

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.toLowerCase().startsWith("application/json")) {
      return json({ ok: false, message: "Yêu cầu không hợp lệ." }, 415);
    }

    const raw: unknown = await request.json();
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return json({ ok: false, message: "Dữ liệu chưa hợp lệ." }, 400);
    }

    const body = raw as Record<string, unknown>;
    const keys = Object.keys(body);
    if (keys.some((key) => !ALLOWED_FIELDS.has(key)) || keys.length !== 5) {
      return json({ ok: false, message: "Dữ liệu chưa hợp lệ." }, 400);
    }

    const name = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
    const phone = typeof body.phone === "string" ? normalizePhone(body.phone.trim()) : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const branch = typeof body.branch === "string" ? body.branch : "";
    const zalo = body.zalo === true;

    const errors: Record<string, string> = {};

    if (name.length < 2 || name.length > 80 || /[<>]/.test(name)) {
      errors.name = "Họ và tên chưa hợp lệ";
    }
    if (!/^(?:0|\+84)(?:3|5|7|8|9)\d{8}$/.test(phone)) {
      errors.phone = "Số điện thoại chưa đúng định dạng";
    }
    if (
      email.length > 254 ||
      !/^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(email) ||
      /[<>"'`\\]/.test(email)
    ) {
      errors.email = "Email chưa đúng định dạng";
    }
    if (!BRANCHES.has(branch)) {
      errors.branch = "Vui lòng chọn cơ sở tham gia";
    }
    if (!zalo) {
      errors.zalo = "Vui lòng xác nhận trạng thái Zalo OA";
    }

    if (Object.keys(errors).length) {
      return json({ ok: false, errors }, 400);
    }

    // Do not log PII here.
    // IMPORTANT: checkbox `zalo` is only a user confirmation. If following OA is mandatory,
    // replace this with an official server-side Zalo verification flow before granting eligibility.
    //
    // DATABASE:
    // Connect your server-only ORM/database here and persist ONLY:
    // { name, phone, email, branch, zaloConfirmedByUser: true }
    // Keep DB/service-role credentials in server environment variables only.
    // Use ORM/parameterized queries; never concatenate these values into SQL.

    return json({ ok: true }, 200);
  } catch {
    // Never return stack traces, DB errors, request bodies, email or phone.
    return json({ ok: false, message: "Chưa thể xác nhận tham gia. Vui lòng thử lại." }, 500);
  }
}
