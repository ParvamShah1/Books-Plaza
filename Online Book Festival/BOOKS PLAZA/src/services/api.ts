import axios from 'axios';
import { Book } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Create an axios instance for admin requests
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'adminCode': '1909'  // Add admin code to all requests
  }
});

// Create a separate axios instance for public requests (without admin code)
const publicApi = axios.create({
  baseURL: API_URL,
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
  search: string = '',
  sortBy: string = '',
  sortOrder: string = 'asc',
  filters: any = {}
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
export const placeOrder = async (cartItems: any[], shippingDetails: any) => {
  try {
    const response = await publicApi.post('/orders', {
      items: cartItems,
      shipping: shippingDetails
    });
    return response.data;
  } catch (error) {
    console.error('Error placing order:', error);
    throw new Error('Failed to place order');
  }
};

export const getOrders = async () => {
  const response = await api.get('/admin/orders');
  return response.data;
};

export const createPayment = async (paymentData: {
  amount: number;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  cartItems: any[];
  shippingAddress: any;
}) => {
  try {
    console.log('Creating payment with data:', paymentData);
    const response = await publicApi.post('/create-payment', paymentData);
    console.log('Payment creation response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating payment:', error);
    throw error;
  }
};