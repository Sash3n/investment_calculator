import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ErrorBoundary } from './ErrorBoundary';
import { isChunkLoadError } from '../utils/chunkReload';

function Broken({ message }: { message: string }): never {
  throw new Error(message);
}

describe('ErrorBoundary', () => {
  it('shows the recovery page instead of a blank app', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubEnv('DEV', false);
    render(
      <MemoryRouter>
        <ErrorBoundary><Broken message="secret internal detail" /></ErrorBoundary>
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/');
    expect(screen.queryByText(/secret internal detail/)).not.toBeInTheDocument();
    spy.mockRestore();
    vi.unstubAllEnvs();
  });

  it('renders children when nothing fails', () => {
    render(<ErrorBoundary><p>Fine</p></ErrorBoundary>);
    expect(screen.getByText('Fine')).toBeInTheDocument();
  });
});

describe('isChunkLoadError', () => {
  it('recognises failed page loads from each browser', () => {
    expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: https://x/a.js'))).toBe(true);
    expect(isChunkLoadError(new TypeError('error loading dynamically imported module'))).toBe(true);
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true);
  });

  it('leaves other errors alone', () => {
    expect(isChunkLoadError(new Error('x is not a function'))).toBe(false);
    expect(isChunkLoadError('text')).toBe(false);
  });
});
