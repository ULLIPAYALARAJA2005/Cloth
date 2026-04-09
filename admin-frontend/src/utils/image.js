import { API_URL } from '../lib/api';

export const getImgUrl = (img) => {
  let url = (img?.url || img) || 'https://via.placeholder.com/400';
  
  if (typeof url === 'string') {
    if (url.startsWith('/uploads') || url.includes('/uploads/')) {
      const baseUrl = API_URL.replace('/api', '');
      const path = url.startsWith('/uploads') ? url : url.substring(url.indexOf('/uploads'));
      return `${baseUrl}${path}`;
    }
  }
  return url;
};
