import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { createPayment, createOrder } from '../services/api';
import { useNavigate } from 'react-router-dom';

interface CartItem {
  book_id: number;
  title: string;
  price: number;
  quantity: number;
  coverImage?: string;
}

const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

interface FormData {
  // Personal Details
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  // Shipping Details
  address: string;
  apartment: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface CheckoutFormProps {
  cart: CartItem[];
  onCheckoutComplete: () => void;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({ cart, onCheckoutComplete }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    apartment: '',
    city: '',
    state: indianStates[0],
    zipCode: '',
    country: 'India'
  });

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const total = subtotal;
  const inflatedSubtotal = Math.round(subtotal * 1.2);
  const discount = Math.round(subtotal * 0.2);

  useEffect(() => {
    // Load cart items
    const items = JSON.parse(localStorage.getItem('cart') || '[]');
    const itemsWithIds = items.map((item: CartItem) => ({
      ...item,
      book_id: item.book_id || null, // Ensure book_id is preserved
      price: Number(item.price)
    }));
    setCartItems(itemsWithIds);
    const calculatedTotal = itemsWithIds.reduce((sum: number, item: CartItem) => sum + (item.price * item.quantity), 0);
    setSubtotal(calculatedTotal);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.target.name === 'phone' && !e.target.value.startsWith('+91')) {
      setFormData({ ...formData, [e.target.name]: '+91' + e.target.value });
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. CREATE ORDER FIRST
      // Ensure all required fields are present
      if (!cart.every(item => item.book_id)) {
        throw new Error('Some items are missing book_id');
      }

      const orderData = {
        items: cart.map(item => ({
          book_id: item.book_id,
          quantity: item.quantity,
          price: item.price
        })),
        shipping_address: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip: formData.zipCode
        })
      };

      const orderResponse = await createOrder(orderData);
      const orderId = orderResponse.orderId; // Get the order ID

      // 2. CREATE PAYMENT (pass orderId)
      const paymentData = {
        amount: cart.reduce((total, item) => total + item.price * item.quantity, 0),
        productinfo: cart.map(item => item.title).join(', '),
        firstname: formData.firstName,
        email: formData.email,
        phone: formData.phone,
        orderId: orderId, // Pass the order ID to the payment gateway
      };

      const paymentResponse = await createPayment(paymentData);

