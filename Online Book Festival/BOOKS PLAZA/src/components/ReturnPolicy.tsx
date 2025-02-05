import React from 'react';
import { FaWhatsapp, FaTruck, FaInfoCircle } from 'react-icons/fa';

const ReturnPolicy: React.FC = () => {
  const handleWhatsAppClick = () => {
    const message = encodeURIComponent('Hi! I have a question about Books Plaza\'s return policy.');
    window.open(`https://wa.me/+919876543210?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 pt-20 px-4 pb-8">
      {/* Header Section */}
      <div className="relative bg-white mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-400 transform -skew-y-2"></div>
        <div className="relative px-4 py-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Return & Refund Policy</h1>
          <p className="text-white/90">Important information about our policies</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto">
        {/* Policy Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {[
            {
              icon: <FaInfoCircle className="text-red-500" />,
              title: 'No Returns & Refunds',
              description: 'We currently do not offer returns or refunds on any purchases. All sales are final.',
              action: handleWhatsAppClick,
              actionText: 'Contact Support'
            },
            {
              icon: <FaTruck className="text-blue-500" />,
              title: 'Delivery Information',
              description: 'Standard delivery takes 5-7 business days. We appreciate your patience during the delivery process.',
            }
          ].map((item, index) => (
            <div key={index} className="bg-white rounded-xl p-6 shadow-lg transform hover:scale-105 transition-transform">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center mr-4">
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
              </div>
              {item.action && (
                <button
                  onClick={item.action}
                  className="w-full mt-2 py-2 px-4 bg-gradient-to-r from-orange-500 to-yellow-400 text-white rounded-lg font-medium hover:from-orange-600 hover:to-yellow-500 transition-colors"
                >
                  {item.actionText}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Additional Information */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-center mb-6">Need Help?</h2>
          <div className="text-center">
            <p className="text-gray-600 mb-6">
              If you have any questions or concerns about your order, please don't hesitate to reach out to our customer support team on WhatsApp. We're here to help!
            </p>
            <button
              onClick={handleWhatsAppClick}
              className="inline-flex items-center px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
            >
              <FaWhatsapp className="mr-2 text-xl" />
              Chat with Support
            </button>
          </div>
        </div>

        {/* Geometric Decoration */}
        <div className="relative h-32 mb-8">
          <div className="absolute right-4 bottom-4">
            <div className="w-20 h-20 border-4 border-orange-200 rounded-xl transform rotate-12 opacity-50"></div>
            <div className="w-20 h-20 border-4 border-yellow-200 rounded-xl transform -rotate-12 -translate-x-6 -translate-y-6 opacity-50"></div>
          </div>
        </div>
      </div>

      {/* WhatsApp Button */}
      <button
        onClick={handleWhatsAppClick}
        className="fixed bottom-6 right-6 w-14 h-14 bg-green-500 rounded-full shadow-lg flex items-center justify-center transform hover:scale-110 transition-transform z-50 group"
        aria-label="Contact us on WhatsApp"
      >
        <FaWhatsapp className="text-white text-2xl" />
        <span className="absolute right-full mr-4 bg-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium text-gray-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Chat with us
        </span>
      </button>
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-center mb-6">
            
          </div>
          <h2 className="text-2xl font-bold text-center mb-4">Shipping Policy</h2>
          <p className='text-gray-600 text-center mb-6'>Last updated on 2025-05-02</p>
          <p className="text-gray-600 text-center mb-6">
          Shipping Policy

The orders for the user are shipped through registered domestic courier companies and/or speed post only. Orders are delivered within 7 days from the date of the order and/or payment or as per the delivery date agreed at the time of order confirmation and delivering of the shipment, subject to courier company / post office norms. Platform Owner shall not be liable for any delay in delivery by the courier company / postal authority. Delivery of all orders will be made to the address provided by the buyer at the time of purchase. Delivery of our services will be confirmed on your email ID as specified at the time of registration. If there are any shipping cost(s) levied by the seller or the Platform Owner (as the case be), the same is not refundable
          </p>
        </div>
    </div>
    
  );
};

export default ReturnPolicy;