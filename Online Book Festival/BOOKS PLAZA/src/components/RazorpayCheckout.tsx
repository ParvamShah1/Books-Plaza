import React from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayCheckoutProps {
  amount: number;
  onSuccess: (response: any) => void;
  onFailure: (error: any) => void;
}

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const RazorpayCheckout: React.FC<RazorpayCheckoutProps> = ({ amount, onSuccess, onFailure }) => {
  const initializeRazorpayPayment = async () => {
    const res = await loadRazorpayScript();

    if (!res) {
      toast.error('Razorpay SDK failed to load');
      return;
    }

    try {
      // Create order on your backend
      const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/create-razorpay-order`, {
        amount,
        currency: 'INR',
        receipt: 'order_' + Date.now(),
      });

      if (!data.success) {
        throw new Error(data.error || 'Could not create order');
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: data.order.amount,
        currency: data.order.currency,
        name: 'Books Plaza',
        description: 'Book Purchase',
        order_id: data.order.id,
        handler: async (response: any) => {
          try {
            const verificationResponse = await axios.post(
              `${import.meta.env.VITE_API_URL}/verify-razorpay-payment`,
              {
                orderCreationId: data.order.id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
                razorpaySignature: response.razorpay_signature,
              }
            );

            if (verificationResponse.data.success) {
              toast.success('Payment successful!');
              onSuccess(response);
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (error) {
            toast.error('Payment verification failed');
            onFailure(error);
          }
        },
        prefill: {
          name: '',
          email: '',
          contact: '',
        },
        theme: {
          color: '#3399cc',
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (error) {
      toast.error('Something went wrong!');
      onFailure(error);
    }
  };

  return (
    <button
      onClick={initializeRazorpayPayment}
      className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
    >
      Pay Now
    </button>
  );
};

export default RazorpayCheckout;
