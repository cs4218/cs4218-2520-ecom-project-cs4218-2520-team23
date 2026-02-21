// Liu Yiyang, A0258121M
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

  it('should fetch products with correct API endpoint', async () => {
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

  it('should handle API error gracefully', async () => {
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

  it('should display zero products', async () => {
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

  it('should display one product', async () => {
    const singleProduct = [mockProducts[0]];
    axios.get.mockResolvedValueOnce({
      data: {
        category: mockCategory,
        products: singleProduct
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
      expect(screen.getByText('1 result found')).toBeInTheDocument();
      expect(screen.getByText('Laptop')).toBeInTheDocument();
    });
  });

  it('should display two products (BVA: typical)', async () => {
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

  it('should display many products', async () => {
    const manyProducts = Array.from({ length: 10 }, (_, i) => ({
      _id: `prod${i}`,
      name: `Product ${i}`,
      slug: `product-${i}`,
      description: 'Test product description',
      price: 100 * i
    }));
    axios.get.mockResolvedValueOnce({
      data: {
        category: mockCategory,
        products: manyProducts
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
      expect(screen.getByText('10 result found')).toBeInTheDocument();
    });
  });

  it('should render all product names', async () => {
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

  it('should display product images with correct src attributes', async () => {
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

  it('should truncate long product descriptions to 60 characters', async () => {
    const longDescProducts = [
      { ...mockProducts[0], description: 'A high-performance laptop with great battery life and processing power' }
    ];
    axios.get.mockResolvedValueOnce({
      data: {
        category: mockCategory,
        products: longDescProducts
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

  it('should display short descriptions without truncation (BVA)', async () => {
    const shortDescProduct = [
      { ...mockProducts[0], description: 'Short description' }
    ];
    axios.get.mockResolvedValueOnce({
      data: {
        category: mockCategory,
        products: shortDescProduct
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
      expect(screen.getByText('Short description...')).toBeInTheDocument();
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

  it('should navigate to correct product for second item', async () => {
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
      expect(screen.getByText('Smartphone')).toBeInTheDocument();
    });
    const buttons = screen.getAllByText('More Details');
    fireEvent.click(buttons[1]);
    expect(mockNavigate).toHaveBeenCalledWith('/product/smartphone');
  });

  it('should handle products with zero price', async () => {
    const freeProduct = [{ ...mockProducts[0], price: 0 }];
    axios.get.mockResolvedValueOnce({
      data: {
        category: mockCategory,
        products: freeProduct
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
      expect(screen.getByText('$0.00')).toBeInTheDocument();
    });
  });

  it('should handle products with very high prices', async () => {
    const expensiveProduct = [{ ...mockProducts[0], price: 99999.99 }];
    axios.get.mockResolvedValueOnce({
      data: {
        category: mockCategory,
        products: expensiveProduct
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
      expect(screen.getByText('$99,999.99')).toBeInTheDocument();
    });
  });

  it('should handle products with decimal prices', async () => {
    const decimalPriceProduct = [{ ...mockProducts[0], price: 19.99 }];
    axios.get.mockResolvedValueOnce({
      data: {
        category: mockCategory,
        products: decimalPriceProduct
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
      expect(screen.getByText('$19.99')).toBeInTheDocument();
    });
  });

  it('should handle category with special characters in name', async () => {
    const specialCategory = { ...mockCategory, name: 'Electronics & Gadgets' };
    axios.get.mockResolvedValueOnce({
      data: {
        category: specialCategory,
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
      expect(screen.getByText('Category - Electronics & Gadgets')).toBeInTheDocument();
    });
  });

  it('should handle products with empty description (BVA)', async () => {
    const noDescProduct = [{ ...mockProducts[0], description: '' }];
    axios.get.mockResolvedValueOnce({
      data: {
        category: mockCategory,
        products: noDescProduct
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
  });

  it('should handle products with exactly 60 character description (BVA)', async () => {
    const exactLengthDesc = 'A'.repeat(60);
    const exactProduct = [{ ...mockProducts[0], description: exactLengthDesc }];
    axios.get.mockResolvedValueOnce({
      data: {
        category: mockCategory,
        products: exactProduct
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
      expect(screen.getByText(`${exactLengthDesc}...`)).toBeInTheDocument();
    });
  });

  it('should handle products with 61 character description (BVA: just over)', async () => {
    const overLengthDesc = 'A'.repeat(61);
    const overProduct = [{ ...mockProducts[0], description: overLengthDesc }];
    axios.get.mockResolvedValueOnce({
      data: {
        category: mockCategory,
        products: overProduct
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
      const displayed = screen.getByText(/^A+\.\.\./);  
      expect(displayed.textContent).toHaveLength(63);
    });
  });

  it('should fetch different category when slug changes', async () => {
    const booksCategory = { _id: 'cat2', name: 'Books', slug: 'books' };
    axios.get.mockResolvedValueOnce({
      data: {
        category: booksCategory,
        products: []
      }
    });

    render(
      <MemoryRouter initialEntries={['/category/books']}>
        <Routes>
          <Route path="/category/:slug" element={<CategoryProduct />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/v1/product/product-category/books');
    });
  });

  it('should handle slug with special characters', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        category: mockCategory,
        products: mockProducts
      }
    });

    render(
      <MemoryRouter initialEntries={['/category/home-decor']}>
        <Routes>
          <Route path="/category/:slug" element={<CategoryProduct />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/v1/product/product-category/home-decor');
    });
  });
});
