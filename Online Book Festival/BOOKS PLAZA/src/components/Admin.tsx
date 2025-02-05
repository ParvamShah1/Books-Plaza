// src/components/Admin.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { uploadBook, getAdminBooks, updateBook, deleteBook, toggleBookStatus, getOrders, updateOrderStatus } from '../services/api';
import { Book } from '../types';

const ADMIN_CODE = '1909';

interface OrderItem {
  id: number;
  title: string;
  quantity: number;
  price: number;
}

interface Order {
  order_id: number;
  order_date: string;
  total_amount: number;
  payment_status: string;
  shipping_address: string;
  razorpay_order_id: string;
  payment_id: string;
  items: OrderItem[];
}

function Admin() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminCode, setAdminCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'books' | 'orders'>('books');
  const [books, setBooks] = useState<Book[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [totalBooks, setTotalBooks] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = useState({});
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    description: '',
    price: '',
    genre: '',
    language: 'English',
    image: null as File | null,
  });

  const genreOptions = [
    'Fiction',
    'Non-Fiction',
    'Mystery',
    'Science Fiction',
    'Fantasy',
    'Romance',
    'Thriller',
    'Horror',
    'Biography',
    'History',
    'Science',
    'Technology',
    'Self-Help',
    'Children',
    'Young Adult',
    'Poetry',
    'Drama',
    'Other'
  ];

  const languageOptions = [
    'English',
    'Spanish',
    'French',
    'German',
    'Italian',
    'Portuguese',
    'Russian',
    'Chinese',
    'Japanese',
    'Korean',
    'Hindi',
    'Arabic',
    'Other'
  ];

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminCode === ADMIN_CODE) {
      setIsAuthenticated(true);
      setAdminCode(''); // Clear the code input
      toast.success('Access granted');
    } else {
      toast.error('Invalid admin code');
      setAdminCode(''); // Clear the code input on error
    }
  };

  const fetchBooks = async () => {
    if (!isAuthenticated) return;
    
    try {
      setIsLoading(true);
      const response = await getAdminBooks(
        currentPage,
        10,
        search,
        sortBy,
        sortOrder,
        filters
      );
      setBooks(response.books || []);
      setTotalBooks(response.totalBooks || 0);
      setTotalPages(response.totalPages || 1);
    } catch (error) {
      console.error('Error fetching books:', error);
      toast.error('Failed to fetch books');
      // If we get a 401, we need to re-authenticate
      if (error?.response?.status === 401) {
        setIsAuthenticated(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrders = async () => {
    if (!isAuthenticated) return;
    
    try {
      setIsLoading(true);
      const response = await getOrders();
      // Ensure response is an array, if not, use empty array
      setOrders(Array.isArray(response) ? response : []);
      console.log('Orders fetched:', response);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders');
      if (error?.response?.status === 401) {
        setIsAuthenticated(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      if (activeTab === 'books') {
        fetchBooks();
      } else {
        fetchOrders();
      }
    }
  }, [isAuthenticated, currentPage, search, sortBy, sortOrder, filters, activeTab]);
  const handleEdit = (book: Book) => {
    setSelectedBook(book);
    setFormData({
      title: book.title,
      author: book.author,
      description: book.description || '',
      price: book.price.toString(),
      genre: book.genre,
      language: book.language,
      image: null,
    });
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.author || !formData.price || !formData.genre || !formData.language) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setIsLoading(true);
      const form = new FormData();
      form.append('title', formData.title);
      form.append('author', formData.author);
      form.append('description', formData.description);
      form.append('price', formData.price);
      form.append('genre', formData.genre);
      form.append('language', formData.language);
      if (formData.image) {
        form.append('image', formData.image);
      }

      if (selectedBook) {
        await updateBook(selectedBook.book_id, form);
        toast.success('Book updated successfully');
      } else {
        await uploadBook(form);
        toast.success('Book added successfully');
      }

      setFormData({
        title: '',
        author: '',
        description: '',
        price: '',
        genre: '',
        language: 'English',
        image: null,
      });
      setSelectedBook(null);
      fetchBooks();
    } catch (error) {
      console.error('Error saving book:', error);
      toast.error('Failed to save book');
      if (error?.response?.status === 401) {
        setIsAuthenticated(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Update the books state to include sorting
  const sortedBooks = books
    .filter(book => !book.deleted_at) // Only show non-deleted books
    .sort((a, b) => {
      // Sort by active status first
      if (a.is_active !== b.is_active) {
        return a.is_active ? -1 : 1;
      }
      // Then sort by title
      return a.title.localeCompare(b.title);
    });

  // Update the books table section
  <tbody className="bg-white divide-y divide-gray-200">
    {sortedBooks.map((book) => (
      <tr key={book.book_id}>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm font-medium text-gray-900">{book.title}</div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm text-gray-500">{book.author}</div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm text-gray-900">₹{book.price}</div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm text-gray-500">{book.genre}</div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm text-gray-500">{book.language}</div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span
            onClick={() => handleToggleStatus(book.book_id, book.is_active)}
            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full cursor-pointer hover:opacity-80 ${
              book.is_active
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {book.is_active ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
          <button
            onClick={() => handleEdit(book)}
            className="text-orange-600 hover:text-orange-900"
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(book.book_id)}
            className="text-red-600 hover:text-red-900"
          >
            Delete
          </button>
        </td>
      </tr>
    ))}
  </tbody>

  // Update the handleDelete function
  const handleDelete = async (bookId: number) => {
    if (!window.confirm('Are you sure you want to delete this book?')) return;

    try {
      setIsLoading(true);
      await deleteBook(bookId);
      toast.success('Book deleted successfully', {
        style: {
          background: 'white',
          color: 'black',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          padding: '12px 24px',
        },
        position: 'bottom-right',
        icon: '🗑️',
      });
      fetchBooks(); // This will refresh the list with only non-deleted books
    } catch (error) {
      console.error('Error deleting book:', error);
      toast.error('Failed to delete book', {
        style: {
          background: 'white',
          color: 'black',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          padding: '12px 24px',
        },
        position: 'bottom-right',
        icon: '❌',
      });
      if (error?.response?.status === 401) {
        setIsAuthenticated(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (bookId: number, currentStatus: boolean) => {
    try {
      setIsLoading(true);
      await toggleBookStatus(bookId, !currentStatus);
      toast.success('Book status updated successfully');
      fetchBooks();
    } catch (error) {
      console.error('Error updating book status:', error);
      toast.error('Failed to update book status');
      if (error?.response?.status === 401) {
        setIsAuthenticated(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
        <div className="relative py-3 sm:max-w-xl sm:mx-auto">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-300 to-blue-600 shadow-lg transform -skew-y-6 sm:skew-y-0 sm:-rotate-6 sm:rounded-3xl"></div>
          <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
            <div className="max-w-md mx-auto">
              <div className="divide-y divide-gray-200">
                <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                  <h2 className="text-2xl font-bold mb-8 text-center text-gray-900">Admin Login</h2>
                  <form onSubmit={handleCodeSubmit} className="space-y-6">
                    <div>
                      <input
                        type="password"
                        value={adminCode}
                        onChange={(e) => setAdminCode(e.target.value)}
                        placeholder="Enter admin code"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Login
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="space-x-4">
          <button
            onClick={() => setActiveTab('books')}
            className={`px-4 py-2 rounded ${
              activeTab === 'books'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Manage Books
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded ${
              activeTab === 'orders'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            View Orders
          </button>
        </div>
      </div>

      {activeTab === 'books' ? (
        // Books Management Section
        <div>
          {/* Add/Edit Book Form */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-xl font-semibold mb-4">
              {selectedBook ? 'Edit Book' : 'Add New Book'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Author</label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Genre</label>
                <select
                  value={formData.genre}
                  onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  required
                >
                  <option value="">Select a genre</option>
                  {genreOptions.map((genre) => (
                    <option key={genre} value={genre}>
                      {genre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Language</label>
                <select
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  required
                >
                  {languageOptions.map((language) => (
                    <option key={language} value={language}>
                      {language}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFormData({ ...formData, image: e.target.files?.[0] || null })}
                  className="mt-1 block w-full"
                />
              </div>
              <div className="flex justify-end space-x-3">
                {selectedBook && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBook(null);
                      setFormData({
                        title: '',
                        author: '',
                        description: '',
                        price: '',
                        genre: '',
                        language: 'English',
                        image: null,
                      });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                  disabled={isLoading}
                >
                  {selectedBook ? 'Update Book' : 'Add Book'}
                </button>
              </div>
            </form>
          </div>

          {/* Books List */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Books List</h2>
                <div className="flex space-x-4">
                  <input
                    type="text"
                    placeholder="Search books..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Author
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Genre
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Language
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  {/* // Then update the table body to use sortedBooks instead of books */}
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedBooks.map((book) => (
                      <tr key={book.book_id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{book.title}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{book.author}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">${book.price}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{book.genre}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{book.language}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            onClick={() => handleToggleStatus(book.book_id, book.is_active)}
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full cursor-pointer hover:opacity-80 ${
                              book.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {book.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => handleEdit(book)}
                            className="text-orange-600 hover:text-orange-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(book.book_id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-700">
                  Showing {(currentPage - 1) * 10 + 1} to{' '}
                  {Math.min(currentPage * 10, totalBooks)} of {totalBooks} results
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border rounded-md disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border rounded-md disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Orders Section
        <div className="grid gap-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Orders</h2>
            <div className="space-x-4">
              <button
                onClick={() => setOrderStatusFilter('all')}
                className={`px-4 py-2 rounded ${orderStatusFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                All Orders
              </button>
              <button
                onClick={() => setOrderStatusFilter('Completed')}
                className={`px-4 py-2 rounded ${orderStatusFilter === 'Completed' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                Completed Orders
              </button>
              <button
                onClick={() => setOrderStatusFilter('Pending')}
                className={`px-4 py-2 rounded ${orderStatusFilter === 'Pending' ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                Pending Orders
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center p-4">Loading orders...</div>
          ) : !Array.isArray(orders) || orders.length === 0 ? (
            <div className="text-center p-4 text-gray-500">No orders found</div>
          ) : (
            orders
              .filter(order => orderStatusFilter === 'all' || order.payment_status === orderStatusFilter)
              .map((order) => {
              const address = typeof order.shipping_address === 'string' 
                ? JSON.parse(order.shipping_address) 
                : order.shipping_address;
              
              return (
                <div key={order.order_id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-semibold">Order #{order.order_id}</h2>
                      <p className="text-gray-600">
                        {new Date(order.order_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        order.payment_status === 'Completed' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.payment_status}
                      </span>
                        <button
                          onClick={async () => {
                            try {
                              const newStatus = order.payment_status === 'Completed' ? 'Pending' : 'Completed';
                              await updateOrderStatus(order.order_id, newStatus);
                              toast.success(`Order marked as ${newStatus}`);
                              fetchOrders();
                            } catch (error) {
                              toast.error('Failed to update order status');
                            }
                          }}
                          className={`px-2 py-1 rounded text-sm ${order.payment_status === 'Completed' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'} hover:opacity-80`}
                        >
                          Mark as {order.payment_status === 'Completed' ? 'Pending' : 'Completed'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="font-semibold mb-2">Items</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Item</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Quantity</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Price</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {order.items.map((item) => (
                            <tr key={item.id}>
                              <td className="px-4 py-2">{item.title}</td>
                              <td className="px-4 py-2">{item.quantity}</td>
                              <td className="px-4 py-2">₹{item.price.toFixed(2)}</td>
                              <td className="px-4 py-2">₹{(item.price * item.quantity).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold mb-2">Shipping Address</h3>
                      <div className="text-gray-600">
                        <p>{address.street}</p>
                        <p>{address.city}, {address.state}</p>
                        <p>{address.postalCode}</p>
                        <p>{address.country}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold mb-2">Payment Details</h3>
                      <div className="text-gray-600">
                        <p>Transaction ID: {order.razorpay_order_id}</p>
                        <p>Payment ID: {order.payment_id}</p>
                        <p className="font-medium text-lg mt-2">
                          Total Amount: ₹{parseFloat(order.total_amount).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default Admin;
