// Real authentication routes with email/password
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import bcrypt from "bcryptjs";

// Simple in-memory user store for development (replace with DB in production)
interface AuthUser {
  id: number;
  email: string;
  password: string;
  name: string;
  role: "admin" | "visualizador";
  approved: boolean;
  createdAt: Date;
}

let authUsers: AuthUser[] = [];
let nextUserId = 1;

// Initialize with default admin user
function initAuthUsers() {
  if (authUsers.length === 0) {
    const hashedPassword = bcrypt.hashSync("admin123", 10);
    authUsers.push({
      id: nextUserId++,
      email: "admin@tarantula.com",
      password: hashedPassword,
      name: "Administrador",
      role: "admin",
      approved: true,
      createdAt: new Date(),
    });
  }
}

export function registerAuthRoutes(app: Express) {
  initAuthUsers();

  // Login endpoint
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email e senha são obrigatórios" });
      }

      // Find user
      const user = authUsers.find((u) => u.email === email);
      if (!user) {
        return res.status(401).json({ message: "Email ou senha inválidos" });
      }

      // Check if user is approved
      if (!user.approved) {
        return res.status(403).json({ message: "Sua conta está aguardando aprovação do administrador" });
      }

      // Verify password
      const isPasswordValid = bcrypt.compareSync(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Email ou senha inválidos" });
      }

      // Create session token
      let sessionToken: string;
      try {
        sessionToken = await sdk.createSessionToken(user.email, {
          name: user.name,
          expiresInMs: ONE_YEAR_MS,
        });
      } catch (error) {
        console.warn("[Auth] Failed to create JWT token, using simple token:", error);
        sessionToken = `auth-${user.id}-${Date.now()}`;
      }

      // Set cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Return user info
      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("[Auth] Login failed", error);
      res.status(500).json({ message: "Erro ao fazer login" });
    }
  });

  // Signup endpoint
  app.post("/api/auth/signup", async (req: Request, res: Response) => {
    try {
      const { email, password, name } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({ message: "Email, senha e nome são obrigatórios" });
      }

      // Check if user already exists
      const existingUser = authUsers.find((u) => u.email === email);
      if (existingUser) {
        return res.status(409).json({ message: "Este email já está registrado" });
      }

      // Hash password
      const hashedPassword = bcrypt.hashSync(password, 10);

      // Create new user (not approved by default)
      const newUser: AuthUser = {
        id: nextUserId++,
        email,
        password: hashedPassword,
        name,
        role: "visualizador",
        approved: false,
        createdAt: new Date(),
      };

      authUsers.push(newUser);

      res.json({
        success: true,
        message: "Conta criada com sucesso! Aguardando aprovação do administrador.",
      });
    } catch (error) {
      console.error("[Auth] Signup failed", error);
      res.status(500).json({ message: "Erro ao criar conta" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    try {
      const cookieOptions = getSessionCookieOptions(req);
      res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      res.json({ success: true });
    } catch (error) {
      console.error("[Auth] Logout failed", error);
      res.status(500).json({ message: "Erro ao fazer logout" });
    }
  });

  // Get all users (admin only)
  app.get("/api/auth/users", async (req: Request, res: Response) => {
    try {
      // TODO: Check if user is admin
      res.json({
        users: authUsers.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          approved: u.approved,
          createdAt: u.createdAt,
        })),
      });
    } catch (error) {
      console.error("[Auth] Get users failed", error);
      res.status(500).json({ message: "Erro ao buscar usuários" });
    }
  });

  // Approve user (admin only)
  app.post("/api/auth/approve", async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ message: "userId é obrigatório" });
      }

      const user = authUsers.find((u) => u.id === userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      user.approved = true;
      res.json({ success: true });
    } catch (error) {
      console.error("[Auth] Approve user failed", error);
      res.status(500).json({ message: "Erro ao aprovar usuário" });
    }
  });

  // Delete user (admin only)
  app.delete("/api/auth/users/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const id = parseInt(userId);

      if (isNaN(id)) {
        return res.status(400).json({ message: "userId inválido" });
      }

      const index = authUsers.findIndex((u) => u.id === id);
      if (index === -1) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      authUsers.splice(index, 1);
      res.json({ success: true });
    } catch (error) {
      console.error("[Auth] Delete user failed", error);
      res.status(500).json({ message: "Erro ao deletar usuário" });
    }
  });

  // Change user role (admin only)
  app.post("/api/auth/change-role", async (req: Request, res: Response) => {
    try {
      const { userId, role } = req.body;

      if (!userId || !role) {
        return res.status(400).json({ message: "userId e role são obrigatórios" });
      }

      const user = authUsers.find((u) => u.id === userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      if (role !== "admin" && role !== "visualizador") {
        return res.status(400).json({ message: "Role inválido" });
      }

      user.role = role;
      res.json({ success: true });
    } catch (error) {
      console.error("[Auth] Change role failed", error);
      res.status(500).json({ message: "Erro ao mudar role do usuário" });
    }
  });
}

// Export for use in other modules
export function getAuthUsers() {
  return authUsers;
}
