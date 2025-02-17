import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { uploadBook, getAdminBooks, updateBook, deleteBook, toggleBookStatus, getOrders, updateOrderStatus, getBookByISBN } from '../services/api';
import { Book } from '../types';

const ADMIN_CODE = '1909';

interface OrderItem {
  id: number;
  title: string;
  quantity: number;
  price: number;
  book_image: string | null;
}

interface Order {
  order_id: number;
  order_date: string;
  total_amount: string; // Keep as string, since it's coming as string
  payment_status: string;
  shipping_address: { // Define the structure of shipping_address
    address: string;
    apartment: string;
    city: string;
    country: string;
    firstName: string;
    lastName: string;
    state: string;
    zip: string;
  } | string; // It can be a string (for parsing) or the object
  transaction_id: string | null;
  payment_id: string;
  items: OrderItem[];
  razorpay_order_id?: string; // Optional, in case it's not always present
  customer_name: string;     // Add customer_name
  customer_email: string;    // Add customer_email
  customer_phone: string;    // Add customer_phone
}
function Admin() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminCode, setAdminCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'books' | 'orders'>('books');
  const [books, setBooks] = useState<Book[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderPage, setOrderPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [orderTotalPages, setOrderTotalPages] = useState(1);
  const [ordersPerPage] = useState(10);
  const [totalBooks, setTotalBooks] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [bookTotalPages, setBookTotalPages] = useState(1);
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
    language: '',
    image: null as File | null,
    publisher: '',
    publishDate: '',
    pages: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isbn, setIsbn] = useState('');

    const genreOptions = [
        'Fiction', 'Non-Fiction', 'Mystery', 'Science Fiction', 'Fantasy',
        'Romance', 'Thriller', 'Horror', 'Biography', 'History', 'Science',
        'Technology', 'Self-Help', 'Children', 'Young Adult', 'Poetry', 'Drama', 'Other'
    ];
    const languageOptions = [
        'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese',
        'Russian', 'Chinese', 'Japanese', 'Korean', 'Hindi', 'Arabic', 'Other'
    ];

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminCode === ADMIN_CODE) {
      setIsAuthenticated(true);
      setAdminCode('');
      toast.success('Access granted');
    } else {
      toast.error('Invalid admin code');
      setAdminCode('');
    }
  };

   const fetchBooks = async () => {
    setIsLoading(true);
    try {
      const response = await getAdminBooks(currentPage, 10, search, sortBy, sortOrder, filters);
      setBooks(response.books || []);
      setTotalBooks(response.totalBooks || 0);
      setBookTotalPages(response.totalPages || 1);
      setError(null);
    } catch (error: any) {
      console.error('Error in Admin component:', error);
      setError(error.message || 'Failed to load books');
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
            const response = await getOrders(orderPage, ordersPerPage);
            
            if (response && response.orders) {
                setOrders(response.orders);
                setTotalOrders(response.totalOrders);
                setOrderTotalPages(response.totalPages);
                
                // If we're on a page that no longer exists, go to the last page
                if (orderPage > response.totalPages) {
                    setOrderPage(response.totalPages);
                }
            } else {
                console.error("Unexpected response from getOrders:", response);
                setOrders([]);
                setTotalOrders(0);
                setOrderTotalPages(1);
                toast.error("Failed to fetch orders: Invalid data received.");
            }
        } catch (error: any) {
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
            fetchBooks();
        }
    }, [currentPage, search, sortBy, sortOrder, filters, isAuthenticated]);

    useEffect(() => {
        if (isAuthenticated && activeTab === 'orders') {
            fetchOrders();
        }
    }, [isAuthenticated, activeTab, orderPage]); // Added orderPage to dependencies

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
      publisher: book.publisher || '',
      publishDate: book.publishDate || '',
      pages: book.pages ? book.pages.toString() : ''
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
      form.append("title", formData.title);
      form.append("author", formData.author);
      form.append("description", formData.description);
      form.append("price", formData.price);
      form.append("genre", formData.genre);
      form.append("language", formData.language);
      form.append("isbn", isbn);
      form.append("publisher", formData.publisher);
      form.append("publishDate", formData.publishDate);
      form.append("pages", formData.pages);
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
        language: '',
        image: null,
        publisher: '',
        publishDate: '',
        pages: '',
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
   const sortedBooks = books
    .filter(book => !book.deleted_at)
    .sort((a, b) => {
      if (a.is_active !== b.is_active) {
        return a.is_active ? -1 : 1;
      }
      return a.title.localeCompare(b.title);
    });


  const handleDelete = async (bookId: number) => {
    if (!window.confirm('Are you sure you want to delete this book?')) return;
    try {
      setIsLoading(true);
      await deleteBook(bookId);
      toast.success('Book deleted successfully');
      fetchBooks();
    } catch (error) {
      console.error('Error deleting book:', error);
      toast.error('Failed to delete book');
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

  const handleIsbnLookup = async () => {
    if (!isbn) {
      toast.error("Please enter an ISBN");
      return;
    }
    try {
      const bookData = await getBookByISBN(isbn);
      if (bookData) {
        console.log("Fetched bookData:", bookData);
        setFormData({
          ...formData,
          title: bookData.title || '',
          author: bookData.authors ? bookData.authors.join(', ') : '',
          description: bookData.description || '',
          genre: bookData.genre || '',
          language: bookData.language || 'English',
          image: null,
          publisher: bookData.publisher || '',
          publishDate: bookData.publishedDate || '',
          pages: bookData.pageCount || '',
        });
        toast.success("Book data fetched successfully!");
      } else {
        toast.error("Book not found for this ISBN.");
      }
    } catch (error) {
      toast.error('Error fetching book data.');
    }
  };

  if (!isAuthenticated) {
    return (
      /* ... (Your login form, unchanged) ... */
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

    if (error) {
        return (
            /* ... (Your error display, unchanged) ... */
            <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-red-600 text-xl font-bold mb-4">Error</h2>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
        );
    }


  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="space-x-4">
          <button
            onClick={() => setActiveTab('books')}
            className={`px-4 py-2 rounded ${activeTab === 'books'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
          >
            Manage Books
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded ${activeTab === 'orders'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
          >
            View Orders
          </button>
        </div>
      </div>

      {activeTab === 'books' ? (
        /* ... (Your entire book management section remains unchanged) ... */
        <div>
          <div className="mb-4 flex items-center">
            <input
              type="text"
              placeholder="Enter ISBN"
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 mr-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
            <button
              onClick={handleIsbnLookup}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Lookup Book
            </button>
          </div>
          {/* ... (Rest of your book management code remains the same) ... */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-xl font-semibold mb-4">
              {selectedBook ? 'Edit Book' : 'Add New Book'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="title">
                    Title:
                  </label>
                  <input
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    id="title"
                    type="text"
                    placeholder="Title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="author">
                    Author:
                  </label>
                  <input
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    id="author"
                    type="text"
                    placeholder="Author"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  />
                </div>
                <div className="mb-4 col-span-2">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">

Description:

</label>

<textarea

className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none h-48"

id="description"
placeholder="Description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  ></textarea>
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="price">
                    Price:
                  </label>
                  <input
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    id="price"
                    type="text"
                    placeholder="Price"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="genre">
                    Genre:
                  </label>
                  <select
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    id="genre"
                    value={formData.genre}
                    onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                  >
                    <option value="">Select Genre</option>
                    {genreOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="language">
                    Language:
                  </label>
                  <select
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    id="language"
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  >
                    <option value="">Select Language</option>
                    {languageOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="image">
                    Image:
                  </label>
                  <input
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    id="image"
                    type="file"
                    onChange={(e) => setFormData({ ...formData, image: e.target.files ? e.target.files[0] : null })}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="publisher">
                    Publisher:
                  </label>
                  <input
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    id="publisher"
                    type="text"
                    placeholder="Publisher"
                    value={formData.publisher}
                    onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="publishDate">
                    Publish Date:
                  </label>
                  <input
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    id="publishDate"
                    type="text"
                    placeholder="Publish Date (YYYY-MM-DD)"
                    value={formData.publishDate}
                    onChange={(e) => setFormData({ ...formData, publishDate: e.target.value })}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="pages">
                    Pages:
                  </label>
                  <input
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    id="pages"
                    type="text"
                    placeholder="Number of Pages"
                    value={formData.pages}
                    onChange={(e) => setFormData({ ...formData, pages: e.target.value })}
                  />
                </div>
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
                        language: '',
                        image: null,
                        publisher: '',
                        publishDate: '',
                        pages: '',
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
                  <tbody className="bg-white divide-y divide-gray-200">
                    {books.map((book) => (
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
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full cursor-pointer hover:opacity-80 ${book.is_active
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
                    disabled={currentPage === bookTotalPages}
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
            <h2 className="text-xl font-semibold">Active Orders</h2>
          </div>

          {isLoading ? (
            <div className="text-center p-4">Loading orders...</div>
          ) : !Array.isArray(orders) || orders.length === 0 ? (
            <div className="text-center p-4 text-gray-500">No orders found</div>
          ) : (
            orders
              .slice((orderPage - 1) * ordersPerPage, orderPage * ordersPerPage)
              .map((order) => {
                // Parse shipping address safely and correctly handle object/string
                let address = { street: '', city: '', state: '', postalCode: '', country: '', firstName: '', lastName: '', apartment: '' };
                try {
                  if (typeof order.shipping_address === 'string') {
                      const parsedAddress = JSON.parse(order.shipping_address);
                        address = {
                            firstName: parsedAddress.firstName || '',
                            lastName: parsedAddress.lastName || '',
                            street: parsedAddress.address || '', // Use 'address' for street
                            apartment: parsedAddress.apartment || '',
                            city: parsedAddress.city || '',
                            state: parsedAddress.state || '',
                            postalCode: parsedAddress.zip || '',  // Use 'zip' for postal code
                            country: parsedAddress.country || '',
                        };
                    } else if (order.shipping_address && typeof order.shipping_address === 'object') {
                       address = {
                            firstName: order.shipping_address.firstName || '',
                            lastName: order.shipping_address.lastName || '',
                            street: order.shipping_address.address || '', // Use 'address' for street
                            apartment: order.shipping_address.apartment || '',
                            city: order.shipping_address.city || '',
                            state: order.shipping_address.state || '',
                            postalCode: order.shipping_address.zip || '',  // Use 'zip'
                            country: order.shipping_address.country || '',
                        };
                    }
                } catch (error) {
                  console.error("Error parsing shipping address:", order.shipping_address, error);
                }

                return (
                  <>
                  <div key={order.order_id} className="bg-white rounded-lg shadow-md p-6 mb-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h2 className="text-xl font-semibold">Order #{order.order_id}</h2>
                        <p className="text-gray-600">
                          {new Date(order.order_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                         <p className="text-gray-700">Customer: {order.customer_name} ({order.customer_email})</p> {/* Display customer details */}
                        <p className="text-gray-700">Phone: {order.customer_phone}</p>

                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${order.payment_status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                          >
                            {order.payment_status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto mt-4">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr>
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
                                 {/* <td className="px-4 py-2">
                                  {item.book_image && (
                                    <img src={item.book_image} alt={item.title} className="h-12 w-12 object-contain" />
                                     )}
                                </td> */}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-semibold mb-2">Shipping Address</h3>
                        <div className="text-gray-600">
                            <p>{address.firstName} {address.lastName}</p>
                            <p>{address.street} {address.apartment}</p>
                            <p>{address.city}, {address.state} {address.postalCode}</p>
                            <p>{address.country}</p>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">Payment Details</h3>
                        <div className="text-gray-600">
                          <p>Transaction ID: {order.transaction_id || 'N/A'}</p> {/* Handle null */}
                          <p>Payment ID: {order.payment_id}</p>  {/* Keep as is, for the link later */}
                          {/* <p>Razorpay Order ID: {order.razorpay_order_id || 'N/A'}</p>  Handle potential undefined */}
                          <p className="font-medium text-lg mt-2">
                            Total Amount: ₹{order.total_amount}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  </>
                );
              })
          )}
          {totalOrders > 0 && (
            <div className="flex flex-col space-y-4 mt-4">
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-700">
                    Showing {(orderPage - 1) * ordersPerPage + 1} to{' '}
                    {Math.min(orderPage * ordersPerPage, totalOrders)} of {totalOrders} orders
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setOrderPage(prev => prev - 1)}
                        disabled={orderPage <= 1}
                        className="px-4 py-2 border rounded-md disabled:opacity-50 hover:bg-gray-50 transition-colors"
                      >
                        Previous
                      </button>
                      <div className="flex items-center space-x-1 px-2">
                        {Array.from({ length: orderTotalPages }, (_, i) => i + 1).map(pageNum => (
                          <button
                            key={pageNum}
                            onClick={() => setOrderPage(pageNum)}
                            className={`px-3 py-1 rounded-md transition-colors ${
                              pageNum === orderPage
                                ? 'bg-blue-600 text-white'
                                : 'hover:bg-gray-100'
                            }`}
                          >
                            {pageNum}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setOrderPage(prev => prev + 1)}
                        disabled={orderPage >= orderTotalPages}
                        className="px-4 py-2 border rounded-md disabled:opacity-50 hover:bg-gray-50 transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-500 text-center">
                Total Orders: {totalOrders}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Admin;