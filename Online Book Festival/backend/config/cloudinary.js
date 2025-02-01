const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload function
const uploadToCloudinary = async (file) => {
  try {
    if (!file || !file.path) {
      throw new Error('Invalid file object provided');
    }

    console.log('Attempting to upload file to Cloudinary:', { filename: file.filename, path: file.path });
    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'books-plaza',
      use_filename: true,
      resource_type: 'auto'
    });

    if (!result || !result.secure_url) {
      throw new Error('Invalid response from Cloudinary');
    }

    console.log('Cloudinary upload successful:', {
      secure_url: result.secure_url,
      public_id: result.public_id,
      format: result.format
    });

    return result.secure_url;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', {
      error: error.message,
      details: error.http_code ? { http_code: error.http_code, error_message: error.error?.message } : error
    });
    throw new Error(`Failed to upload image to Cloudinary: ${error.message}`);
  }
};

module.exports = { uploadToCloudinary };