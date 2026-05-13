import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import Database from "better-sqlite3";

export const auth = betterAuth({
    database: new Database("./sqlite.db"),
    user: {
        additionalFields: {
            role: {
                type: "string",
                defaultValue: "user",
                required: true
            }
        }
    },
    emailAndPassword: { 
        enabled: true, 
    },
    plugins: [nextCookies()],
    trustedOrigins: [
        "http://localhost:3000",
        "https://*.ngrok-free.app",
        "https://*.ngrok-free.dev",
        "https://*.ngrok.io"
    ]
});