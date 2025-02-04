import React, { useState, useEffect } from 'react';
import { getFeaturedBooks } from '../services/api';
import { Book } from '../types';
import { Link } from 'react-router-dom';
import { FaShoppingCart, FaBookOpen, FaChevronRight } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { toastConfig } from '../utils/toastConfig';

interface FeaturedBooksProps {
  onAddToCart: (book: Book) => void;
}

const FeaturedBooks: React.FC<FeaturedBooksProps> = ({ onAddToCart }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeGenre, setActiveGenre] = useState<string>('all');

  useEffect(() => {
    const loadBooks = async () => {
      try {
        const data = await getFeaturedBooks();
        setBooks(data);
      } catch (err) {
        setError('Failed to load books');
      } finally {
        setLoading(false);
      }
    };
    loadBooks();
  }, []);

  const genres = ['all', ...new Set(books.map(book => book.genre))];
  const filteredBooks = activeGenre === 'all' 
    ? books 
    : books.filter(book => book.genre === activeGenre);

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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-yellow-50">
        <div className="text-black text-center px-4">
          <div className="mb-4 w-16 h-16 mx-auto">
            <div className="w-full h-full border-4 border-orange-400 rounded-lg rotate-45"></div>
          </div>
          <p className="text-xl mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-3 bg-gradient-to-r from-orange-400 to-yellow-400 text-black rounded-lg font-medium transform hover:scale-105 transition-transform"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      {/* Geometric Header */}
      <div className="relative bg-white">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-100 to-yellow-100 transform -skew-y-2"></div>
        <div className="relative px-4 py-6">
          <h2 className="text-2xl font-bold text-black mb-6 flex items-center">
            <FaBookOpen className="mr-2 text-orange-500" />
            Featured Books
          </h2>
          
          {/* Genre Pills */}
          <div className="flex space-x-2 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
            {genres.map((genre) => (
              <button
                key={genre}
                onClick={() => setActiveGenre(genre)}
                className={`
                  px-5 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transform transition-all
                  ${activeGenre === genre
                    ? 'bg-gradient-to-r from-orange-400 to-yellow-400 text-black scale-105 shadow-lg'
                    : 'bg-white text-black border border-orange-200 hover:border-orange-300'
                  }
                `}
              >
                {genre.charAt(0).toUpperCase() + genre.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Books Grid */}
      <div className="px-4 py-6">
        <div className="grid grid-cols-2 gap-4">
          {filteredBooks.map((book) => (
            <div 
              key={book.book_id}
              className="relative bg-white rounded-xl overflow-hidden shadow-lg transform hover:scale-102 transition-transform cursor-pointer"
              onClick={() => window.location.href = `/books/${book.book_id}`}
            >
              {/* Image Container */}
              <div className="relative pb-[130%]">
                <img
                  src={book.image_url}
                  alt={book.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                {/* Quick Add Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent triggering the parent onClick
                    onAddToCart(book);
                  }}
                  className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center transform hover:scale-110 transition-transform"
                >
                  <FaShoppingCart className="text-orange-500" />
                </button>
              </div>

              {/* Content */}
              <div className="p-3">
                <h3 className="text-sm font-semibold text-black mb-1 line-clamp-2">
                  {book.title}
                </h3>
                <p className="text-xs text-gray-600 mb-2">By {book.author}</p>
                <div className="flex items-center justify-start gap-2">
                  <p className="text-sm font-bold text-black">₹{book.price}</p>
                  <span className="text-sm font-bold text-gray-500 line-through ">
                ₹{Math.round(book.price * 1.2)}
                </span>
                  {/* <span className="px-2 py-1 bg-orange-100 text-black text-xs font-medium rounded-lg">
                    {book.genre}
                  </span> */}
                </div>
              </div>

              {/* Remove the genre tag from top-left position */}
              <div className="absolute top-2 left-2">
                <span className="px-2 py-1 bg-white/90 text-black text-xs font-medium rounded-lg shadow-lg">
                  {book.genre}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {filteredBooks.length === 0 && (
        <div className="text-center text-black mt-8 px-4">
          <div className="w-16 h-16 mx-auto mb-4">
            <div className="w-full h-full border-4 border-orange-300 rounded-lg rotate-45"></div>
          </div>
          <p className="text-xl">No books available in this category</p>
        </div>
      )}
    </div>
  );
};

export default FeaturedBooks;