// Mock authentication for development when OAuth is not configured
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";

export function registerMockAuthRoutes(app: Express) {
  // Mock login endpoint - creates a session without OAuth
  app.get("/api/mock-login", async (req: Request, res: Response) => {
    try {
      const mockOpenId = "dev-user-" + Date.now();
      const mockName = "Dev User";

      // Create or update user in database
      await db.upsertUser({
        openId: mockOpenId,
        name: mockName,
        email: "dev@example.com",
        loginMethod: "mock",
        lastSignedIn: new Date(),
      });

      // Try to create session token, but if it fails, just set a simple cookie
      let sessionToken: string;
      try {
        sessionToken = await sdk.createSessionToken(mockOpenId, {
          name: mockName,
          expiresInMs: ONE_YEAR_MS,
        });
      } catch (error) {
        console.warn("[Mock Auth] Failed to create JWT token, using simple cookie:", error);
        // Fallback: just use the openId as a simple token for development
        sessionToken = mockOpenId;
      }

      // Set cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Redirect to home
      res.redirect(302, "/");
    } catch (error) {
      console.error("[Mock Auth] Login failed", error);
      res.status(500).json({ error: "Mock login failed" });
    }
  });

  // Mock admin login endpoint - creates an admin session
  app.get("/api/mock-login-admin", async (req: Request, res: Response) => {
    try {
      const mockOpenId = "dev-admin-" + Date.now();
      const mockName = "Dev Admin";

      // Create or update user in database with admin role
      await db.upsertUser({
        openId: mockOpenId,
        name: mockName,
        email: "admin@example.com",
        loginMethod: "mock",
        role: "admin",
        lastSignedIn: new Date(),
      });

      // Try to create session token, but if it fails, just set a simple cookie
      let sessionToken: string;
      try {
        sessionToken = await sdk.createSessionToken(mockOpenId, {
          name: mockName,
          expiresInMs: ONE_YEAR_MS,
        });
      } catch (error) {
        console.warn("[Mock Auth] Failed to create JWT token, using simple cookie:", error);
        // Fallback: just use the openId as a simple token for development
        sessionToken = mockOpenId;
      }

      // Set cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Redirect to home
      res.redirect(302, "/");
    } catch (error) {
      console.error("[Mock Auth] Admin login failed", error);
      res.status(500).json({ error: "Mock admin login failed" });
    }
  });
}
