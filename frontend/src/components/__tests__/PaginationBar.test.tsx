import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import PaginationBar from '../PaginationBar'

describe('PaginationBar', () => {
  const defaultProps = {
    page: 1,
    pageCount: 5,
    total: 50,
    onPageChange: vi.fn(),
  }

  it('renders pagination info', () => {
    render(<PaginationBar {...defaultProps} />)
    expect(screen.getByText('1–10 / 50 résultats')).toBeInTheDocument()
  })

  it('calls onPageChange on next', () => {
    const onPageChange = vi.fn()
    render(<PaginationBar {...defaultProps} onPageChange={onPageChange} />)
    fireEvent.click(screen.getByLabelText('Next page'))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('disables first/prev on first page', () => {
    render(<PaginationBar {...defaultProps} page={1} />)
    expect(screen.getByLabelText('First page')).toBeDisabled()
    expect(screen.getByLabelText('Previous page')).toBeDisabled()
  })

  it('disables last/next on last page', () => {
    render(<PaginationBar {...defaultProps} page={5} />)
    expect(screen.getByLabelText('Last page')).toBeDisabled()
    expect(screen.getByLabelText('Next page')).toBeDisabled()
  })

  it('calls onPageChange on first/last', () => {
    const onPageChange = vi.fn()
    render(<PaginationBar {...defaultProps} page={3} onPageChange={onPageChange} />)
    fireEvent.click(screen.getByLabelText('First page'))
    expect(onPageChange).toHaveBeenCalledWith(1)
    fireEvent.click(screen.getByLabelText('Last page'))
    expect(onPageChange).toHaveBeenCalledWith(5)
  })

  it('returns null when pageCount <= 1', () => {
    const { container } = render(<PaginationBar {...defaultProps} pageCount={1} />)
    expect(container.firstChild).toBeNull()
  })
})
