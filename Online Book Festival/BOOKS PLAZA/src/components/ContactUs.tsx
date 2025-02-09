import React from 'react';
import { FaWhatsapp, FaEnvelope, FaMapMarkerAlt, FaClock } from 'react-icons/fa';

const ContactUs: React.FC = () => {
  const handleWhatsAppClick = () => {
    const message = encodeURIComponent('Hi! I have a question about Books Plaza.');
    window.open(`https://wa.me/+918111000098?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 pt-20 px-4 pb-8">
      {/* Header Section */}
      <div className="relative bg-white mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-400 transform -skew-y-2"></div>
        <div className="relative px-4 py-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Contact Us</h1>
          <p className="text-white/90">We're here to help!</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto">
        {/* Contact Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {[
            {
              icon: <FaWhatsapp className="text-green-500" />,
              title: 'WhatsApp',
              description: '+91 8111000098',
              action: handleWhatsAppClick,
              actionText: 'Chat Now'
            },
            {
              icon: <FaEnvelope className="text-orange-500" />,
              title: 'Email',
              description: 'booksplazabo@gmail.com',
              action: () => window.location.href = 'booksplazabo@gmail.com',
              actionText: 'Send Email'
            },
            {
              icon: <FaMapMarkerAlt className="text-purple-500" />,
              title: 'Address',
              description: 'SHOP NO 2, CHANDRALOK CHS LTD, L.T ROAD,BORIVALI WEST, Mumbai Suburban, Maharashtra, 400092',
            },
            {
              icon: <FaClock className="text-yellow-500" />,
              title: 'Business Hours',
              description: 'Monday - Saturday: 9:00 AM - 9:00 PM',
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

        {/* FAQ Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-center mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              {
                question: 'How can I track my order?',
                answer: 'Once your order is placed, you will receive a confirmation from us on your registered mobile number or email address provided during checkout. Please keep checking for updates.'              },
              {
                question: 'What are your delivery timelines?',
                answer: 'Standard delivery takes 5-7 business days. We appreciate your patience during the delivery process.'
              },
              {
                question: 'Do you offer returns?',
                answer: 'We currently do not offer returns or refunds on any purchases. All sales are final.'
              }
            ].map((faq, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{faq.question}</h3>
                <p className="text-gray-600">{faq.answer}</p>
              </div>
            ))}
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
    </div>
  );
};

export default ContactUs;