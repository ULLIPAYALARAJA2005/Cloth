import { API_URL } from '../lib/api';

const BASE_URL = API_URL.replace('/api', '');

export const getImgUrl = (img) => {
  let url = (img?.url || img) || 'https://via.placeholder.com/400';
  
  if (typeof url !== 'string') return 'https://via.placeholder.com/400';

  // If it's already an absolute URL, return as is
  if (url.startsWith('http') || url.startsWith('data:')) {
    return url;
  }

  // Ensure relative URLs are prefixed with BASE_URL
  // We handle both /uploads and uploads (with or without leading slash)
  // And same for api/images
  const relativePath = url.startsWith('/') ? url : `/${url}`;
  
  if (relativePath.startsWith('/uploads') || relativePath.startsWith('/api/images')) {
    return `${BASE_URL}${relativePath}`;
  }
  
  return url;
};
