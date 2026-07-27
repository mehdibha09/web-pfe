import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import LoadingSpinner from '../LoadingSpinner'

describe('LoadingSpinner', () => {
  it('renders inline variant', () => {
    const { container } = render(<LoadingSpinner variant="inline" />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders block variant with message', () => {
    render(<LoadingSpinner variant="block" message="Loading..." />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders page variant', () => {
    const { container } = render(<LoadingSpinner variant="page" />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('accepts custom message for block variant', () => {
    render(<LoadingSpinner variant="block" message="Working..." />)
    expect(screen.getByText('Working...')).toBeInTheDocument()
  })
})
