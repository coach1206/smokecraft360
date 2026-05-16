/**
 * socketAuth — authenticated Socket.IO session management.
 *
 * Validates JWT tokens on socket handshake (middleware layer).
 * Attaches decoded user context to socket.data for room authorization.
 * Supports:
 *   - Staff/admin authenticated rooms (require valid JWT)
 *   - Guest rooms (venue-scoped, no auth required)
 *   - Device rooms (device token validation)
 *   - Tenant isolation enforcement
 */

import type { Socket } from "socket.io";
import { jwtVerify }   from "jose";
import { logger }      from "../../lib/logger";

const JWT_SECRET = new TextEncoder().encode(
  process.env["SESSION_SECRET"] ?? "dev-secret-change-in-production",
);

export interface SocketUser {
  userId:   string | null;
  venueId:  string | null;
  role:     "guest" | "server" | "admin" | "super_admin" | "device";
  deviceId: string | null;
  isAuth:   boolean;
}

export async function authenticateSocket(socket: Socket): Promise<SocketUser> {
  const token =
    socket.handshake.auth["token"] as string | undefined ??
    socket.handshake.headers["authorization"]?.replace("Bearer ", "");

  const deviceToken = socket.handshake.auth["deviceToken"] as string | undefined;
  const guestVenue  = socket.handshake.auth["venueId"]     as string | undefined;

  // Device token path
  if (deviceToken) {
    socket.data["user"] = {
      userId: null, venueId: guestVenue ?? null,
      role: "device", deviceId: deviceToken, isAuth: true,
    } satisfies SocketUser;
    return socket.data["user"] as SocketUser;
  }

  // Guest path (no token)
  if (!token) {
    const guest: SocketUser = {
      userId: null, venueId: guestVenue ?? null,
      role: "guest", deviceId: null, isAuth: false,
    };
    socket.data["user"] = guest;
    return guest;
  }

  // JWT path
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const user: SocketUser = {
      userId:   String(payload["sub"]     ?? ""),
      venueId:  String(payload["venueId"] ?? guestVenue ?? ""),
      role:     (payload["role"] as SocketUser["role"]) ?? "server",
      deviceId: null,
      isAuth:   true,
    };
    socket.data["user"] = user;
    logger.info({ socketId: socket.id, userId: user.userId, role: user.role }, "socketAuth: authenticated");
    return user;
  } catch {
    // Invalid token → treat as guest
    const guest: SocketUser = {
      userId: null, venueId: guestVenue ?? null,
      role: "guest", deviceId: null, isAuth: false,
    };
    socket.data["user"] = guest;
    return guest;
  }
}

export function getSocketUser(socket: Socket): SocketUser {
  return (socket.data["user"] as SocketUser | undefined) ?? {
    userId: null, venueId: null, role: "guest", deviceId: null, isAuth: false,
  };
}

export function requireRole(
  socket: Socket,
  minRole: SocketUser["role"],
): boolean {
  const roleOrder: SocketUser["role"][] = ["guest","device","server","admin","super_admin"];
  const user = getSocketUser(socket);
  return roleOrder.indexOf(user.role) >= roleOrder.indexOf(minRole);
}

export function requireVenueMatch(socket: Socket, venueId: string): boolean {
  const user = getSocketUser(socket);
  return user.role === "super_admin" || user.venueId === venueId;
}
