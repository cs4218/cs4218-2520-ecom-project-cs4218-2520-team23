// Tests written by: Liu Yiyang, A0258121M
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import Dashboard from './Dashboard';

// Mock dependencies
jest.mock('../../context/auth', () => ({
  useAuth: jest.fn(() => [
    {
      user: {
        name: 'John Doe',
        email: 'john@example.com',
        address: '123 Main Street'
      }
    },
    jest.fn()
  ])
}));

jest.mock('../../context/cart', () => ({
  useCart: jest.fn(() => [null, jest.fn()])
}));

jest.mock('../../context/search', () => ({
  useSearch: jest.fn(() => [{ keyword: '' }, jest.fn()])
}));

jest.mock('../../components/Layout', () => {
  return function Layout({ children, title }) {
    return (
      <div data-testid="layout">
        <title>{title}</title>
        {children}
      </div>
    );
  };
});

jest.mock('../../components/UserMenu', () => {
  return function UserMenu() {
    return <div data-testid="user-menu">User Menu</div>;
  };
});

Object.defineProperty(window, 'localStorage', {
  value: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
  writable: true,
});

window.matchMedia = window.matchMedia || function() {
  return {
    matches: false,
    addListener: function() {},
    removeListener: function() {}
  };
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('renders with correct title', () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    
    expect(screen.getByText('Dashboard - Ecommerce App')).toBeInTheDocument();
  });

  it('renders UserMenu component', () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('user-menu')).toBeInTheDocument();
  });

  it('displays user name from auth context', () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('displays user email from auth context', () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('displays user address from auth context', () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    
    expect(screen.getByText('123 Main Street')).toBeInTheDocument();
  });

  it('renders user information in a card', () => {
    const { container } = render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    
    const card = container.querySelector('.card');
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('w-75', 'p-3');
  });

  it('renders with correct layout structure', () => {
    const { container } = render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    
    expect(container.querySelector('.row')).toBeInTheDocument();
    expect(container.querySelector('.col-md-3')).toBeInTheDocument();
    expect(container.querySelector('.col-md-9')).toBeInTheDocument();
  });

  it('handles undefined user gracefully', () => {
    const { useAuth } = require('../../context/auth');
    useAuth.mockImplementation(() => [{ user: null }, jest.fn()]);

    const { container } = render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    
    // Should render without crashing even with no user
    expect(screen.getByTestId('layout')).toBeInTheDocument();
    expect(screen.getByTestId('user-menu')).toBeInTheDocument();
  });

  it('handles partial user data', () => {
    const { useAuth } = require('../../context/auth');
    useAuth.mockImplementation(() => [
      {
        user: {
          name: 'Jane Doe'
          // missing email and address
        }
      },
      jest.fn()
    ]);

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('displays all user information as headings', () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    
    const headings = screen.getAllByRole('heading');
    expect(headings.length).toBeGreaterThanOrEqual(3);
  });
});
