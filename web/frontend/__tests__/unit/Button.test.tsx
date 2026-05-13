import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/Button'
import { describe, it, expect } from 'vitest'

describe('Button Component', () => {
    it('renders correctly with default props', () => {
        render(<Button>Click me</Button>)
        const button = screen.getByRole('button', { name: /click me/i })
        expect(button).toBeInTheDocument()
        expect(button).toHaveClass('bg-gradient-to-r') // Primary variant default
    })

    it('renders secondary variant correctly', () => {
        render(<Button variant="secondary">Secondary</Button>)
        const button = screen.getByRole('button', { name: /secondary/i })
        expect(button).toHaveClass('bg-white')
    })

    it('applies custom class names', () => {
        render(<Button className="custom-class">Custom</Button>)
        const button = screen.getByRole('button', { name: /custom/i })
        expect(button).toHaveClass('custom-class')
    })

    it('is disabled when disabled prop is passed', () => {
        render(<Button disabled>Disabled</Button>)
        const button = screen.getByRole('button', { name: /disabled/i })
        expect(button).toBeDisabled()
    })
})
