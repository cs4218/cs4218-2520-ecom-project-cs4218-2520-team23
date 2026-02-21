// Liu Yiyang, A0258121M
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

  it('should display Dashboard heading', () => {
    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );
    
    const heading = screen.getByRole('heading', { name: 'Dashboard' });
    expect(heading).toBeInTheDocument();
    expect(heading.tagName).toBe('H4');
  });

  it('should render Profile link with correct text', () => {
    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );
    
    const profileLink = screen.getByRole('link', { name: 'Profile' });
    expect(profileLink).toBeInTheDocument();
    });

  it('should have correct href for Profile link', () => {
    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );
    
    const profileLink = screen.getByRole('link', { name: 'Profile' });
    expect(profileLink).toHaveAttribute('href', '/dashboard/user/profile');
  });

  it('should apply correct CSS classes to links', () => {
    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );
    
    const profileLink = screen.getByRole('link', { name: 'Profile' });
    expect(profileLink).toHaveClass('list-group-item', 'list-group-item-action');
  });

  it('should render Orders link with correct text', () => {
    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );
    
    const ordersLink = screen.getByRole('link', { name: 'Orders' });
    expect(ordersLink).toBeInTheDocument();
  });

  it('should have correct href for Orders link', () => {
    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );
    
    const ordersLink = screen.getByRole('link', { name: 'Orders' });
    expect(ordersLink).toHaveAttribute('href', '/dashboard/user/orders');
  });

  it('should apply correct CSS classes to Orders link', () => {
    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );
    
    const ordersLink = screen.getByRole('link', { name: 'Orders' });
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

  it('should render both Profile and Orders links', () => {
    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );
    
    expect(screen.getByRole('link', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Orders' })).toBeInTheDocument();
  });

  it('should have list-group container', () => {
    const { container } = render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );
    
    const listGroup = container.querySelector('.list-group');
    expect(listGroup).toBeInTheDocument();
  });

  it('should have text-center wrapper div', () => {
    const { container } = render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );
    
    const centerDiv = container.querySelector('.text-center');
    expect(centerDiv).toBeInTheDocument();
  });

  it('should contain heading inside list-group', () => {
    const { container } = render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );
    
    const listGroup = container.querySelector('.list-group');
    const heading = listGroup.querySelector('h4');
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('Dashboard');
  });

  it('should have all links inside list-group', () => {
    const { container } = render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );
    
    const listGroup = container.querySelector('.list-group');
    const linksInGroup = listGroup.querySelectorAll('a');
    expect(linksInGroup).toHaveLength(2);
  });

  it('should render Profile link before Orders link', () => {
    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );
    
    const links = screen.getAllByRole('link');

    expect(links[0]).toHaveTextContent('Profile');
    expect(links[1]).toHaveTextContent('Orders');
  });

  it('should have Profile as first menu item (BVA)', () => {
    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );
    
    const links = screen.getAllByRole('link');

    expect(links[0]).toHaveAttribute('href', '/dashboard/user/profile');
  });

  it('should have Orders as last menu item (BVA)', () => {
    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );
    
    const links = screen.getAllByRole('link');

    expect(links[links.length - 1]).toHaveAttribute('href', '/dashboard/user/orders');
  });

  it('should use NavLink components for navigation', () => {
    const { container } = render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );
    
    const links = container.querySelectorAll('a');
    expect(links.length).toBeGreaterThan(0);
    links.forEach(link => {
      expect(link.tagName).toBe('A');
    });
  });

  it('should have valid internal routes', () => {
    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );
    
    const links = screen.getAllByRole('link');
    links.forEach(link => {
      const href = link.getAttribute('href');
      expect(href).toMatch(/^\/dashboard\/user\//);
    });
  });

  it('should not render additional unexpected links (BVA: upper bound)', () => {
    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );
    
    const links = screen.getAllByRole('link');
    expect(links.length).not.toBeGreaterThan(2);
  });

  it('should not render less than expected links (BVA: lower bound)', () => {
    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );    

    const links = screen.getAllByRole('link');
    expect(links.length).not.toBeLessThan(2);
  });

  it('should maintain structure when rendered multiple times', () => {
    const { unmount } = render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );
    expect(screen.getAllByRole('link')).toHaveLength(2);
    
    unmount();
    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );
    
    expect(screen.getAllByRole('link')).toHaveLength(2);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
