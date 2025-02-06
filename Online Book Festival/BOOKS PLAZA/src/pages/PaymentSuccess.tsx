import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { getOrderDetails, updateOrderStatus } from '../services/api';
import { toast } from 'react-hot-toast';

interface OrderItem {
  book_id: number;
  quantity: number;
  price: number;
  title: string;
}

interface Order {
  order_id: number;
  shipping_address: string;
  order_items: OrderItem[];
  total_amount: number;
  status: string;
  createdAt: string;
}

const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      setError('Order ID not found.');
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        await updateOrderStatus(Number(orderId), 'paid');

        const orderDetails = await getOrderDetails(orderId);
        setOrder(orderDetails);
        localStorage.removeItem('cart');
        toast.success('Payment successful! Your order has been placed.');
      } catch (err: any) {
        setError(err.message || 'Failed to fetch order details.');
        toast.error(err.message || 'Failed to fetch order details.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [searchParams, navigate]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center">{error}</div>;
  }

  if (!order) {
    return <div className="min-h-screen flex items-center justify-center">Order not found.</div>;
  }

  const shippingAddress = JSON.parse(order.shipping_address);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-2xl w-full">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-center">Payment Successful!</h1>
          <p className="text-gray-600 text-center mt-2">Thank you for your order. Your order ID is: {order.order_id}</p>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Shipping Address</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p>{shippingAddress.firstName} {shippingAddress.lastName}</p>
            <p>{shippingAddress.address}</p>
            <p>{shippingAddress.city}, {shippingAddress.state} {shippingAddress.zip}</p>
            <p>Email: {shippingAddress.email}</p>
            <p>Phone: {shippingAddress.phone}</p>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-3">Order Items</h2>
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            {order.order_items.map((item) => (
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
            <span className="font-bold">₹{order.total_amount.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
