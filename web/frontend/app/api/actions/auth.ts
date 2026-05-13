// Server actions auth 
"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";


export async function signUpAction(formdata:FormData){
    const email = formdata.get("email") as string;
    const password = formdata.get("password") as string;
    const name = formdata.get("name") as string;
    
    // toNextJsHandler 
    await auth.api.signUpEmail({
        body:{email,
        password,
        name}
    });

    redirect("/");
} 

export async function signInAction(formdata:FormData){
    const email = formdata.get("email") as string;
    const password = formdata.get("password") as string;
    
    // toNextJsHandler 
    await auth.api.signInEmail({
        body:{email,
        password}
    });

    redirect("/");
}


export async function signOutAction(){
    await auth.api.signOut({
        headers: await headers()
    });
    redirect("/");
}