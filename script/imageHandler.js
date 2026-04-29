/**
 * Image Handler Module for CV Editor
 * Handles all image-related functionality including upload, preview, and PDF integration
 */

import { validateImageMeta } from './modules/image/imageValidator.js';

// Image state variables
let profileImageData = null;
let profileImageType = null;

function getOrCreateImageErrorNode() {
  const input = document.getElementById('profile-image');
  if (!input) return null;

  let errorNode = document.getElementById('image-upload-error');
  if (errorNode) return errorNode;

  const preview = document.getElementById('image-preview');
  errorNode = document.createElement('p');
  errorNode.id = 'image-upload-error';
  errorNode.className = 'mt-1 text-sm text-red-600';
  errorNode.setAttribute('role', 'alert');

  if (preview && preview.parentNode) {
    preview.parentNode.insertBefore(errorNode, preview);
  } else if (input.parentNode) {
    input.parentNode.appendChild(errorNode);
  }

  return errorNode;
}

function showImageError(message) {
  const errorNode = getOrCreateImageErrorNode();
  if (errorNode) {
    errorNode.textContent = message;
  }
}

function clearImageError() {
  const errorNode = document.getElementById('image-upload-error');
  if (errorNode) {
    errorNode.textContent = '';
  }
}

/**
 * Handles image file upload and validation
 * @param {Event} event - File input change event
 */
export function handleImageUpload(event) {
  const input = event?.target;
  const file = input?.files?.[0];
  if (!file) return;

  const validation = validateImageMeta(file);
  if (!validation.ok) {
    if (validation.reason === 'UNSUPPORTED_TYPE') {
      showImageError('Unsupported image type. Please upload PNG, JPEG, or WEBP.');
    } else if (validation.reason === 'FILE_TOO_LARGE') {
      showImageError('Image is too large. Maximum size is 5MB.');
    } else {
      showImageError('Unable to upload image. Please try another file.');
    }
    if (input) input.value = '';
    return;
  }
  clearImageError();

  const reader = new FileReader();
  reader.onload = function(e) {
    profileImageData = e.target.result;
    profileImageType = file.type;
    
    showImagePreview(file.name);
    
    // Update PDF if AutoUpdate function exists
    if (typeof AutoUpdate === 'function') {
      AutoUpdate();
    }
  };
  reader.onloadend = function() {
    if (input) input.value = '';
  };
  
  reader.readAsDataURL(file);
}

/**
 * Shows image preview in the UI
 * @param {string} fileName - Name of the uploaded file
 */
function showImagePreview(fileName) {
  const preview = document.getElementById('image-preview');
  const previewImg = document.getElementById('preview-img');
  const imageName = document.getElementById('image-name');
  const removeBtn = document.getElementById('remove-image');
  
  if (preview && previewImg && imageName && removeBtn) {
    previewImg.src = profileImageData;
    imageName.textContent = fileName;
    preview.classList.remove('hidden');
    removeBtn.classList.remove('hidden');
  }
}

/**
 * Removes the profile image and clears UI
 */
export function removeProfileImage() {
  profileImageData = null;
  profileImageType = null;
  
  // Hide preview
  const preview = document.getElementById('image-preview');
  const removeBtn = document.getElementById('remove-image');
  const fileInput = document.getElementById('profile-image');
  
  if (preview) preview.classList.add('hidden');
  if (removeBtn) removeBtn.classList.add('hidden');
  if (fileInput) fileInput.value = '';
  clearImageError();
  
  // Update PDF if AutoUpdate function exists
  if (typeof AutoUpdate === 'function') {
    AutoUpdate();
  }
}

/**
 * Adds profile image to PDF document
 * @param {jsPDF} doc - jsPDF document instance
 * @param {number} marginLeft - Left margin of the document
 * @param {number} y - Current Y position
 * @returns {Object} Image dimensions and position info
 */
export function addImageToPDF(doc, marginLeft, y) {
  let imageWidth = 0;
  let imageHeight = 0;
  
  if (profileImageData) {
    try {
      const imgSize = 70; // Fixed size for profile image
      imageWidth = imgSize;
      imageHeight = imgSize;
      
      // Place image at top left with margin - higher up
      doc.addImage(profileImageData, profileImageType || 'JPEG', marginLeft, y - 28, imageWidth, imageHeight);
    } catch (error) {
      console.error('Error adding image to PDF:', error);
    }
  }
  
  return {
    width: imageWidth,
    height: imageHeight,
    hasImage: !!profileImageData
  };
}

/**
 * Calculates the bottom position of the image for layout purposes
 * @param {number} headerStartY - Starting Y position of header
 * @param {number} imageHeight - Height of the image
 * @param {number} padding - Padding value
 * @returns {number} Bottom position of the image
 */
export function getImageBottomPosition(headerStartY, imageHeight, padding) {
  if (!profileImageData) return 0;
  return (headerStartY - 30) + imageHeight + padding;
}

/**
 * Loads image data from saved object
 * @param {Object} obj - Saved CV data object
 */
export function loadImageFromData(obj) {
  if (obj.profileImage) {
    profileImageData = obj.profileImage;
    profileImageType = obj.profileImageType;
    
    showImagePreview('Loaded from save file');
  } else {
    // Clear image if not in saved data
    removeProfileImage();
  }
}

/**
 * Gets current image data for saving
 * @returns {Object} Object containing image data and type
 */
export function getImageData() {
  return {
    profileImage: profileImageData,
    profileImageType: profileImageType
  };
}

/**
 * Initializes image upload functionality
 */
export function initializeImageHandler() {
  const imageInput = document.getElementById('profile-image');
  if (imageInput) {
    imageInput.addEventListener('change', handleImageUpload);
  }
  
  const removeButton = document.getElementById('remove-image');
  if (removeButton) {
    removeButton.addEventListener('click', removeProfileImage);
  }
}

/**
 * Checks if profile image exists
 * @returns {boolean} True if image exists
 */
export function hasImage() {
  return !!profileImageData;
}

/**
 * Gets current profile image data
 * @returns {string|null} Base64 image data
 */
export function getImageDataString() {
  return profileImageData;
}

/**
 * Gets current profile image type
 * @returns {string|null} Image MIME type
 */
export function getImageType() {
  return profileImageType;
}

// All functions are now exported individually using named exports 