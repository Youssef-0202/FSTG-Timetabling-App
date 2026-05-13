import { requireRH } from "@/lib/utils/role-check";
import { redirect } from "next/navigation";

export default async function RHDashboard() {
  await requireRH();

  // Redirect authenticated RH users directly to their jobs page
  redirect("/rh/jobs");
}