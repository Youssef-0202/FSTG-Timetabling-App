import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SignInForm from '@/components/auth/SignInForm'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authClient } from '@/lib/auth-client'

// Mock dependencies
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
    }),
}))

vi.mock('@/lib/auth-client', () => ({
    authClient: {
        signIn: {
            email: vi.fn(),
        },
    },
}))

describe('SignInForm Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders sign in form correctly', () => {
        render(<SignInForm />)
        expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    it('shows error message on failed login', async () => {
        // Mock failed login
        vi.mocked(authClient.signIn.email).mockResolvedValueOnce({
            error: { message: 'Invalid credentials' },
            data: null
        } as any)

        render(<SignInForm />)

        fireEvent.change(screen.getByLabelText(/email address/i), {
            target: { value: 'test@example.com' },
        })
        fireEvent.change(screen.getByLabelText(/password/i), {
            target: { value: 'wrongpassword' },
        })
        fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

        await waitFor(() => {
            expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
        })
    })

    it('redirects to admin dashboard on successful admin login', async () => {
        // Mock successful admin login
        vi.mocked(authClient.signIn.email).mockResolvedValueOnce({
            data: {
                user: { role: 'admin' },
            },
            error: null
        } as any)

        render(<SignInForm />)

        fireEvent.change(screen.getByLabelText(/email address/i), {
            target: { value: 'admin@example.com' },
        })
        fireEvent.change(screen.getByLabelText(/password/i), {
            target: { value: 'password' },
        })
        fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith('/admin/dashboard')
        })
    })
})
