"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function UserMenu() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/");
  };

  if (isPending) {
    return <div className="text-sm text-gray-600">Loading...</div>;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="flex items-center gap-4">
      <div className="text-right">
        <p className="text-sm font-medium text-gray-900">{session.user.name}</p>
        <p className="text-xs text-gray-500 capitalize">{(session.user as any).role}</p>
      </div>
      <button
        onClick={handleSignOut}
        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition text-sm"
      >
        Sign Out
      </button>
    </div>
  );
}
