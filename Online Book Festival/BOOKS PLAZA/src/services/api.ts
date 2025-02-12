import axios from 'axios';
import { Book } from '../types';
import { API_BASE_URL } from '../config';

// Using the environment variable which includes '/api'
// const API_URL = import.meta.env.VITE_API_URL;

// Create an axios instance for admin requests
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'adminCode': '1909'
  }
});

// Add request interceptor for debugging
api.interceptors.request.use(request => {
    console.log('Starting Request:', {
        url: request.url,
        method: request.method,
        data: request.data
    });
    return request;
});

// Add response interceptor for debugging
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', {
      status: error.response?.status,
      message: error.message,
      url: error.config?.url
    });
    throw error;
  }
);

// Create axios instance with the base URL that already includes '/api'
const publicApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});
// Get featured books
export const getFeaturedBooks = async (): Promise<Book[]> => {
  try {
    const response = await publicApi.get('/books/featured');
    return response.data;
  } catch (error) {
    console.error('Error fetching featured books:', error);
    throw new Error('Failed to fetch featured books');
  }
};

// Admin Book Management APIs
export const getAdminBooks = async (
  page: number = 1,
  limit: number = 10,
  search?: string,
  sortBy?: string,
  sortOrder?: string,
  filters?: Record<string, string>
) => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
      ...(sortBy && { sortBy }),
      ...(sortOrder && { sortOrder }),
      ...filters
    });

    const response = await api.get(`/admin/books?${params}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching admin books:', error);
    throw error;
  }
};

export const uploadBook = async (formData: FormData) => {
  try {
    const response = await api.post('/admin/books', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading book:', error);
    throw new Error('Failed to upload book');
  }
};

export const updateBook = async (bookId: number, formData: FormData) => {
  try {
    const response = await api.put(`/admin/books/${bookId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error updating book:', error);
    throw new Error('Failed to update book');
  }
};

