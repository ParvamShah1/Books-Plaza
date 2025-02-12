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
  address: string;
  apartment?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface Order {
  order_id: number;
  transaction_id: string;
  payment_id: string;
  total_amount: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string | ShippingAddress;
  order_items: OrderItem[];
  payment_status: string;
  created_at: string;
  updated_at: string;
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

        const response = await getOrderDetails(parseInt(orderId));
        console.log('Order details response:', response);

        if (response.success && response.order) {
          setOrder(response.order);
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
          <p className="text-gray-600">Transaction ID: {order.transaction_id}</p>
          <p className="text-gray-600">Payment ID: {order.payment_id}</p>
          <p className="text-gray-600">Status: <span className="text-green-600 font-semibold">{order.payment_status}</span></p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-3">Shipping Address</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p>{order.customer_name}</p>
            {(() => {
              try {
                let shippingAddress;
                if (typeof order.shipping_address === 'string') {
                  shippingAddress = JSON.parse(order.shipping_address);
                } else {
                  shippingAddress = order.shipping_address;
                }
                
                if (!shippingAddress) {
                  return <p className="text-red-500">Shipping address not available</p>;
                }

                return (
                  <>
                    <p>{shippingAddress.address}</p>
                    <p>{shippingAddress.city}, {shippingAddress.state} {shippingAddress.zipCode}</p>
                  </>
                );
              } catch (error) {
                console.error('Error parsing shipping address:', error);
                return <p className="text-red-500">Error displaying shipping address</p>;
              }
            })()}
            <p>Email: {order.customer_email}</p>
            <p>Phone: {order.customer_phone}</p>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-3">Order Items</h2>
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            {Array.isArray(order.order_items) && order.order_items.length > 0 ? (
              order.order_items.map((item) => (
                <div key={item.book_id} className="flex justify-between items-center border-b pb-2">
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">₹{parseFloat(item.price).toFixed(2)} × {item.quantity}</p>
                    <p className="font-semibold">₹{(parseFloat(item.price) * item.quantity).toFixed(2)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No items found</p>
            )}
          </div>
          <div className="mt-4 flex justify-between items-center bg-gray-100 p-4 rounded-lg">
            <span className="font-semibold text-lg">Total Amount</span>
            <span className="font-bold text-lg text-green-600">₹{parseFloat(order.total_amount || '0').toFixed(2)}</span>
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
