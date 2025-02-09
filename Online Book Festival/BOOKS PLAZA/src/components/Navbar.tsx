import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaShoppingCart, FaBook, FaBars, FaTimes } from 'react-icons/fa';

interface NavbarProps {
  cartItemCount: number;
}

const Navbar: React.FC<NavbarProps> = ({ cartItemCount }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <>
      {/* Main Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-orange-500 to-yellow-400 shadow-lg">
        <div className="relative">
          {/* Geometric Background */}
          <div className="absolute inset-0 bg-white/10 transform -skew-y-2"></div>
          
          {/* Content */}
          <div className="relative px-4 py-3 flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
            <img src="/books plaza.png" alt="Books Plaza Logo" className="h-10 object-contain" />
              <span className="text-xl font-bold text-white">Books Plaza</span>
            </Link>

            {/* Cart and Menu Toggle */}
            <div className="flex items-center space-x-4">
              <Link 
                to="/cart" 
                className="relative p-2"
              >
                <FaShoppingCart className="text-2xl text-white" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-white text-orange-500 text-xs rounded-full flex items-center justify-center font-bold">
                    {cartItemCount}
                  </span>
                )}
              </Link>
              <button
                onClick={toggleMenu}
                className="p-2 text-white focus:outline-none"
              >
                {isMenuOpen ? <FaTimes className="text-2xl" /> : <FaBars className="text-2xl" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div 
        className={`
          fixed inset-0 z-40 bg-white transform transition-transform duration-300 ease-in-out
          ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        style={{ top: '64px' }}
      >
        <div className="relative h-full">
          {/* Geometric Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-yellow-50"></div>
          
          {/* Menu Items */}
          <div className="relative h-full px-4 py-6">
            <div className="space-y-4">
              {[
                { to: '/about', label: 'About Us' },
                { to: '/contact', label: 'Contact Us' },
                { to: '/returns', label: 'Return & Refund' },
                { to: '/cart', label: 'Cart' },
              ].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-6 py-4 bg-white rounded-xl shadow-sm transform hover:scale-105 transition-transform"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-black font-medium">{item.label}</span>
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-100 to-yellow-100 rounded-lg flex items-center justify-center transform rotate-6">
                      <div className="w-4 h-4 border-2 border-orange-400 rounded-md transform -rotate-6"></div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Geometric Decoration */}
            <div className="absolute bottom-8 right-8">
              <div className="w-20 h-20 border-4 border-orange-200 rounded-xl transform rotate-12 opacity-50"></div>
              <div className="w-20 h-20 border-4 border-yellow-200 rounded-xl transform -rotate-12 -translate-x-6 -translate-y-6 opacity-50"></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;