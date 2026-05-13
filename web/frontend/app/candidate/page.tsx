// =====================================
// 2. app/(candidate)/page.tsx
// Redirection par défaut vers /jobs
// =====================================
import { redirect } from "next/navigation";

export default function CandidateRootPage() {
  // Rediriger automatiquement vers la page jobs
  redirect("/candidate/jobs");
}

// =====================================
// 3. middleware.ts (Optionnel)
// Si tu veux gérer l'authentification
// =====================================
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Si l'utilisateur accède à /candidate sans route spécifique
  if (pathname === "/candidate" || pathname === "/candidate/") {
    return NextResponse.redirect(new URL("/candidate/jobs", request.url));
  }

  // Bloquer l'accès à /candidate/dashboard (au cas où)
  if (pathname.startsWith("/candidate/dashboard")) {
    return NextResponse.redirect(new URL("/candidate/jobs", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/candidate/:path*"],  // a suprimer cette partie 
};

// =====================================
// 4. Navigation depuis d'autres pages
// Exemple: après login réussi
// =====================================

// Dans ton composant de login:
/*
const handleLogin = async () => {
  await authClient.signIn(...);
  
  // ✅ Rediriger vers /jobs au lieu de /dashboard
  router.push("/candidate/jobs");
};
*/

// =====================================
// 5. Liens de navigation à mettre à jour
// =====================================

// Dans n'importe quel composant, remplacer:
// ❌ <Link href="/candidate/dashboard">Dashboard</Link>
// ✅ <Link href="/candidate/jobs">Browse Jobs</Link>

// Ou pour rediriger vers la page de profil avec stats:
// ✅ <Link href="/candidate/profile">View My Stats</Link>
