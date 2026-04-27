import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import App from '@/App';

describe('App flow', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ current: { temperature_2m: 20, weather_code: 0 } }),
      }) as Promise<Response>,
    ));
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders the home dashboard and navigates to Synthèse CA', async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Tableau de Bord')).toBeInTheDocument();
    const syntheseButton = screen.getByRole('button', { name: /Synthèse CA/i });
    fireEvent.click(syntheseButton);
    expect(await screen.findByText(/Synthèse Visuelle du mois/i)).toBeInTheDocument();
  });
});
