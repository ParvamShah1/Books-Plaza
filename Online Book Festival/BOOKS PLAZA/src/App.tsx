import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import Navbar from './components/Navbar';
import FeaturedBooks from './components/FeaturedBooks';
import Cart from './components/Cart';
import Admin from './components/Admin';
import CheckoutForm from './components/CheckoutForm';
import BookDetails from './components/BookDetails';
import { CartItem, Book } from './types';
import AboutUs from './components/AboutUs';
import ContactUs from './components/ContactUs';
import ReturnPolicy from './components/ReturnPolicy';
import Terms from './components/Terms';
import PaymentSuccess from './pages/PaymentSuccess';

// PrivateRoute component (adjust as needed)
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  //... (your authentication logic)
};

function App() {
  const [cart, setCart] = useState<CartItem[]>([]); // Initialize as an empty array

  useEffect(() => {
    // Get cart from local storage
    const storedCart = localStorage.getItem('cart');
    if (storedCart) {
      try {
        const parsedCart = JSON.parse(storedCart);
        setCart(Array.isArray(parsedCart) ? parsedCart : []);
      } catch (error) {
        console.error('Error parsing cart from localStorage:', error);
        localStorage.removeItem('cart'); // Clear invalid cart data
      }
    }
  }, []); // Add empty dependency array

  useEffect(() => {
    // Update local storage whenever cart changes
    if (cart) {
      localStorage.setItem('cart', JSON.stringify(cart));
    }
  }, [cart]);

  const handleAddToCart = (book: Book) => {
    setCart(currentCart => {
      const existingItemIndex = currentCart.findIndex(item => item.book_id === book.book_id);
      
      if (existingItemIndex > -1) {
        const newCart = [...currentCart];
        newCart[existingItemIndex].quantity += 1;
        toast.success(`Added another copy of ${book.title} to cart`, {
          style: {
            background: 'white',
            color: 'black',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            padding: '12px 24px',
          },
          position: 'bottom-right',
          icon: '🛒',
        });
        return newCart;
      } else {
        toast.success(`Added ${book.title} to cart`, {
          style: {
            background: 'white',
            color: 'black',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            padding: '12px 24px',
          },
          position: 'bottom-right',
          icon: '🛒',
        });
        return [...currentCart, {...book, quantity: 1}];
      }
    });
  };

  
  const handleUpdateCart = (newCart: CartItem[]) => {
    setCart(newCart);
  };

  const handleRemoveFromCart = (bookId: number) => {
    setCart(currentCart => currentCart.filter(item => item.book_id !== bookId));
  };

  const handleCheckoutComplete = () => {
    setCart([]);
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Toaster position="bottom-right" />
        <Navbar cartItemCount={cart.reduce((total, item) => total + item.quantity, 0)} />
        <div className="pt-16">
          <Routes>
            <Route path="/" element={<FeaturedBooks onAddToCart={handleAddToCart} />} />
            <Route 
              path="/cart" 
              element={
                <Cart 
                  cart={cart} 
                  onUpdateCart={handleUpdateCart}
                  onRemoveFromCart={handleRemoveFromCart}
                />
              } 
            />
            <Route 
              path="/checkout" 
              element={
                <CheckoutForm 
                  cart={cart}
                  onCheckoutComplete={handleCheckoutComplete} 
                />
              } 
            />
            <Route path="/admin" element={<Admin />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/terms-and-conditions" element={<Terms />} />

            <Route path="/contact" element={<ContactUs />} />
            <Route path="/returns" element={<ReturnPolicy />} />

            <Route path="/order-success" element={<div className="text-center p-8">
              <h1 className="text-3xl font-bold text-green-600 mb-4">Order Successful!</h1>
              <p className="text-gray-600">Thank you for your purchase. You will receive an email confirmation shortly.</p>
            </div>} />
            <Route path="/payment-failure" element={<div className="text-center p-8">
              <h1 className="text-3xl font-bold text-red-600 mb-4">Payment Failed</h1>
              <p className="text-gray-600">Sorry, your payment could not be processed. Please try again.</p>
            </div>} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/payment-failed" element={
              <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">Payment Failed</h2>
                    <p className="text-gray-600 mb-4">
                      We're sorry, but your payment could not be processed. Please try again.
                    </p>
                    <div className="space-y-4">
                      <Link 
                        to="/checkout" 
                        className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
                      >
                        Try Again
                      </Link>
                      <br />
                      <Link 
                        to="/" 
                        className="inline-block text-blue-600 hover:text-blue-700"
                      >
                        Return to Home
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            } />
            <Route path="/books/:id" element={<BookDetails onAddToCart={handleAddToCart} />} />
            <Route path="*" element={<div>Page Not Found</div>} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;