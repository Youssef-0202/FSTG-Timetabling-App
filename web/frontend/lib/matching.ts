/**
 * Calcule le score de matching entre les compétences requises et celles du candidat.
 * @param requiredSkills Liste des compétences demandées par l'offre
 * @param candidateSkills Liste des compétences possédées par le candidat
 * @returns Un score entre 0 et 100
 */
export function calculateMatchScore(requiredSkills: string[], candidateSkills: string[]): number {
  if (requiredSkills.length === 0) return 100;
  
  const matchedSkills = requiredSkills.filter(skill => 
    candidateSkills.some(cSkill => cSkill.toLowerCase() === skill.toLowerCase())
  );
  
  const score = (matchedSkills.length / requiredSkills.length) * 100;
  return Math.round(score);
}
