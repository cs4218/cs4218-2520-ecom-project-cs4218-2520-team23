// Liu Yiyang, A0258121M
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
    
    const { useAuth } = require('../../context/auth');
    useAuth.mockImplementation(() => [
      {
        user: {
          name: 'John Doe',
          email: 'john@example.com',
          address: '123 Main Street'
        }
      },
      jest.fn()
    ]);
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

  it('should display all three user fields', () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    
    const headings = screen.getAllByRole('heading');
    expect(headings.length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('123 Main Street')).toBeInTheDocument();
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

  it('should handle user with only email', () => {
    const { useAuth } = require('../../context/auth');
    useAuth.mockImplementation(() => [
      {
        user: {
          email: 'test@example.com'
        }
      },
      jest.fn()
    ]);
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('should handle user with only address', () => {
    const { useAuth } = require('../../context/auth');
    useAuth.mockImplementation(() => [
      {
        user: {
          address: '456 Oak Avenue'
        }
      },
      jest.fn()
    ]);
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    
    expect(screen.getByText('456 Oak Avenue')).toBeInTheDocument();
  });

  it('should handle undefined user gracefully', () => {
    const { useAuth } = require('../../context/auth');
    useAuth.mockImplementation(() => [{ user: null }, jest.fn()]);

    const { container } = render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('layout')).toBeInTheDocument();
    expect(screen.getByTestId('user-menu')).toBeInTheDocument();
  });

  it('should handle empty user object', () => {
    const { useAuth } = require('../../context/auth');
    useAuth.mockImplementation(() => [{ user: {} }, jest.fn()]);
    // Act
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('should handle null auth state', () => {
    const { useAuth } = require('../../context/auth');
    useAuth.mockImplementation(() => [null, jest.fn()]);
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('should render user information in a card', () => {
    const { container } = render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    
    const card = container.querySelector('.card');
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('w-75', 'p-3');
  });


  it('should display very long user names without truncation', () => {
    const { useAuth } = require('../../context/auth');
    const longName = 'A'.repeat(100);
    useAuth.mockImplementation(() => [
      { user: { name: longName } },
      jest.fn()
    ]);

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );    

    expect(screen.getByText(longName)).toBeInTheDocument();
  });

  it('should display very long email addresses', () => {
    const { useAuth } = require('../../context/auth');
    const longEmail = 'verylongemailaddress@verylongdomainname.com';
    useAuth.mockImplementation(() => [
      { user: { email: longEmail } },
      jest.fn()
    ]);
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );    
    
    expect(screen.getByText(longEmail)).toBeInTheDocument();
  });

  it('should display empty string values', () => {
    const { useAuth } = require('../../context/auth');
    useAuth.mockImplementation(() => [
      {
        user: {
          name: '',
          email: '',
          address: ''
        }
      },
      jest.fn()
    ]);

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('should display special characters in user data', () => {
    const { useAuth } = require('../../context/auth');
    useAuth.mockImplementation(() => [
      {
        user: {
          name: "O'Connor-Smith",
          email: 'user+test@example.co.uk',
          address: '123 "Main" St & Co.'
        }
      },
      jest.fn()
    ]);

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    
    expect(screen.getByText("O'Connor-Smith")).toBeInTheDocument();
    expect(screen.getByText('user+test@example.co.uk')).toBeInTheDocument();
    expect(screen.getByText('123 "Main" St & Co.')).toBeInTheDocument();
  });
});
