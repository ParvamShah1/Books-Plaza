// src/types.ts
export interface Book {
  book_id: number;
  title: string;
  author: string;
  description: string;
  price: number;
  image_url: string;
  is_active: boolean;
  created_at?: string;
  genre: string;
  language: string;
  isbn?: string;
  publisher?: string;
  publishDate?: string;
  pages?: number;
}

export interface CartItem extends Book {
  quantity: number;
  id?: string; // Add this line to make id optional
  book_id: number;
}

export interface User {
  userId: number;
  username: string;
  email: string;
  role: string;
}

export interface RegistrationData {
  username: string;
  email: string;
  password: string;
}