const ImageKit = require('imagekit');

// Initialize ImageKit (you'll need to add these to your .env)
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

// Generate authentication parameters for frontend
const getImageKitAuth = () => {
  try {
    const authenticationParameters = imagekit.getAuthenticationParameters();
    return {
      success: true,
      data: authenticationParameters
    };
  } catch (error) {
    console.error('ImageKit auth error:', error);
    return {
      success: false,
      error: 'Failed to generate ImageKit authentication'
    };
  }
};

// Delete file from ImageKit (optional - for cleanup)
const deleteImageKitFile = async (fileId) => {
  try {
    const result = await imagekit.deleteFile(fileId);
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('ImageKit delete error:', error);
    return {
      success: false,
      error: 'Failed to delete file from ImageKit'
    };
  }
};

module.exports = {
  imagekit,
  getImageKitAuth,
  deleteImageKitFile
};
