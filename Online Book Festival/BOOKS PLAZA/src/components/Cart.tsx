import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FaTrash, FaMinus, FaPlus, FaArrowLeft } from 'react-icons/fa';
import { Book } from '../types';
import { book } from 'lucide-react';

interface CartItem extends Book {
  quantity: number;
}

interface CartProps {
  cart: CartItem[];
  onUpdateCart: (items: CartItem[]) => void;
  onRemoveFromCart: (bookId: number) => void;
}

const Cart: React.FC<CartProps> = ({ cart, onUpdateCart, onRemoveFromCart }) => {
  const navigate = useNavigate();

  const handleQuantityChange = (bookId: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    const newCart = cart.map(item =>
      item.id === bookId ? { ...item, quantity: newQuantity } : item
    );
    onUpdateCart(newCart);
    toast.success('Cart updated');
  };

  const handleRemoveItem = (bookId: number) => {
    onRemoveFromCart(bookId);
    toast.success('Item removed from cart');
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    navigate('/checkout');
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 pt-20 px-4 pb-8">
        <div className="max-w-lg mx-auto text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
            <div className="w-20 h-20 mx-auto mb-6">
              <div className="w-full h-full border-4 border-orange-200 rounded-xl transform rotate-12"></div>
              <div className="w-full h-full border-4 border-orange-300 rounded-xl transform -rotate-12 -translate-y-full"></div>
            </div>
            <h2 className="text-2xl font-bold text-black mb-4">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">Looks like you haven't added any books to your cart yet.</p>
            <Link
              to="/"
              className="inline-block px-6 py-3 bg-gradient-to-r from-orange-500 to-yellow-400 text-white rounded-xl font-medium hover:from-orange-600 hover:to-yellow-500 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 pt-20 px-4 pb-8">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="fixed top-6 left-4 z-50 flex items-center text-black"
      >
        <FaArrowLeft className="mr-2" />
        Back
      </button>

      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-black mb-6">Your Cart</h1>
        
        {/* Cart Items */}
        <div className="space-y-4 mb-6" >
          {cart.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl shadow-lg overflow-hidden"
            >
              <div className="flex items-start p-4">
                {/* Book Image */}
                <div className="relative w-20 h-28 flex-shrink-0">
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-lg"></div>
                </div>

                {/* Book Details */}
                <div className="flex-1 ml-4">
                  <h3 className="text-black font-semibold line-clamp-1">{item.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">By {item.author}</p>
                  <p className="text-black font-bold">₹{item.price}</p>

                  {/* Quantity Controls */}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center space-x-2">
                      {[
                        {
                          icon: <FaMinus size={12} />,
                          onClick: () => handleQuantityChange(item.id, (item.quantity || 1) - 1),
                          disabled: item.quantity === 1,
                          type: 'minus'
                        },
                        {
                          type: 'count',
                          content: item.quantity || 1
                        },
                        {
                          icon: <FaPlus size={12} />,
                          onClick: () => handleQuantityChange(item.id, (item.quantity || 1) + 1),
                          type: 'plus'
                        }
                      ].map((control) => (
                        control.type === 'count' ? (
                          <span key={`${item.id}-count`} className="text-black font-medium">{control.content}</span>
                        ) : (
                          <button
                            key={`${item.id}-${control.type}`}
                            onClick={control.onClick}
                            disabled={control.disabled}
                            className="p-1.5 bg-orange-100 text-orange-500 rounded-lg hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {control.icon}
                          </button>
                        )
                      ))}
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <FaTrash size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-black mb-4">Order Summary</h2>
          <div className="space-y-2 mb-4">
            {[
              { label: 'Subtotal', value: `₹${totalAmount}` },
              { label: 'Delivery', value: 'Free' },
              { type: 'divider' },
              { label: 'Total', value: `₹${totalAmount}`, bold: true }
            ].map((item, index) => (
              item.type === 'divider' ? (
                <div key={`summary-divider-${index}`} className="h-px bg-gray-100 my-2"></div>
              ) : (
                <div key={`summary-${index}`} className={`flex justify-between ${item.bold ? 'text-black font-bold' : 'text-gray-600'}`}>
                  <span>{item.label}</span>
                  <span>{item.value}</span>
                </div>
              )
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <Link
            to="/"
            className="flex-1 py-3 px-4 bg-white border-2 border-orange-500 text-black rounded-xl font-medium text-center hover:bg-orange-50 transition-colors"
          >
            Continue Shopping
          </Link>
          <button
            onClick={handleCheckout}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-orange-500 to-yellow-400 text-white rounded-xl font-medium hover:from-orange-600 hover:to-yellow-500 transition-colors"
          >
            Checkout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cart;