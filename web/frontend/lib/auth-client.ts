import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    baseURL: typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
});


// Use Server Component :
// 1-  You need data BEFORE the page loads
// 2-  You need to use it in a server component
// Use Client Component
// 1-  You need interactivity
// 2-  You need data AFTER the page loads
// 3-  You need real-time updates
// 4-  You need to use it in a client component

// Best Practice: Combine Both!