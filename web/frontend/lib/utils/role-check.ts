import { headers } from "next/headers";
import { auth } from "../auth";
import { redirect } from "next/navigation";


export async function requireAuth(){
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session){
       redirect("/signin");   
    }

    return session;
}

export async function requireAdmin() {
  const session = await requireAuth();

  if ((session.user as any).role !== 'admin') {
    redirect('/user');
  }

  return session;
}

export async function requireUser() {
  const session = await requireAuth();

  if ((session.user as any).role !== 'user') {
    redirect('/admin');
  }

  return session;
}


export async function requireRH(){
  const session = await requireAuth();

  if ((session.user as any).role !== 'rh') {
    redirect('/user');
  }

  return session;

}