"use server";

import { auth } from "@/lib/auth"; 

export async function createAuthUserAction(userData: {
  email: string;
  password: string;
  name: string;
  role: string;
}) {
  console.log("🛠️ Server Action: Création compte Better-Auth pour", userData.email);

  try {
    // 1. Appel à l'API Better-Auth
    const res = await auth.api.signUpEmail({
      body: {
        email: userData.email,
        password: userData.password,
        name: userData.name,
        // ✅ IMPORTANT : On passe le rôle ici. 
        // Assurez-vous que votre schéma de base de données (schema.prisma ou schema.ts) contient bien un champ "role" dans la table "user".
        role: userData.role, 
      },
      asResponse: true, // On demande une réponse brute pour gérer les erreurs manuellement
    });

    // 2. Extraction des données JSON
    const responseData = await res.json();

    // 3. Vérification du statut HTTP (200-299 = Succès)
    if (!res.ok) {
      // Si c'est une erreur (ex: Email déjà pris), on la lève pour aller dans le catch
      throw { 
        message: responseData.message || responseData.error?.message || "Erreur lors de la création",
        body: responseData 
      };
    }

    console.log("✅ Server Action: Succès", responseData);

    return {
      success: true,
      data: responseData, // On retourne le JSON propre
    };

  } catch (error: any) {
    console.error("❌ ERREUR Server Action :", error);

    // Extraction intelligente du message d'erreur
    let errorMessage = "Unknown server error";

    if (error.message) errorMessage = error.message;
    if (error.body?.message) errorMessage = error.body.message;
    // Parfois better-auth renvoie l'erreur dans error.error.message
    if (error.body?.error?.message) errorMessage = error.body.error.message;

    return {
      success: false,
      error: errorMessage,
    };
  }
}