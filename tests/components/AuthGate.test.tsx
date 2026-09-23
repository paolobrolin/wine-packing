import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const currentSession = vi.fn()
const sendMagicLink = vi.fn()
const onAuthChange = vi.fn()

vi.mock('../../src/data/auth', () => ({ currentSession, sendMagicLink, onAuthChange }))

const { AuthGate } = await import('../../src/components/AuthGate')

const SESSION = { user: { email: 'paolo@example.com' } }

beforeEach(() => {
  vi.clearAllMocks()
  currentSession.mockResolvedValue(null)
  sendMagicLink.mockResolvedValue(undefined)
  onAuthChange.mockReturnValue(vi.fn())
})

describe('AuthGate', () => {
  it('shows neither the app nor the form while the session is resolving', () => {
    currentSession.mockReturnValue(new Promise(() => {}))
    render(<AuthGate><p>cellar</p></AuthGate>)
    expect(screen.queryByText('cellar')).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/e-post/i)).not.toBeInTheDocument()
  })

  it('renders the app when a session exists', async () => {
    currentSession.mockResolvedValue(SESSION)
    render(<AuthGate><p>cellar</p></AuthGate>)
    expect(await screen.findByText('cellar')).toBeInTheDocument()
  })

  it('asks for an email address when signed out', async () => {
    render(<AuthGate><p>cellar</p></AuthGate>)
    expect(await screen.findByLabelText(/e-post/i)).toBeInTheDocument()
    expect(screen.queryByText('cellar')).not.toBeInTheDocument()
  })

  it('sends a magic link and confirms it went out', async () => {
    render(<AuthGate><p>cellar</p></AuthGate>)
    await userEvent.type(await screen.findByLabelText(/e-post/i), 'paolo@example.com')
    await userEvent.click(screen.getByRole('button', { name: /skicka/i }))
    expect(sendMagicLink).toHaveBeenCalledWith('paolo@example.com')
    expect(await screen.findByText(/kolla mejlen/i)).toBeInTheDocument()
  })

  it('reports a refused send instead of claiming success', async () => {
    sendMagicLink.mockRejectedValue(new Error('rate limit exceeded'))
    render(<AuthGate><p>cellar</p></AuthGate>)
    await userEvent.type(await screen.findByLabelText(/e-post/i), 'paolo@example.com')
    await userEvent.click(screen.getByRole('button', { name: /skicka/i }))
    expect(await screen.findByText(/rate limit exceeded/i)).toBeInTheDocument()
    expect(screen.queryByText(/kolla mejlen/i)).not.toBeInTheDocument()
  })

  it('does not send an empty address', async () => {
    render(<AuthGate><p>cellar</p></AuthGate>)
    await userEvent.click(await screen.findByRole('button', { name: /skicka/i }))
    expect(sendMagicLink).not.toHaveBeenCalled()
  })

  it('lets the app in when the magic link lands', async () => {
    render(<AuthGate><p>cellar</p></AuthGate>)
    await screen.findByLabelText(/e-post/i)
    const notify = onAuthChange.mock.calls[0][0]
    act(() => notify(SESSION))
    expect(await screen.findByText('cellar')).toBeInTheDocument()
  })

  it('shows the form again when the session ends', async () => {
    currentSession.mockResolvedValue(SESSION)
    render(<AuthGate><p>cellar</p></AuthGate>)
    await screen.findByText('cellar')
    act(() => onAuthChange.mock.calls[0][0](null))
    expect(await screen.findByLabelText(/e-post/i)).toBeInTheDocument()
  })

  it('unsubscribes on unmount', async () => {
    const unsubscribe = vi.fn()
    onAuthChange.mockReturnValue(unsubscribe)
    const { unmount } = render(<AuthGate><p>cellar</p></AuthGate>)
    await screen.findByLabelText(/e-post/i)
    unmount()
    await waitFor(() => expect(unsubscribe).toHaveBeenCalled())
  })
})
