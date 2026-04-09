import { API_URL } from '../lib/api';

const BASE_URL = API_URL.replace('/api', '');

export const getImgUrl = (img) => {
  let url = (img?.url || img) || 'https://via.placeholder.com/400';
  
  if (typeof url !== 'string') return 'https://via.placeholder.com/400';

  // If it's a relative path (local /uploads fallback OR new /api/images/... path), prefix with backend URL
  if (url.startsWith('/uploads') || url.startsWith('/api/images')) {
    return `${BASE_URL}${url}`;
  }
  
  return url;
};
