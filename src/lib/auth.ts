import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { isAdminEmail } from "@/lib/admin";
import { authConfig } from "@/lib/auth.config";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      isAdmin: boolean;
      theme: "light" | "dark";
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    isAdmin: boolean;
    theme: "light" | "dark";
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    email?: string;
    name?: string;
    isAdmin?: boolean;
    theme?: "light" | "dark";
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email || "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password || "");

        if (!email || !password) return null;

        await connectDB();
        const user = await User.findOne({ email });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: String(user._id),
          email: user.email,
          name: user.name,
          isAdmin: isAdminEmail(user.email),
          theme: user.theme,
        };
      },
    }),
  ],
  secret: process.env.AUTH_SECRET,
});
