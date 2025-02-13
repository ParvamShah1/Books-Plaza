import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axios from 'axios';

declare global {
  interface Window {
    Razorpay: any;
  }
}

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
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaymentComplete, setIsPaymentComplete] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '+91',
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
      book_id: item.book_id || null,
      price: Number(item.price)
    }));
    setCartItems(itemsWithIds);
    const calculatedTotal = itemsWithIds.reduce((sum: number, item: CartItem) => sum + (item.price * item.quantity), 0);
    setSubtotal(calculatedTotal);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.target.name === 'phone') {
      // Remove any non-digit characters except the +91 prefix
      const value = e.target.value.replace(/[^\d+]/g, '');
      
      // If the value doesn't start with +91, add it
      const phoneNumber = value.startsWith('+91') ? value : '+91' + value;
      
      // Limit to +91 plus 10 digits
      const limitedNumber = phoneNumber.slice(0, 13); // +91 (3 chars) + 10 digits
      
      setFormData({ ...formData, phone: limitedNumber });
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.email || !formData.firstName || !formData.lastName || !formData.phone ||
          !formData.address || !formData.city || !formData.state || !formData.zipCode ||
          !cartItems.length) {
        throw new Error('Please fill in all required fields');
      }

      // First, save the order with 'pending' status
      const orderData = {
        payment_status: 'pending',
        total_amount: parseFloat(total.toFixed(2)), // Ensure it's a valid float
        shipping_address: JSON.stringify({
          address: formData.address,
          apartment: formData.apartment || '',
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          country: formData.country
        }),
        customer_name: `${formData.firstName} ${formData.lastName}`.trim(),
        customer_email: formData.email.trim().toLowerCase(),
        customer_phone: formData.phone.startsWith('+91') ? formData.phone : `+91${formData.phone}`,
        items: cartItems.map(item => ({
          book_id: parseInt(String(item.book_id)),
          quantity: parseInt(String(item.quantity)),
          price: parseFloat(item.price.toFixed(2))
        }))
      };

      // Save order to database
      const orderResponse = await axios.post(`${import.meta.env.VITE_API_URL}/orders`, orderData);
      
      if (!orderResponse.data.success) {
        throw new Error('Failed to create order');
      }

      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Razorpay SDK failed to load');
      }

      // Create Razorpay order
      const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/create-razorpay-order`, {
        amount: total,
        currency: 'INR',
        receipt: `order_${orderResponse.data.order.order_id}`,
      });

      if (!data.success) {
        throw new Error('Failed to create Razorpay order');
      }

      setIsProcessing(true);

      // Configure Razorpay options
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: data.order.amount,
        currency: data.order.currency,
        name: 'Books Plaza',
        description: 'Book Purchase',
        order_id: data.order.id,
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          }
        },
        handler: async (response: any) => {
          try {
            // Store the database order ID in a variable to use in catch block
            const dbOrderId = orderResponse.data.order.order_id;
            
            const verificationResponse = await axios.post(
              `${import.meta.env.VITE_API_URL}/verify-razorpay-payment`,
              {
                orderCreationId: data.order.id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
                razorpaySignature: response.razorpay_signature,
                orderId: dbOrderId
              }
            );

            if (verificationResponse.data.success) {
              setIsPaymentComplete(true);
              toast.success('Payment successful!');
              localStorage.removeItem('cart');
              onCheckoutComplete();
              // Add a small delay before navigation to show the success state
              setTimeout(() => {
                navigate(`/payment-success?orderId=${dbOrderId}`);
              }, 1500);
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            toast.error('Payment verification failed');
            // Update order status to 'failed' in case of payment failure
            try {
              await axios.put(`${import.meta.env.VITE_API_URL}/orders/${dbOrderId}/status`, {
                status: 'failed'
              });
            } catch (updateError) {
              console.error('Error updating order status:', updateError);
            }
            setIsProcessing(false);
            navigate('/payment-failed');
          }
        },
        prefill: {
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          contact: formData.phone,
        },
        theme: {
          color: '#F97316',
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Checkout error:', error);
      setError('Failed to process payment. Please try again.');
      toast.error('Payment failed');
      setIsProcessing(false);
    } finally {
      setLoading(false);
    }
  };

  const renderCartItem = (item: CartItem) => (
    <div key={item.book_id} className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        {item.coverImage && (
          <img src={item.coverImage} alt={item.title} className="w-16 h-20 object-cover rounded" />
        )}
        <div>
          <h4 className="text-gray-800 font-medium">{item.title}</h4>
          <p className="text-gray-600 text-sm">Quantity: {item.quantity}</p>
        </div>
      </div>
      <span className="text-gray-800 font-medium">₹{(item.price * item.quantity).toFixed(2)}</span>
    </div>
  );

  const renderPriceRow = (label: string, amount: number, isTotal: boolean = false) => (
    <div key={`price-${label.toLowerCase().replace(/\\s+/g, '-')}`} 
         className={`flex justify-between ${isTotal ? 'text-base font-semibold mt-4 pt-4 border-t' : 'text-sm'}`}>
      <span className={isTotal ? '' : 'text-gray-600'}>{label}</span>
      <span className={isTotal ? '' : 'font-medium'}>₹{amount.toFixed(2)}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 py-8 px-4 relative">
      {(isProcessing || isPaymentComplete) && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center p-8 bg-white rounded-xl shadow-2xl max-w-sm mx-4">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <p className="text-xl font-medium text-gray-700 mb-2">
              {isPaymentComplete ? 'Payment successful!' : 'Processing payment...'}
            </p>
            <p className="text-gray-500">
              {isPaymentComplete ? 'Redirecting you to the confirmation page...' : 'Please wait while we process your payment'}
            </p>
          </div>
        </div>
      )}
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
                {renderPriceRow('Subtotal', inflatedSubtotal)}
                {renderPriceRow('Discount', discount)}
                <p>Delivery: <span className='text-green-600'>Free</span></p>

                {renderPriceRow('Total', total, true)}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold mb-6 text-gray-700">Shipping Information</h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="firstName" className="block text-gray-700 font-medium mb-2">First Name</label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-gray-700 font-medium mb-2">Last Name</label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="email" className="block text-gray-700 font-medium mb-2">Email</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-gray-700 font-medium mb-2">Phone</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="address" className="block text-gray-700 font-medium mb-2">Address</label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label htmlFor="apartment" className="block text-gray-700 font-medium mb-2">Apartment, suite, etc.</label>
                  <input
                    type="text"
                    id="apartment"
                    name="apartment"
                    value={formData.apartment}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label htmlFor="city" className="block text-gray-700 font-medium mb-2">City</label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="state" className="block text-gray-700 font-medium mb-2">State</label>
                    <select
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                    >
                      {indianStates.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="zipCode" className="block text-gray-700 font-medium mb-2">ZIP Code</label>
                    <input
                      type="text"
                      id="zipCode"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="country" className="block text-gray-700 font-medium mb-2">Country</label>
                  <input
                    type="text"
                    id="country"
                    name="country"
                    value={formData.country}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>

                {error && (
                  <div className="text-red-500 text-sm mt-2">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full bg-orange-500 text-white py-3 px-6 rounded-lg font-semibold 
                    ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-orange-600'}`}
                >
                  {loading ? 'Processing...' : `Pay ₹${total.toFixed(2)}`}
                </button>
              </form>
    </div>
            </div>
          </div>
        </div>
      </div>
    // </div>
  );
};

export default CheckoutForm;
