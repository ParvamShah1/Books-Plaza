import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBookDetails } from '../services/api';
import { Book } from '../types';
import { FaShoppingCart, FaArrowLeft } from 'react-icons/fa';

interface BookDetailsProps {
  onAddToCart: (book: Book) => void;
}

const BookDetails: React.FC<BookDetailsProps> = ({ onAddToCart }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBook = async () => {
      try {
        if (id) {
          const data = await getBookDetails(parseInt(id));
          setBook(data);
        }
      } catch (err) {
        setError('Failed to load book details');
      } finally {
        setLoading(false);
      }
    };
    loadBook();
  }, [id]);

  const handleBuyNow = () => {
    if (book) {
      onAddToCart(book);
      navigate('/checkout');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-yellow-50">
        <div className="w-16 h-16 relative">
          <div className="absolute inset-0 border-4 border-orange-200 rounded-lg animate-pulse"></div>
          <div className="absolute inset-2 border-4 border-orange-300 rounded-lg animate-pulse delay-150"></div>
          <div className="absolute inset-4 border-4 border-orange-400 rounded-lg animate-pulse delay-300"></div>
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-yellow-50">
        <div className="text-center px-4">
          <div className="w-16 h-16 mx-auto mb-4">
            <div className="w-full h-full border-4 border-orange-300 rounded-lg rotate-45"></div>
          </div>
          <p className="text-xl text-black mb-4">{error || 'Book not found'}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-gradient-to-r from-orange-400 to-yellow-400 text-black rounded-lg font-medium transform hover:scale-105 transition-transform"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 pt-8 px-4 pb-8">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-black mb-6"
      >
        <FaArrowLeft className="mr-2" />
        Back
      </button>

      <div className="max-w-lg mx-auto">
        {/* Book Image */}
        <div className="relative bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
          <div className="relative pb-[130%]">
            <img
              src={book.image_url}
              alt={book.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Geometric Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
          </div>
        </div>

        {/* Book Info */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-black">{book.title}</h1>
            <p className="text-gray-600">By {book.author}</p>
            
            {/* Genre Tag */}
            <div className="inline-block px-3 py-1 bg-gradient-to-r from-orange-100 to-yellow-100 text-black text-sm font-medium rounded-lg">
              {book.genre}
            </div>

            <p className="text-gray-800">{book.description}</p>
            
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-black">₹{book.price}</span>
              <span className="text-sm text-gray-500 line-through">
                ₹{Math.round(book.price * 1.2)}
              </span>
            </div>
          </div>
        </div>

        {/* Details Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-black mb-4">Product Details</h2>
          <div className="space-y-3">
            <div className="flex justify-start py-2 border-b border-gray-100">
              <span className="text-black">Author: </span>
              <span className="text-gray-600 font-medium">{book.author}</span>
            </div>
            <div className="flex justify-start py-2 border-b border-gray-100">
              <span className="text-black">Language:</span>
              <span className="text-gray-600 font-medium">{book.language}</span>
            </div>
            <div className="flex justify-start py-2 border-b border-gray-100">
              <span className="text-black">Genre:</span>
              <span className="text-gray-600 font-medium">{book.genre}</span>
            </div>
            <div className="flex justify-start py-2 border-b border-gray-100">
              <span className="text-black">Seller:</span>
              <span className="text-gray-600 font-medium">Books Plaza</span>
            </div>
          </div>
        </div>

        {/* Return Policy */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-black mb-4">Return & Refund Policy</h2>
          <div className="bg-orange-50 border border-orange-100 rounded-lg p-4">
            <p className="text-gray-800">
              Please note that we do not accept returns or provide refunds for any purchases. 
              All sales are final.
            </p>
          </div>
        </div>

        {/* Contact Support */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-20">
          <h2 className="text-lg font-bold text-black mb-4">Need Help?</h2>
          <a 
            href="https://wa.me/+918111000098"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center space-x-2 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors"
          >
            <svg 
              className="w-6 h-6" 
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span>Contact Us on WhatsApp</span>
          </a>
        </div>

        {/* Action Buttons */}
        <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg p-4 md:relative md:bg-transparent md:shadow-none">
          <div className="flex space-x-4 max-w-lg mx-auto">
            <button
              onClick={() => onAddToCart(book)}
              className="flex-1 py-3 bg-white border-2 border-orange-500 text-black rounded-xl font-medium flex items-center justify-center space-x-2 hover:bg-orange-50 transition-colors"
            >
              <FaShoppingCart />
              <span>Add to Cart</span>
            </button>
            <button
              onClick={handleBuyNow}
              className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-yellow-400 text-white rounded-xl font-medium hover:from-orange-600 hover:to-yellow-500 transition-colors"
            >
              Buy Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetails;
