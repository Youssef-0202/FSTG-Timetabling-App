import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MatchScoreBadge } from '@/components/MatchScoreBadge';
import '@testing-library/jest-dom';

describe('MatchScoreBadge Integration', () => {
    it('devrait afficher un badge VERT pour un excellent score (100%)', () => {
        const skills = ['React', 'Node'];
        render(<MatchScoreBadge requiredSkills={skills} candidateSkills={skills} />);

        const badge = screen.getByTestId('score-badge');

        expect(badge).toHaveTextContent('Score: 100%');
        expect(badge).toHaveClass('bg-green-100'); // Vérifie l'intégration du style
    });

    it('devrait afficher un badge JAUNE pour un score moyen (50%)', () => {
        const required = ['React', 'Node', 'Docker', 'AWS'];
        const candidate = ['React', 'Node']; // 50%
        render(<MatchScoreBadge requiredSkills={required} candidateSkills={candidate} />);

        const badge = screen.getByTestId('score-badge');

        expect(badge).toHaveTextContent('Score: 50%');
        expect(badge).toHaveClass('bg-yellow-100');
    });

    it('devrait afficher un badge ROUGE pour un mauvais score (0%)', () => {
        render(<MatchScoreBadge requiredSkills={['Java']} candidateSkills={['Python']} />);

        const badge = screen.getByTestId('score-badge');

        expect(badge).toHaveTextContent('Score: 0%');
        expect(badge).toHaveClass('bg-red-100');
    });
});
