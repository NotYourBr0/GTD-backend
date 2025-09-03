// Throttle function for limiting event frequency
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Debounce function for delaying execution
function debounce(func, delay) {
  let timeoutId;
  return function() {
    const args = arguments;
    const context = this;
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(context, args), delay);
  };
}

// Sanitize chat messages
function sanitizeMessage(message) {
  if (!message || typeof message !== 'string') return '';
  
  return message
    .trim()
    .substring(0, 200) // Max 200 characters
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/\s+/g, ' '); // Normalize whitespace
}

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Validate color hex code
function isValidColor(color) {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

// Validate drawing coordinates
function validateDrawingData(data) {
  if (!data || typeof data !== 'object') return false;
  
  const { x, y, tool, color, size } = data;
  
  // Check coordinates
  if (typeof x !== 'number' || typeof y !== 'number') return false;
  if (x < 0 || x > 1000 || y < 0 || y > 600) return false; // Canvas bounds
  
  // Check tool
  if (!['pen', 'eraser', 'brush'].includes(tool)) return false;
  
  // Check color
  if (color && !isValidColor(color)) return false;
  
  // Check size
  if (typeof size !== 'number' || size < 1 || size > 50) return false;
  
  return true;
}

// Rate limiting for socket events
class RateLimiter {
  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }
  
  isAllowed(clientId) {
    const now = Date.now();
    const clientRequests = this.requests.get(clientId) || [];
    
    // Remove old requests outside the window
    const validRequests = clientRequests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(clientId, validRequests);
    
    return true;
  }
  
  cleanup() {
    const now = Date.now();
    for (const [clientId, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => now - time < this.windowMs);
      if (validRequests.length === 0) {
        this.requests.delete(clientId);
      } else {
        this.requests.set(clientId, validRequests);
      }
    }
  }
}

// Compress drawing data
function compressDrawingData(drawingData) {
  if (!Array.isArray(drawingData)) return [];
  
  // Remove unnecessary precision from coordinates
  return drawingData.map(point => ({
    ...point,
    x: Math.round(point.x),
    y: Math.round(point.y)
  }));
}

// Calculate canvas bounds for responsive design
function calculateCanvasBounds(containerWidth, containerHeight, aspectRatio = 16/9) {
  const containerRatio = containerWidth / containerHeight;
  
  let canvasWidth, canvasHeight;
  
  if (containerRatio > aspectRatio) {
    // Container is wider than desired aspect ratio
    canvasHeight = containerHeight;
    canvasWidth = canvasHeight * aspectRatio;
  } else {
    // Container is taller than desired aspect ratio
    canvasWidth = containerWidth;
    canvasHeight = canvasWidth / aspectRatio;
  }
  
  return {
    width: Math.floor(canvasWidth),
    height: Math.floor(canvasHeight)
  };
}

module.exports = {
  throttle,
  debounce,
  sanitizeMessage,
  generateId,
  isValidColor,
  validateDrawingData,
  RateLimiter,
  compressDrawingData,
  calculateCanvasBounds
};