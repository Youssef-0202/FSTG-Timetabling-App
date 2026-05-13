import { describe, it, expect } from 'vitest';
import { calculateMatchScore } from '../../lib/matching';

describe('calculateMatchScore', () => {
  it('devrait retourner 100% si toutes les compétences correspondent', () => {
    const required = ['React', 'Node.js', 'TypeScript'];
    const candidate = ['React', 'Node.js', 'TypeScript', 'Docker'];
    expect(calculateMatchScore(required, candidate)).toBe(100);
  });

  it('devrait retourner 0% si aucune compétence ne correspond', () => {
    const required = ['Java', 'Spring'];
    const candidate = ['Python', 'Django'];
    expect(calculateMatchScore(required, candidate)).toBe(0);
  });

  it('devrait être insensible à la casse (Case Insensitive)', () => {
    const required = ['REACT'];
    const candidate = ['react'];
    expect(calculateMatchScore(required, candidate)).toBe(100);
  });

  it('devrait calculer correctement un score partiel', () => {
    const required = ['React', 'Node.js', 'TypeScript', 'PostgreSQL'];
    const candidate = ['React', 'Node.js']; // 2 sur 4 = 50%
    expect(calculateMatchScore(required, candidate)).toBe(50);
  });

  it('devrait retourner 100% si aucune compétence n\'est requise', () => {
    expect(calculateMatchScore([], ['Java'])).toBe(100);
  });
});
