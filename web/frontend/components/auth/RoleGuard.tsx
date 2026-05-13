"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface RoleGuardProps {
    children: React.ReactNode;
    allowedRoles: string[];
}

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
    const { data: session, isPending, error } = authClient.useSession();
    const router = useRouter();

    useEffect(() => {
        if (isPending) return;

        if (!session) {
            router.push("/signin");
            return;
        }

        // session.user.role might need to be typed or cast if not automatically inferred
        const userRole = (session.user as any).role;
        console.log("RoleGuard Check:", { userRole, allowedRoles });

        if (!allowedRoles.includes(userRole)) {
            router.push("/");
        }
    }, [session, isPending, router, allowedRoles]);

    if (isPending) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#030303] text-white">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (!session) {
        return null;
    }

    const userRole = (session.user as any).role;
    if (!allowedRoles.includes(userRole)) {
        return null;
    }

    return <>{children}</>;
}
