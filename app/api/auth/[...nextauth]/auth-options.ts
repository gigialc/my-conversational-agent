import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { connectToMongoDB } from "@/dbConfig/dbconfig";
import User from "@/models/User";
import bcrypt from "bcrypt";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
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
        return {
          id: user._id.toString(),
          email: user.email,
          name: user.username,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          await connectToMongoDB();
          const existingUser = await User.findOne({ email: user.email });
          
          if (!existingUser) {
            // Create new user if they don't exist
            await User.create({
              email: user.email,
              username: user.name,
              // For Google auth users, we don't need a password
              password: await bcrypt.hash(Math.random().toString(36), 10)
            });
          }
          return true;
        } catch (error) {
          console.error("Error during Google sign in:", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email as string;
        token.name = user.name as string;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          id: token.id,
          email: token.email,
          name: token.name,
        };
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