      if (paymentResponse.redirectUrl) {
        window.location.href = paymentResponse.redirectUrl;
      } else {
        throw new Error('Payment initiation failed.');
      }

    } catch (err: any) {
      setError(err.message || 'An error occurred during checkout.');
    } finally {
      setLoading(false);
    }
  };

  const renderCartItem = (item: CartItem) => (
    <div key={`cart-item-${item.book_id}`} className="flex items-center space-x-4">
      {item.coverImage && (
        <img 
          src={item.coverImage} 
          alt={item.title} 
          className="w-16 h-24 object-cover rounded"
        />
      )}
      <div className="flex-1">
        <h4 className="text-sm font-medium text-gray-800">{item.title}</h4>
        <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
        <p className="text-sm font-medium text-gray-800">
          ₹{(item.price * item.quantity).toFixed(2)}
        </p>
      </div>
    </div>
  );

  const renderPriceRow = (label: string, amount: number, isTotal: boolean = false) => (
    <div key={`price-${label.toLowerCase().replace(/\s+/g, '-')}`} 
         className={`flex justify-between ${isTotal ? 'text-base font-semibold mt-4 pt-4 border-t' : 'text-sm'}`}>
      <span className={isTotal ? '' : 'text-gray-600'}>{label}</span>
      <span className={isTotal ? '' : 'font-medium'}>₹{amount.toFixed(2)}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-6 text-orange-600">Checkout</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-6">
              <h3 className="text-xl font-semibold mb-4 text-gray-700">Order Summary</h3>
              <div className="space-y-4 mb-6">
                {cartItems.map(renderCartItem)}
              </div>
              <div className="border-t pt-4 space-y-2">
                  {[
                    { label: 'Subtotal', value: `₹${inflatedSubtotal}` },
                    { label: 'Delivery', value: 'Free', className: 'text-blue-600' },
                    { label: 'Discount', value: `-₹${discount}`, className: 'text-green-600' },
                    { type: 'divider' },
                    { label: 'Total', value: `₹${subtotal}`, bold: true }
                  ].map((item, index) => (
                    item.type === 'divider' ? (
                      <div key={`summary-divider-${index}`} className="h-px bg-gray-100 my-2"></div>
                    ) : (
                      <div key={`price-${index}`} className={`flex justify-between ${item.bold ? 'text-base font-semibold' : 'text-sm'}`}>
                        <span className={item.bold ? '' : 'text-gray-600'}>{item.label}</span>
                        <span className={item.className || (item.bold ? '' : '')}>{item.value}</span>
                      </div>
                    )
                  ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold mb-4 text-gray-700">Personal Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { name: 'firstName', label: 'First Name', type: 'text' },
                    { name: 'lastName', label: 'Last Name', type: 'text' },
                    { name: 'email', label: 'Email', type: 'email' },
                    { name: 'phone', label: 'Phone Number', type: 'tel', prefix: '+91' }
                  ].map(field => (
                    <div key={`field-${field.name}`}>
                      <label htmlFor={field.name} className="block text-sm font-medium text-gray-700">
                        {field.label}
                      </label>
                      {/* Update the phone input field styling */}
                      {'prefix' in field ? (
                        <div className="relative mt-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                            {field.prefix}
                          </span>
                          <input
                            type={field.type}
                            id={field.name}
                            name={field.name}
                            value={formData[field.name as keyof FormData].replace('+91', '')}
                            onChange={handleChange}
                            className="block w-full pl-14 rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                            pattern="[0-9]{10}"
                            maxLength={10}
                            placeholder="Enter 10-digit number"
                            required
                          />
                        </div>
                      ) : (
                        <input
                          type={field.type}
                          id={field.name}
                          name={field.name}
                          value={formData[field.name as keyof FormData]}
                          onChange={handleChange}
                          required
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold mb-4 text-gray-700">Shipping Details</h3>
                <div className="space-y-4">
                  {[
                    { name: 'address', label: 'Street Address', required: true },
                    { name: 'apartment', label: 'Apartment, suite, etc. (optional)', required: false }
                  ].map(field => (
                    <div key={`field-${field.name}`}>
                      <label htmlFor={field.name} className="block text-sm font-medium text-gray-700">
                        {field.label}
                      </label>
                      <input
                        type="text"
                        id={field.name}
                        name={field.name}
                        value={formData[field.name as keyof FormData]}
                        onChange={handleChange}
                        required={field.required}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { name: 'city', label: 'City' },
                      { name: 'state', label: 'State' },
                      { name: 'zipCode', label: 'ZIP Code' },
                      { name: 'country', label: 'Country' }
                    ].map(field => (
                      <div key={`field-${field.name}`}>
                        <label htmlFor={field.name} className="block text-sm font-medium text-gray-700">
                          {field.label}
                        </label>
                        {field.name === 'state' ? (
                          <select
                            id={field.name}
                            name={field.name}
                            value={formData[field.name as keyof FormData]}
                            onChange={handleChange}
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                          >
                            {indianStates.map((state) => (
                              <option key={state} value={state}>{state}</option>
                            ))}
                          </select>
                        ) : field.name === 'country' ? (
                          <input
                            type="text"
                            id={field.name}
                            name={field.name}
                            value={formData[field.name as keyof FormData]}
                            readOnly
                            className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm"
                            required
                          />
                        ) : (
                          <input
                            type="text"
                            id={field.name}
                            name={field.name}
                            value={formData[field.name as keyof FormData]}
                            onChange={handleChange}
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-orange-500 text-white py-3 px-6 rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-semibold text-lg shadow-md"
                disabled={loading}
              >
                {loading ? 'Processing...' : `Place Order (₹${total.toFixed(2)})`}
              </button>
              {error && (
                <div className="text-red-500 text-sm mt-2">{error}</div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutForm;