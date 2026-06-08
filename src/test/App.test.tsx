import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';

import { DataProvider } from '@/contexts/DataContext';
import Home from '@/Home';

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

describe('App flow', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ current_weather: { temperature: 20, weathercode: 0 } }),
      }) as Promise<Response>,
    ));
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders the home dashboard and navigates to Synthese CA', async () => {
    render(
      <DataProvider>
        <MemoryRouter initialEntries={['/']}>
          <Home />
          <LocationDisplay />
        </MemoryRouter>
      </DataProvider>,
    );

    expect(await screen.findByRole('heading', { name: /Hippopotamus/i })).toBeInTheDocument();
    const syntheseButton = screen.getByRole('button', { name: /Synth.se CA/i });
    fireEvent.click(syntheseButton);
    expect(screen.getByTestId('location')).toHaveTextContent('/synthese');
  }, 15000);
});
