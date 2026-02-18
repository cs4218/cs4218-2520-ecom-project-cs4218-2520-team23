// Tests written by: Liu Yiyang, A0258121M
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import axios from 'axios';
import CategoryProduct from './CategoryProduct';

// Mock dependencies
jest.mock('axios');
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../context/auth', () => ({
  useAuth: jest.fn(() => [{ token: 'mock-token' }, jest.fn()])
}));

jest.mock('../context/cart', () => ({
  useCart: jest.fn(() => [[], jest.fn()])
}));

jest.mock('../context/search', () => ({
  useSearch: jest.fn(() => [{ keyword: '' }, jest.fn()])
}));

jest.mock('../components/Layout', () => {
  return function Layout({ children, title }) {
    return (
      <div data-testid="layout">
        <title>{title}</title>
        {children}
      </div>
    );
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

describe('CategoryProduct Component', () => {
  const mockCategory = {
    _id: 'cat1',
    name: 'Electronics',
    slug: 'electronics'
  };

  const mockProducts = [
    {
      _id: 'prod1',
      name: 'Laptop',
      slug: 'laptop',
      description: 'A high-performance laptop with great battery life and processing power',
      price: 999.99
    },
    {
      _id: 'prod2',
      name: 'Smartphone',
      slug: 'smartphone',
      description: 'Latest model smartphone with advanced camera and display features',
      price: 699.99
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    axios.get.mockResolvedValue({ data: { category: [] } });
  });

  it('renders without crashing', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        category: mockCategory,
        products: mockProducts
      }
    });

    render(
      <MemoryRouter initialEntries={['/category/electronics']}>
        <Routes>
          <Route path="/category/:slug" element={<CategoryProduct />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('layout')).toBeInTheDocument();
    });
  });

  it('fetches and displays category name', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        category: mockCategory,
        products: mockProducts
      }
    });

    render(
      <MemoryRouter initialEntries={['/category/electronics']}>
        <Routes>
          <Route path="/category/:slug" element={<CategoryProduct />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Category - Electronics')).toBeInTheDocument();
    });
  });

  it('displays correct number of products found', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        category: mockCategory,
        products: mockProducts
      }
    });

    render(
      <MemoryRouter initialEntries={['/category/electronics']}>
        <Routes>
          <Route path="/category/:slug" element={<CategoryProduct />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('2 result found')).toBeInTheDocument();
    });
  });

  it('renders all products in the category', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        category: mockCategory,
        products: mockProducts
      }
    });

    render(
      <MemoryRouter initialEntries={['/category/electronics']}>
        <Routes>
          <Route path="/category/:slug" element={<CategoryProduct />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Laptop')).toBeInTheDocument();
      expect(screen.getByText('Smartphone')).toBeInTheDocument();
    });
  });

  it('displays product prices in USD format', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        category: mockCategory,
        products: mockProducts
      }
    });

    render(
      <MemoryRouter initialEntries={['/category/electronics']}>
        <Routes>
          <Route path="/category/:slug" element={<CategoryProduct />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('$999.99')).toBeInTheDocument();
      expect(screen.getByText('$699.99')).toBeInTheDocument();
    });
  });

  it('truncates product descriptions to 60 characters', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        category: mockCategory,
        products: mockProducts
      }
    });

    render(
      <MemoryRouter initialEntries={['/category/electronics']}>
        <Routes>
          <Route path="/category/:slug" element={<CategoryProduct />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('A high-performance laptop with great battery life and proces...')).toBeInTheDocument();
    });
  });

  it('renders More Details button for each product', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        category: mockCategory,
        products: mockProducts
      }
    });

    render(
      <MemoryRouter initialEntries={['/category/electronics']}>
        <Routes>
          <Route path="/category/:slug" element={<CategoryProduct />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      const buttons = screen.getAllByText('More Details');
      expect(buttons).toHaveLength(2);
    });
  });

  it('navigates to product details when More Details button is clicked', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        category: mockCategory,
        products: mockProducts
      }
    });

    render(
      <MemoryRouter initialEntries={['/category/electronics']}>
        <Routes>
          <Route path="/category/:slug" element={<CategoryProduct />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Laptop')).toBeInTheDocument();
    });

    const buttons = screen.getAllByText('More Details');
    fireEvent.click(buttons[0]);

    expect(mockNavigate).toHaveBeenCalledWith('/product/laptop');
  });

  it('displays product images with correct src', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        category: mockCategory,
        products: mockProducts
      }
    });

    render(
      <MemoryRouter initialEntries={['/category/electronics']}>
        <Routes>
          <Route path="/category/:slug" element={<CategoryProduct />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      const images = screen.getAllByRole('img');
      expect(images[0]).toHaveAttribute('src', '/api/v1/product/product-photo/prod1');
      expect(images[1]).toHaveAttribute('src', '/api/v1/product/product-photo/prod2');
    });
  });

  it('handles empty products array', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        category: mockCategory,
        products: []
      }
    });

    render(
      <MemoryRouter initialEntries={['/category/electronics']}>
        <Routes>
          <Route path="/category/:slug" element={<CategoryProduct />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('0 result found')).toBeInTheDocument();
    });
  });

  it('handles API error gracefully', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    axios.get.mockRejectedValueOnce(new Error('API Error'));

    render(
      <MemoryRouter initialEntries={['/category/electronics']}>
        <Routes>
          <Route path="/category/:slug" element={<CategoryProduct />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.any(Error));
    });

    consoleLogSpy.mockRestore();
  });

  it('fetches products with correct API endpoint', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        category: mockCategory,
        products: mockProducts
      }
    });

    render(
      <MemoryRouter initialEntries={['/category/electronics']}>
        <Routes>
          <Route path="/category/:slug" element={<CategoryProduct />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/v1/product/product-category/electronics');
    });
  });

  it('should not fetch products when slug is undefined', () => {
    render(
      <MemoryRouter initialEntries={['/category']}>
        <Routes>
          <Route path="/category" element={<CategoryProduct />} />
        </Routes>
      </MemoryRouter>
    );

    expect(axios.get).not.toHaveBeenCalled();
  });
});
