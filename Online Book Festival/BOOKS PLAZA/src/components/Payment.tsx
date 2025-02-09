import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
// import { toast } from 'react-toastify';
import { API_BASE_URL } from '../config';

interface OrderItem {
  book_id: number;
  quantity: number;
  price: number | string; // Accepts string or number
  title: string;
}

interface ShippingAddress {
  firstName: string;
  lastName: string;
  address: string;
  apartment: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface Order {
  order_id: number;
  customer_name: string;
  customer_email: string;
  shipping_address: ShippingAddress;
  items: OrderItem[];
  total_amount: number | string; // Accepts string or number
  payment_status: string;
}

const Payment: React.FC = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string>('Pending');

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/orders/${orderId}`);
        setOrder(response.data);
      } catch (err: any) {
        setError(err.message || 'An error occurred while fetching the order.');
        // toast.error(err.message || 'Failed to fetch order');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setImageFile(event.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!imageFile) {
    //   toast.error('Please upload a screenshot of the payment.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('orderId', orderId!);

      const response = await axios.post(`${API_BASE_URL}/upload-payment-screenshot`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data && response.data.imageUrl) {
        // toast.success('Payment screenshot uploaded successfully!');
        setPaymentStatus('Uploaded');
        // navigate('/payment-success', { state: { orderId } }); // Optional: Redirect
      } else {
        throw new Error('Failed to upload payment screenshot.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during upload');
    //   toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div>Loading order details...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!order) {
    return <div>Order not found.</div>;
  }

  console.log("Order object before rendering:", order);

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-300 to-blue-600 shadow-lg transform -skew-y-6 sm:skew-y-0 sm:-rotate-6 sm:rounded-3xl"></div>
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          <div className="max-w-md mx-auto">
            <div>
              <h1 className="text-2xl font-semibold">Order Payment</h1>
            </div>
            <div className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                <div className="flex items-center">
                  <span className="font-bold">Order ID:</span>
                  <span className="ml-2">{order.order_id}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-bold">Customer Name:</span>
                  <span className="ml-2">{order.customer_name}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-bold">Customer Email:</span>
                  <span className="ml-2">{order.customer_email}</span>
                </div>
                {/* Shipping Address */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mt-4 mb-2">Shipping Address</h3>
                  <p>
                    {order.shipping_address.firstName} {order.shipping_address.lastName}
                  </p>
                  <p>{order.shipping_address.address}, {order.shipping_address.apartment}</p>
                  <p>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.zipCode}</p>
                  <p>{order.shipping_address.country}</p>
                </div>

                {/* Order Items */}
                {order.order_items && order.order_items.length > 0 ? (
                  <ul>
                    <p className='font-bold'>Items</p>
                    {order.order_items.map((item) => (
                      <li key={item.book_id} className="mb-1">
                        {item.title} (Qty: {item.quantity}) - ₹{Number(item.price).toFixed(2)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No items in this order.</p>
                )}
                <p className="mt-4">
                  <strong>Total Amount:</strong> ₹{Number(order.total_amount).toFixed(2)}
                </p>
              </div>

              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-2">Payment</h2>
                <p>Please scan the QR code below to make the payment:</p>
                <img src="/WhatsApp Image 2025-02-09 at 10.04.09.jpeg" alt="UPI QR Code" className="mx-auto mt-5" />
                <p className="mt-4">After making the payment, please upload a screenshot:</p>
                <input type="file" accept="image/*" onChange={handleFileChange} className="mb-4" />
                <button
                  onClick={handleSubmit}
                  disabled={uploading || paymentStatus !== 'Pending'}
                  className={`${
                    uploading || paymentStatus !== 'Pending'
                      ? 'bg-gray-500 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-700'
                  } text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline`}
                >
                  {uploading ? 'Uploading...' : 'Upload Screenshot!'}
                </button>
              </div>

              <div className="text-center">
                <p>Payment Status: <span className="font-semibold">{paymentStatus}</span></p>
                {paymentStatus === 'Uploaded' && (
                    <p className="bg-green-100 text-green-800 p-4 rounded-md shadow text-center font-semibold">
    Order Successful! We will confirm your order soon.
</p>                //   <button onClick={() => navigate('/')} className="mt-4 bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
                //     Order Successfull 
                //   </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;