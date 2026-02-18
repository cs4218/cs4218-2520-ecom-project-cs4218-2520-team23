// Tests written by: Liu Yiyang, A0258121M
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import toast from 'react-hot-toast';
import AdminOrders from './AdminOrders';

// Mock dependencies
jest.mock('axios');
jest.mock('react-hot-toast');

jest.mock('../../context/auth', () => ({
  useAuth: jest.fn(() => [{ token: 'mock-token' }, jest.fn()]) // Mock useAuth hook to return a token
}));

jest.mock('../../context/cart', () => ({
  useCart: jest.fn(() => [null, jest.fn()]) // Mock useCart hook
}));

jest.mock('../../context/search', () => ({
  useSearch: jest.fn(() => [{ keyword: '' }, jest.fn()]) // Mock useSearch hook
}));

// Mock UI components to isolate AdminOrders component
jest.mock('../../components/AdminMenu', () => {
  return function AdminMenu() {
    return <div data-testid="admin-menu">Admin Panel</div>;
  };
});

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

jest.mock('antd', () => {
  const Select = ({ children, onChange, defaultValue, bordered }) => (
    <select 
      data-testid="status-select" 
      onChange={(e) => onChange(e.target.value)}
      defaultValue={defaultValue}
    >
      {children}
    </select>
  );
  
  const Option = ({ children, value }) => <option value={value}>{children}</option>;
  
  Select.Option = Option;
  
  return {
    Select,
    Option
  };
});

// Mock other utils
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

