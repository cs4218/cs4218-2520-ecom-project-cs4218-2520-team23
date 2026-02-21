// Liu Yiyang, A0258121M
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProductDetails from './ProductDetails';
import axios from 'axios';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('axios');

jest.mock('./../components/Layout', () => {
  return function Layout({ children }) {
    return <div data-testid="layout">{children}</div>;
  };
});

jest.mock('../context/auth', () => ({
  useAuth: jest.fn(() => [null, jest.fn()]),
}));

jest.mock('../context/cart', () => ({
  useCart: jest.fn(() => [[], jest.fn()]),
}));

jest.mock('../context/search', () => ({
  useSearch: jest.fn(() => [{ keyword: '' }, jest.fn()]),
}));

describe('ProductDetails Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
  });

  const mockProduct = {
    _id: '123',
    name: 'Test Product',
    slug: 'test-product',
    description: 'This is a test product description',
    price: 99.99,
    category: {
      _id: 'cat1',
      name: 'Electronics',
    },
  };

  const mockRelatedProducts = [
    {
      _id: '456',
      name: 'Related Product 1',
      slug: 'related-product-1',
      description: 'This is a related product with a long description that will be truncated',
      price: 49.99,
    },
    {
      _id: '789',
      name: 'Related Product 2',
      slug: 'related-product-2',
      description: 'Another related product description',
      price: 79.99,
    },
  ];

  describe('Rendering', () => {
    it('should render the component with product details', async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes('/get-product/')) {
          return Promise.resolve({ data: { product: mockProduct } });
        }
        if (url.includes('/related-product/')) {
          return Promise.resolve({ data: { products: [] } });
        }
      });

      render(
        <MemoryRouter initialEntries={['/product/test-product']}>
          <Routes>
            <Route path="/product/:slug" element={<ProductDetails />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByTestId('layout')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Product Details')).toBeInTheDocument();
      });
    });

    it('should display product information correctly', async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes('/get-product/')) {
          return Promise.resolve({ data: { product: mockProduct } });
        }
        if (url.includes('/related-product/')) {
          return Promise.resolve({ data: { products: [] } });
        }
      });

      render(
        <MemoryRouter initialEntries={['/product/test-product']}>
          <Routes>
            <Route path="/product/:slug" element={<ProductDetails />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Name :/)).toBeInTheDocument();
        expect(screen.getByText(/Test Product/)).toBeInTheDocument();
        expect(screen.getByText(/Description :/)).toBeInTheDocument();
        expect(screen.getByText(/This is a test product description/)).toBeInTheDocument();
        expect(screen.getByText(/Price :/)).toBeInTheDocument();
        expect(screen.getByText(/\$99\.99/)).toBeInTheDocument();
        expect(screen.getByText(/Category :/)).toBeInTheDocument();
        expect(screen.getByText(/Electronics/)).toBeInTheDocument();
      });
    });

    it('should display product image with correct src', async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes('/get-product/')) {
          return Promise.resolve({ data: { product: mockProduct } });
        }
        if (url.includes('/related-product/')) {
          return Promise.resolve({ data: { products: [] } });
        }
      });

      render(
        <MemoryRouter initialEntries={['/product/test-product']}>
          <Routes>
            <Route path="/product/:slug" element={<ProductDetails />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        const images = screen.getAllByRole('img');
        const productImage = images.find(img => img.alt === 'Test Product');
        expect(productImage).toHaveAttribute('src', '/api/v1/product/product-photo/123');
      });
    });

    it('should display "ADD TO CART" button', async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes('/get-product/')) {
          return Promise.resolve({ data: { product: mockProduct } });
        }
        if (url.includes('/related-product/')) {
          return Promise.resolve({ data: { products: [] } });
        }
      });

      render(
        <MemoryRouter initialEntries={['/product/test-product']}>
          <Routes>
            <Route path="/product/:slug" element={<ProductDetails />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('ADD TO CART')).toBeInTheDocument();
      });
    });
  });

  describe('Related Products', () => {
    it('should display related products when available', async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes('/get-product/')) {
          return Promise.resolve({ data: { product: mockProduct } });
        }
        if (url.includes('/related-product/')) {
          return Promise.resolve({ data: { products: mockRelatedProducts } });
        }
      });

      render(
        <MemoryRouter initialEntries={['/product/test-product']}>
          <Routes>
            <Route path="/product/:slug" element={<ProductDetails />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Similar Products ➡️')).toBeInTheDocument();
        expect(screen.getByText('Related Product 1')).toBeInTheDocument();
        expect(screen.getByText('Related Product 2')).toBeInTheDocument();
      });
    });

    it('should display "No Similar Products found" when no related products', async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes('/get-product/')) {
          return Promise.resolve({ data: { product: mockProduct } });
        }
        if (url.includes('/related-product/')) {
          return Promise.resolve({ data: { products: [] } });
        }
      });

      render(
        <MemoryRouter initialEntries={['/product/test-product']}>
          <Routes>
            <Route path="/product/:slug" element={<ProductDetails />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('No Similar Products found')).toBeInTheDocument();
      });
    });

    it('should display related product prices correctly', async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes('/get-product/')) {
          return Promise.resolve({ data: { product: mockProduct } });
        }
        if (url.includes('/related-product/')) {
          return Promise.resolve({ data: { products: mockRelatedProducts } });
        }
      });

      render(
        <MemoryRouter initialEntries={['/product/test-product']}>
          <Routes>
            <Route path="/product/:slug" element={<ProductDetails />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('$49.99')).toBeInTheDocument();
        expect(screen.getByText('$79.99')).toBeInTheDocument();
      });
    });

    it('should truncate related product descriptions to 60 characters', async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes('/get-product/')) {
          return Promise.resolve({ data: { product: mockProduct } });
        }
        if (url.includes('/related-product/')) {
          return Promise.resolve({ data: { products: mockRelatedProducts } });
        }
      });

      render(
        <MemoryRouter initialEntries={['/product/test-product']}>
          <Routes>
            <Route path="/product/:slug" element={<ProductDetails />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        const truncatedText = screen.getByText(/This is a related product with a long description that will/);
        expect(truncatedText.textContent).toMatch(/\.\.\.$/);
      });
    });

    it('should navigate to product details when "More Details" button is clicked', async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes('/get-product/')) {
          return Promise.resolve({ data: { product: mockProduct } });
        }
        if (url.includes('/related-product/')) {
          return Promise.resolve({ data: { products: mockRelatedProducts } });
        }
      });

      render(
        <MemoryRouter initialEntries={['/product/test-product']}>
          <Routes>
            <Route path="/product/:slug" element={<ProductDetails />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        const moreDetailsButtons = screen.getAllByText('More Details');
        expect(moreDetailsButtons).toHaveLength(2);
      });

      const moreDetailsButtons = screen.getAllByText('More Details');
      moreDetailsButtons[0].click();

      expect(mockNavigate).toHaveBeenCalledWith('/product/related-product-1');
    });
  });

  describe('API Calls', () => {
    it('should fetch product data when slug is provided', async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes('/get-product/')) {
          return Promise.resolve({ data: { product: mockProduct } });
        }
        if (url.includes('/related-product/')) {
          return Promise.resolve({ data: { products: [] } });
        }
      });

      render(
        <MemoryRouter initialEntries={['/product/test-product']}>
          <Routes>
            <Route path="/product/:slug" element={<ProductDetails />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith('/api/v1/product/get-product/test-product');
      });
    });

    it('should fetch related products after fetching main product', async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes('/get-product/')) {
          return Promise.resolve({ data: { product: mockProduct } });
        }
        if (url.includes('/related-product/')) {
          return Promise.resolve({ data: { products: mockRelatedProducts } });
        }
      });

      render(
        <MemoryRouter initialEntries={['/product/test-product']}>
          <Routes>
            <Route path="/product/:slug" element={<ProductDetails />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith('/api/v1/product/related-product/123/cat1');
      });
    });

    it('should not fetch product when slug is undefined', () => {
      axios.get.mockResolvedValue({ data: {} });

      render(
        <MemoryRouter initialEntries={['/product']}>
          <Routes>
            <Route path="/product" element={<ProductDetails />} />
          </Routes>
        </MemoryRouter>
      );

      expect(axios.get).not.toHaveBeenCalled();
    });

    it('should handle error when fetching product fails', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      axios.get.mockRejectedValue(new Error('Failed to fetch product'));

      render(
        <MemoryRouter initialEntries={['/product/test-product']}>
          <Routes>
            <Route path="/product/:slug" element={<ProductDetails />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.any(Error));
      });

      consoleLogSpy.mockRestore();
    });

    it('should handle error when fetching related products fails', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      axios.get.mockImplementation((url) => {
        if (url.includes('/get-product/')) {
          return Promise.resolve({ data: { product: mockProduct } });
        }
        if (url.includes('/related-product/')) {
          return Promise.reject(new Error('Failed to fetch related products'));
        }
      });

      render(
        <MemoryRouter initialEntries={['/product/test-product']}>
          <Routes>
            <Route path="/product/:slug" element={<ProductDetails />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.any(Error));
      });

      consoleLogSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle product with no category gracefully', async () => {
      const productWithoutCategory = {
        ...mockProduct,
        category: null,
      };

      axios.get.mockImplementation((url) => {
        if (url.includes('/get-product/')) {
          return Promise.resolve({ data: { product: productWithoutCategory } });
        }
        if (url.includes('/related-product/')) {
          return Promise.resolve({ data: { products: [] } });
        }
      });

      render(
        <MemoryRouter initialEntries={['/product/test-product']}>
          <Routes>
            <Route path="/product/:slug" element={<ProductDetails />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Product Details')).toBeInTheDocument();
      });
    });

    it('should handle product with no price gracefully', async () => {
      const productWithoutPrice = {
        ...mockProduct,
        price: undefined,
      };

      axios.get.mockImplementation((url) => {
        if (url.includes('/get-product/')) {
          return Promise.resolve({ data: { product: productWithoutPrice } });
        }
        if (url.includes('/related-product/')) {
          return Promise.resolve({ data: { products: [] } });
        }
      });

      render(
        <MemoryRouter initialEntries={['/product/test-product']}>
          <Routes>
            <Route path="/product/:slug" element={<ProductDetails />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Product Details')).toBeInTheDocument();
      });
    });
  });
});