export const deleteBook = async (bookId: number) => {
  try {
    const response = await api.delete(`/admin/books/${bookId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting book:', error);
    throw new Error('Failed to delete book');
  }
};

export const toggleBookStatus = async (bookId: number, active: boolean) => {
  try {
    const response = await api.patch(
      `/admin/books/${bookId}/status`,
      { active }
    );
    return response.data;
  } catch (error) {
    console.error('Error toggling book status:', error);
    throw new Error('Failed to toggle book status');
  }
};

export const getBookDetails = async (bookId: number): Promise<Book> => {
  try {
    const response = await publicApi.get(`/books/${bookId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching book details:', error);
    throw new Error('Failed to fetch book details');
  }
};

// Order Management
export const placeOrder = async (cartItems: Array<{ book_id: number; quantity: number; price: number }>, shippingDetails: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}) => {
  try {
    const response = await publicApi.post('/orders', {
      items: cartItems,
      shipping: shippingDetails
    });
    return response.data;
  } catch (error) {
    console.error('Error placing order:', error);
    throw error; // Throw the actual error for better error handling
  }
};

export const getOrders = async (page: number = 1, limit: number = 10) => {
  try {
    console.log('Requesting orders with:', { page, limit });
    const response = await api.get('/admin/orders', {
      params: {
        page,
        limit
      }
    });
    console.log('Orders response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
};

export const updateOrderStatus = async (orderId: number, status: string) => {
  try {
    const response = await publicApi.put(`/orders/${orderId}/status`, { status });
    return response.data;
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
};

// Payment related APIs
// Updated createPayment function
// Updated createPayment function with proper numeric handling
export const createPayment = async (orderData: {
  orderId: number;
  amount: number | string; // Allow both number and string input
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}) => {
  try {
      // Convert amount to number and validate
      const numericAmount = Number(orderData.amount);
      
      if (isNaN(numericAmount)) {
          throw new Error(`Invalid amount value: ${orderData.amount}`);
      }

      // Format to 2 decimal places and convert to number
      const formattedAmount = parseFloat(numericAmount.toFixed(2));

      const payload = {
          ...orderData,
          amount: formattedAmount
      };

      console.log('Payment Payload:', payload);
      
      const response = await api.post('/create-payment', payload);
      
      if (!response.data.redirectUrl) {
          throw new Error('Missing redirect URL from PhonePe');
      }
      
      return {
          redirectUrl: response.data.redirectUrl,
          transactionId: response.data.transactionId
      };

  } catch (error: any) {
      console.error('Payment Error:', {
          message: error.message,
          response: error.response?.data
      });
      throw new Error(error.response?.data?.error || 'Payment initiation failed');
  }
};
// NEW FUNCTION: Create Order
export const createOrder = async (orderData: any) => {
  try {
      const response = await publicApi.post('/orders', orderData);
      return response.data;
  } catch (error: any) { // Use type 'any' to access error properties
      console.error('Error creating order:', error);
      // Check if the error is an Axios error and has a response
      if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          console.error('Error Data:', error.response.data);
          console.error('Error Status:', error.response.status);
          console.error('Error Headers:', error.response.headers);
          // Provide a more specific error message, including details from the backend
          throw new Error(`Failed to create order: ${error.response.data.error || 'Unknown server error'}`);
      } else if (error.request) {
          // The request was made but no response was received
          console.error('Error Request:', error.request);
          throw new Error('Failed to create order: No response from server');
      } else {
          // Something happened in setting up the request that triggered an Error
          console.error('Error Message:', error.message);
          throw new Error(`Failed to create order: ${error.message}`);
      }
  }
};

export const getOrderDetails = async (orderId: number) => {
    try {
        console.log('Fetching order details for orderId:', orderId);
        const response = await publicApi.get(`/orders/${orderId}`);
        console.log('Order details response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error fetching order details:', error);
        throw new Error('Failed to fetch order details');
    }
};

export const addBook = async (bookData: Omit<Book, 'book_id'>) => {
  try {
    const response = await api.post('/admin/books', bookData);
    return response.data;
  } catch (error) {
    console.error('Error adding book:', error);
    throw new Error('Failed to add book');
  }
};

export const getAllOrders = async () => {
  try {
    const response = await api.get('/admin/orders');
    return response.data;
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
};

export const updateOrder = async (orderId: number, updatedOrder: any) => {
  try {
    const response = await api.put(`/admin/orders/${orderId}`, updatedOrder);
    return response.data;
  } catch (error) {
    console.error('Error updating order:', error);
    throw error;
  }
};

// Books related APIs
export const fetchBooks = async () => {
    try {
        const response = await publicApi.get('/books');
        return response.data;
    } catch (error) {
        console.error('Error fetching books:', error);
        throw new Error('Failed to fetch books');
    }
};

export const fetchBookById = async (id: number) => {
    try {
        const response = await publicApi.get(`/books/${id}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching book:', error);
        throw new Error('Failed to fetch book');
    }
};

// Function to fetch book data from Google Books API by ISBN
export const getBookByISBN = async (isbn: string) => {
  try {
    const response = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);

    if (response.data.items && response.data.items.length > 0) {
      // Extract relevant data from the first result
      const bookData = response.data.items[0].volumeInfo;
      return bookData;
    } else {
      return null; // Book not found
    }
  } catch (error) {
    console.error('Error fetching book by ISBN:', error);
    throw error;
  }
};
async function getOrderById(orderId: string) {
  const query = `
      SELECT o.*,
             json_agg(json_build_object(
              'book_id', oi.book_id,
              'quantity', oi.quantity,
              'title', b.title,
              'price', b.price
             )) as items
      FROM orders o
      JOIN order_items oi ON o.order_id = oi.order_id
      JOIN books b ON oi.book_id = b.book_id
      WHERE o.order_id = $1
      GROUP BY o.order_id;
  `;

  const result = await db.query(query, [orderId]);
  return result.rows[0];
}