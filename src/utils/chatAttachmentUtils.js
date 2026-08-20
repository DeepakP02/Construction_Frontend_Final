/**
 * Check if a URL or filename is an image.
 * Supports standard formats, remote imagekit/cloudinary paths, and local blobs/dataURIs.
 */
export const isImage = (url) => {
    if (!url) return false;
    // Check for blob URLs
    if (url.startsWith('blob:')) return true;
    // Check for data URLs
    if (url.startsWith('data:image/')) return true;
    
    const lowerUrl = url.toLowerCase().split('?')[0];
    return /\.(jpeg|jpg|gif|png|webp|heic)$/.test(lowerUrl);
};

/**
 * Create a local preview URL for a File object
 */
export const toLocalBlobUrl = (file) => {
    if (!file) return '';
    return URL.createObjectURL(file);
};

/**
 * Revoke a local preview URL to free up memory
 */
export const revokeLocalBlobUrl = (url) => {
    if (url && url.startsWith('blob:')) {
        try {
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Failed to revoke object URL:', e);
        }
    }
};

/**
 * Client-side image compression using Canvas
 * Compresses the image and returns a new File object (or original if not an image or fails)
 */
export const compressImage = (file, { maxWidth = 1024, maxHeight = 1024, quality = 0.7 } = {}) => {
    return new Promise((resolve) => {
        if (!file || !file.type.startsWith('image/') || file.type.includes('gif')) {
            // Return original file if it's not a compressible image
            return resolve(file);
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return resolve(file);
                }

                ctx.drawImage(img, 0, 0, width, height);

                // Convert to blob
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            return resolve(file);
                        }
                        // Create a new file from the blob
                        const compressedFile = new File([blob], file.name, {
                            type: file.type,
                            lastModified: Date.now(),
                        });
                        resolve(compressedFile);
                    },
                    file.type,
                    quality
                );
            };
            img.onerror = () => resolve(file);
            img.src = event.target.result;
        };
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
    });
};
