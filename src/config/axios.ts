import axios from 'axios';

// Chúng ta sẽ dùng API mock hoặc các API bên thứ 3 nếu cần, 
// nhưng chủ yếu app sẽ tương tác với Firebase. 
// Nếu sau này cần gọi API riêng, axios instance sẽ hữu ích.

const axiosInstance = axios.create({
  baseURL: 'https://api.example.com', // Cập nhật URL sau nếu cần
  timeout: 10000,
});

axiosInstance.interceptors.request.use(
  (config) => {
    // Thêm token vào header nếu có
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Xử lý lỗi toàn cục
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default axiosInstance;
