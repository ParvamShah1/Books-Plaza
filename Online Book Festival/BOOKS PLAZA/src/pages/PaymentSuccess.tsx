import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { getOrderDetails } from '../services/api';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';

interface OrderItem {
  book_id: number;
  quantity: number;
  price: number;
  title: string;
}

interface ShippingAddress {
  firstName: string;
  lastName: string;
  address: string;
  apartment?: string;
  city: string;
  state: string;
  zip: string;
  email: string;
  phone: string;
}

interface Order {
  order_id: number;
  transaction_id: string;
  total_amount: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: ShippingAddress;
  order_items: OrderItem[];
  payment_status: string;
  created_at: string;
}

const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        const orderId = searchParams.get('orderId');
        console.log('Received orderId from URL:', orderId);

        if (!orderId) {
          console.error('No orderId in URL parameters');
          setError('Order ID not found');
          setLoading(false);
          return;
        }

        const orderDetails = await getOrderDetails(parseInt(orderId));
        console.log('Order details:', orderDetails);

        if (orderDetails) {
          // Handle shipping address
          let shippingAddress = orderDetails.shipping_address;
          if (typeof shippingAddress === 'string') {
            try {
              shippingAddress = JSON.parse(shippingAddress);
            } catch (e) {
              console.error('Error parsing shipping address:', e);
            }
          }
          
          setOrder({
            ...orderDetails,
            shipping_address: shippingAddress
          });
          
          localStorage.removeItem('cart');
          toast.success('Payment successful! Your order has been placed.');
        } else {
          setError('Order details not found');
        }
      } catch (err: any) {
        console.error('Error fetching order details:', err);
        setError(err.message || 'Failed to fetch order details');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="text-red-500 text-xl font-semibold mb-4">{error}</div>
          <Link 
            to="/"
            className="inline-block bg-orange-500 text-white px-6 py-2 rounded hover:bg-orange-600"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-md space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-green-600 mb-2">Payment Successful!</h1>
          <p className="text-gray-600">Order ID: {order.order_id}</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-3">Shipping Address</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p>{order.shipping_address.firstName} {order.shipping_address.lastName}</p>
            <p>{order.shipping_address.address}</p>
            <p>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.zip}</p>
            <p>Email: {order.shipping_address.email}</p>
            <p>Phone: {order.shipping_address.phone}</p>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-3">Order Items</h2>
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            {order.order_items?.map((item) => (
              <div key={item.book_id} className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p>Quantity: {item.quantity}</p>
                </div>
                <p>₹{(item.price * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between items-center">
            <span className="font-semibold">Total</span>
            <span className="font-bold">₹{Number(order.total_amount).toFixed(2)}</span>
          </div>
        </div>

        <div className="text-center mt-8">
          <Link 
            to="/"
            className="inline-block bg-orange-500 text-white px-6 py-2 rounded hover:bg-orange-600"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
