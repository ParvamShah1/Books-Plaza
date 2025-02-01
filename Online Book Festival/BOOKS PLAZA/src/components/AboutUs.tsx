import React from 'react';
import { FaBook, FaHeart, FaUsers, FaWhatsapp } from 'react-icons/fa';

const AboutUs: React.FC = () => {
  const handleWhatsAppClick = () => {
    const message = encodeURIComponent('Hi! I have a question about Books Plaza.');
    window.open(`https://wa.me/+919876543210?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 pt-20 px-4 pb-8">
      {/* Header Section */}
      <div className="relative bg-white mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-400 transform -skew-y-2"></div>
        <div className="relative px-4 py-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">About Books Plaza</h1>
          <p className="text-white/90">Your Gateway to Literary Adventures</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto">
        {/* Our Story Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center transform rotate-12">
              <FaBook className="text-orange-500 text-xl transform -rotate-12" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center mb-4">Our Story</h2>
          <p className="text-gray-600 text-center mb-6">
            Books Plaza was born from a passion for making literature accessible to everyone.
            Founded in 2023, we've grown from a small online bookstore to a vibrant
            community of book lovers, united by our love for stories and knowledge.
          </p>
        </div>

        {/* Mission Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center transform -rotate-12">
              <FaHeart className="text-purple-500 text-xl transform rotate-12" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center mb-4">Our Mission</h2>
          <p className="text-gray-600 text-center mb-6">
            We believe that books have the power to transform lives. Our mission is to
            create an inclusive platform where readers can discover, explore, and
            connect through the magic of literature.
          </p>
        </div>

        {/* Values Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {[
            {
              title: 'Customer First',
              description: 'Your satisfaction is our top priority. We strive to provide the best book-buying experience.'
            },
            {
              title: 'Quality Selection',
              description: 'We carefully curate our collection to offer you the finest literature across all genres.'
            },
            {
              title: 'Community',
              description: 'We foster a community where book lovers can share their passion for reading.'
            },
            {
              title: 'Innovation',
              description: 'We continuously improve our platform to enhance your book discovery journey.'
            }
          ].map((value, index) => (
            <div key={index} className="bg-white rounded-xl p-6 shadow-lg transform hover:scale-105 transition-transform">
              <h3 className="text-lg font-semibold mb-2">{value.title}</h3>
              <p className="text-gray-600">{value.description}</p>
            </div>
          ))}
        </div>

        {/* Team Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center transform rotate-45">
              <FaUsers className="text-yellow-500 text-xl transform -rotate-45" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center mb-4">Our Team</h2>
          <p className="text-gray-600 text-center mb-6">
            We're a dedicated team of book enthusiasts, tech innovators, and customer
            service professionals working together to bring you the best online
            book-buying experience.
          </p>
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

export default AboutUs;