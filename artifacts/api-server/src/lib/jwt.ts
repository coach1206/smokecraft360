import { SignJWT, jwtVerify, type JWTPayload as JosePayload } from "jose";

const secret = new TextEncoder().encode(
  process.env["SESSION_SECRET"] ?? "smokecraft-dev-secret-change-in-production",
);
const ALG    = "HS256";
const EXPIRY = "7d";

export interface JWTPayload {
  sub:     string;
  email:   string;
  role:    string;
  name:    string;
  venueId?: string | null;
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, secret);
  return payload as unknown as JWTPayload;
}
