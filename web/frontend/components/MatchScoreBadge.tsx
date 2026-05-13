import React from 'react';
import { calculateMatchScore } from '@/lib/matching';
import { cn } from '@/lib/utils';

interface MatchScoreBadgeProps {
    requiredSkills: string[];
    candidateSkills: string[];
}

export const MatchScoreBadge = ({ requiredSkills, candidateSkills }: MatchScoreBadgeProps) => {
    const score = calculateMatchScore(requiredSkills, candidateSkills);

    let colorClass = "bg-red-100 text-red-700"; // Faible
    if (score >= 70) {
        colorClass = "bg-green-100 text-green-700"; // Excellent
    } else if (score >= 40) {
        colorClass = "bg-yellow-100 text-yellow-700"; // Moyen
    }

    return (
        <div
            data-testid="score-badge"
            className={cn("px-3 py-1 rounded-full font-bold text-sm inline-block", colorClass)}
        >
            Score: {score}%
        </div>
    );
};
