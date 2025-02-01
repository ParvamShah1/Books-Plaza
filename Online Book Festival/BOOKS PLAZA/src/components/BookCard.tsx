// BookCard.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Book } from '../types';

interface BookCardProps {
  book: Book;
  onAddToCart: (book: Book) => void;
}

const BookCard: React.FC<BookCardProps> = ({ book, onAddToCart }) => {
  const navigate = useNavigate();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click from triggering
    onAddToCart(book);
  };

  return (
    <div
      key={book.book_id}
      className="bg-white p-4 shadow-md rounded-md cursor-pointer hover:shadow-lg transform hover:scale-105 transition-transform duration-200"
      onClick={() => navigate(`/books/${book.book_id}`)}
    >
      <img
        src={book.image_url}
        alt={book.title}
        className="w-full h-48 object-cover rounded-md mb-2"
      />
      <h3 className="text-lg font-semibold text-gray-800 line-clamp-2">
        {book.title}
      </h3>
      <p className="text-gray-600 text-sm line-clamp-1">{book.author}</p>
      <p className="text-gray-800 font-medium mt-1">${book.price}</p>
      <button
        onClick={handleAddToCart}
        className="mt-2 w-full bg-orange-500 text-white py-2 px-4 rounded-md hover:bg-orange-600 transition-colors"
      >
        Add to Cart
      </button>
    </div>
  );
};

export default BookCard;