import { test, expect } from '@playwright/test';

test('devrait afficher la landing page avec les boutons de navigation', async ({ page }) => {
  await page.goto('/');

  // 1. On vérifie le titre de la page (Metadata)
  await expect(page).toHaveTitle(/Resume Matching Platform/i);

  // 2. On utilise .first() pour éviter l'erreur de duplication 
  // ou on cible spécifiquement le texte exact du titre
  await expect(page.getByText('Analyse Intelligente', { exact: true })).toBeVisible();
  await expect(page.getByText('de CV', { exact: true })).toBeVisible();

  // 3. On vérifie les boutons d'action
  const startButton = page.getByRole('button', { name: /Commencer/i });
  const loginButton = page.getByRole('button', { name: /Se Connecter/i });

  await expect(startButton).toBeVisible();
  await expect(loginButton).toBeVisible();
});