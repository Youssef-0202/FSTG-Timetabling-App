import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { HeroGeometric } from "@/components/ui/shape-landing-hero";



export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  // If logged in, redirect to appropriate dashboard
  if (session) {
    if ((session.user as any).role === 'admin') {
      redirect('/admin/dashboard');
    } else if ((session.user as any).role === 'candidate') {
      redirect('/candidate/dashboard');
    } else if ((session.user as any).role === 'rh') {
      redirect('/rh/dashboard');
    }
  }

  // Else LandingPage
  return (

    <HeroGeometric
      badge="IA & Recrutement"
      title1="Analyse Intelligente"
      title2="de CV"
      description="Plateforme d’Analyse Intelligente de CV destinée à assister les équipes RH dans la présélection des candidats. Analysez automatiquement les CV, extrayez les compétences clés et classez les candidats selon leur adéquation."
    >
      <Link href="/signup">
        <button className="px-8 py-3 rounded-full bg-gradient-to-r from-indigo-500 to-rose-500 text-white font-medium hover:opacity-90 transition-opacity">
          Commencer
        </button>
      </Link>

      <Link href="/signin">
        <button className="px-8 py-3 rounded-full border border-white/20 bg-white/5 text-white font-medium hover:bg-white/10 transition-colors backdrop-blur-sm">
          Se Connecter
        </button>
      </Link>
    </HeroGeometric>
  );
}
