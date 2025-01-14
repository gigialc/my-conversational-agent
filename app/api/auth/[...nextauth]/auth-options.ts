import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectToMongoDB } from "@/dbConfig/dbconfig";
import User from "@/models/User";
import bcrypt from "bcrypt";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password");
        }

        await connectToMongoDB();

        const user = await User.findOne({ email: credentials.email });
        if (!user) {
          throw new Error("No user found with this email");
        }

        const isValidPassword = await bcrypt.compare(credentials.password, user.password);
        if (!isValidPassword) {
          throw new Error("Invalid email or password");
        }
        console.log("User authenticated:", user.email); // Log successful authentication
        return {
          id: user._id.toString(),
          email: user.email,
          name: user.username,

        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        console.log("JWT callback - user:", user); // Log user information in JWT callback
        token.id = user.id;
        token.email = user.email as string;
        token.name = user.name as string;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        // console.log("Session callback - token:", token); // Log token information in session callback
        session.user = {
          id: token.id,
          email: token.email,
          name: token.name,

        };
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET, // REQUIRED
};
