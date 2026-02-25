import jwt from "jsonwebtoken";
import type { Role } from "../types/auth.js";
import { env } from "../config/env.js";

interface AccessClaims {
  sub: string;
  email: string;
  role: Role;
  type: "access";
}

interface RefreshClaims {
  sub: string;
  email: string;
  role: Role;
  type: "refresh";
}

function parseDurationToSeconds(value: string): number {
  const match = value.trim().match(/^(\d+)([smhd])$/i);
  if (!match) {
    throw new Error(`Unsupported duration format: ${value}`);
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  if (unit === "s") return amount;
  if (unit === "m") return amount * 60;
  if (unit === "h") return amount * 3600;
  return amount * 86400;
}

export function ttlToDate(ttl: string): Date {
  return new Date(Date.now() + parseDurationToSeconds(ttl) * 1000);
}

export function createAccessToken(payload: Omit<AccessClaims, "type">): string {
  return jwt.sign({ ...payload, type: "access" }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions["expiresIn"],
  });
}

export function createRefreshToken(payload: Omit<RefreshClaims, "type">): string {
  return jwt.sign({ ...payload, type: "refresh" }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_TTL as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AccessClaims {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessClaims;
}

export function verifyRefreshToken(token: string): RefreshClaims {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshClaims;
}