describe('Test AdminOrders Component', () => {
  const mockOrders = [
    {
      _id: 'order1',
      status: 'Processing',
      buyer: { name: 'John Doe' },
      createAt: new Date('2024-01-15'),
      payment: { success: true },
      products: [
        {
          _id: 'product1',
          name: 'Product 1',
          description: 'This is a test product description',
          price: 100
        },
        {
          _id: 'product2',
          name: 'Product 2',
          description: 'Another test product description',
          price: 200
        }
      ]
    },
    {
      _id: 'order2',
      status: 'Shipped',
      buyer: { name: 'Jane Smith' },
      createAt: new Date('2024-01-10'),
      payment: { success: false },
      products: [
        {
          _id: 'product3',
          name: 'Product 3',
          description: 'Third test product description',
          price: 150
        }
      ]
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    axios.get.mockResolvedValue({ data: { category: [] } });
    
    // Reset useAuth mock to authenticated state
    const { useAuth } = require('../../context/auth');
    useAuth.mockImplementation(() => [{ token: 'mock-token' }, jest.fn()]);
  });

  it('renders admin orders page with title without crashing', async () => {
    axios.get.mockResolvedValueOnce({ data: mockOrders });

    render(
      <MemoryRouter>
        <AdminOrders />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('All Orders Data')).toBeInTheDocument();
      expect(screen.getByText('All Orders')).toBeInTheDocument();
    });
  });

  it('renders admin menu without crashing', async () => {
    axios.get.mockResolvedValueOnce({ data: mockOrders });

    render(
      <MemoryRouter>
        <AdminOrders />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('admin-menu')).toBeInTheDocument();
    });
  });

  it('fetches and displays orders', async () => {
    axios.get.mockResolvedValueOnce({ data: mockOrders });

    render(
      <MemoryRouter>
        <AdminOrders />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/v1/auth/all-orders');
    });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('displays order details correctly', async () => {
    axios.get.mockResolvedValueOnce({ data: mockOrders });

    render(
      <MemoryRouter>
        <AdminOrders />
      </MemoryRouter>
    );

    await waitFor(() => {
      const paymentStatuses = screen.getAllByText(/Success|Failed/);
      expect(paymentStatuses[0]).toHaveTextContent('Success'); // first order succeeded
      expect(paymentStatuses[1]).toHaveTextContent('Failed'); // second order failed
    });
  });

  it('displays product information for each order', async () => {
    axios.get.mockResolvedValueOnce({ data: mockOrders });

    render(
      <MemoryRouter>
        <AdminOrders />
      </MemoryRouter>
    );

    await waitFor(() => {
      const product1Container = screen.getByText('Product 1');
      const product2Container = screen.getByText('Product 2');
      const product3Container = screen.getByText('Product 3');
      
      expect(product1Container.closest('.row')).toHaveTextContent('Price : 100');
      expect(product2Container.closest('.row')).toHaveTextContent('Price : 200');
      expect(product3Container.closest('.row')).toHaveTextContent('Price : 150');
    });
  });

  it('displays correct quantity of products in orders', async () => {
    axios.get.mockResolvedValueOnce({ data: mockOrders });

    render(
      <MemoryRouter>
        <AdminOrders />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Get all table rows and check the quantity cells
      const tables = screen.getAllByRole('table');
      
      // First order should have quantity 2
      const firstOrderRow = tables[0].querySelector('tbody tr');
      const firstOrderCells = firstOrderRow.querySelectorAll('td');
      expect(firstOrderCells[5]).toHaveTextContent('2'); // Quantity is the 6th column (index 5)
      
      // Second order should have quantity 1
      const secondOrderRow = tables[1].querySelector('tbody tr');
      const secondOrderCells = secondOrderRow.querySelectorAll('td');
      expect(secondOrderCells[5]).toHaveTextContent('1'); // Quantity is the 6th column (index 5)
    });
  });

  it('handles status change for an order', async () => {
    axios.get.mockResolvedValueOnce({ data: mockOrders });
    axios.put.mockResolvedValueOnce({ data: { success: true } });
    axios.get.mockResolvedValueOnce({ data: mockOrders });

    render(
      <MemoryRouter>
        <AdminOrders />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const selects = screen.getAllByTestId('status-select');
    fireEvent.change(selects[0], { target: { value: 'Shipped' } });

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith('/api/v1/auth/order-status/order1', {
        status: 'Shipped'
      });
    });

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(2); // Initial + after status change
    });
  });

  it('handles error when fetching orders', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    axios.get.mockRejectedValueOnce(new Error('Failed to fetch orders'));

    render(
      <MemoryRouter>
        <AdminOrders />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.any(Error));
    });

    consoleLogSpy.mockRestore();
  });

  it('handles error when updating order status', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    axios.get.mockResolvedValueOnce({ data: mockOrders });
    axios.put.mockRejectedValueOnce(new Error('Failed to update status'));

    render(
      <MemoryRouter>
        <AdminOrders />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const selects = screen.getAllByTestId('status-select');
    fireEvent.change(selects[0], { target: { value: 'Shipped' } });

    await waitFor(() => {
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.any(Error));
    });

    consoleLogSpy.mockRestore();
  });

  it('does not fetch orders when user is not authenticated', () => {
    const { useAuth } = require('../../context/auth');
    useAuth.mockImplementation(() => [{ token: null }, jest.fn()]);

    axios.get.mockResolvedValueOnce({ data: mockOrders });

    render(
      <MemoryRouter>
        <AdminOrders />
      </MemoryRouter>
    );

    expect(axios.get).not.toHaveBeenCalledWith('/api/v1/auth/all-orders');
  });

  it('renders correct number of orders', async () => {
    axios.get.mockResolvedValueOnce({ data: mockOrders });

    render(
      <MemoryRouter>
        <AdminOrders />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Check that both orders are rendered by finding both buyer names
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      
      // Verify we have exactly 2 orders
      const tables = screen.getAllByRole('table');
      expect(tables.length).toBe(2);
    });
  });

  it('truncates long product descriptions', async () => {
    axios.get.mockResolvedValueOnce({ data: mockOrders });

    render(
      <MemoryRouter>
        <AdminOrders />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('This is a test product descrip')).toBeInTheDocument();
    });
  });
});
