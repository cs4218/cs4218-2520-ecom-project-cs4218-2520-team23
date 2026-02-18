// Tests written by: Liu Yiyang, A0258121M
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import UserMenu from './UserMenu';

describe('UserMenu Component', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('displays Dashboard heading', () => {
    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );
    
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('renders Profile link', () => {
    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );
    
    const profileLink = screen.getByRole('link', { name: 'Profile' });
    expect(profileLink).toBeInTheDocument();
    expect(profileLink).toHaveAttribute('href', '/dashboard/user/profile');
  });

  it('renders Orders link', () => {
    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );
    
    const ordersLink = screen.getByRole('link', { name: 'Orders' });
    expect(ordersLink).toBeInTheDocument();
    expect(ordersLink).toHaveAttribute('href', '/dashboard/user/orders');
  });

  it('applies correct CSS classes to links', () => {
    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );
    
    const profileLink = screen.getByRole('link', { name: 'Profile' });
    const ordersLink = screen.getByRole('link', { name: 'Orders' });
    
    expect(profileLink).toHaveClass('list-group-item', 'list-group-item-action');
    expect(ordersLink).toHaveClass('list-group-item', 'list-group-item-action');
  });

  it('renders all menu items', () => {
    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );
    
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
  });

  it('has correct structure with list-group', () => {
    const { container } = render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );
    
    const listGroup = container.querySelector('.list-group');
    expect(listGroup).toBeInTheDocument();
  });
});
