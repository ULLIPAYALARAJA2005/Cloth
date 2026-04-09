import { API_URL } from '../lib/api';

export const getImgUrl = (img) => {
  let url = (img?.url || img) || 'https://via.placeholder.com/400';
  
  if (typeof url === 'string' && url.startsWith('/uploads')) {
    const baseUrl = API_URL.replace('/api', '');
    return `${baseUrl}${url}`;
  }
  return url;
};
