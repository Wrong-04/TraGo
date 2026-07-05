# Smart Travel (TraGo) - Ứng dụng Quản lý Hành trình Thông minh

Chào mừng bạn đến với **Smart Travel**, ứng dụng hỗ trợ lập kế hoạch chuyến đi, quản lý ngân sách, lưu trữ nhật ký hình ảnh, và tích hợp AI gợi ý lịch trình cùng bản đồ tương tác siêu mượt! 🚀

## 📋 Yêu cầu hệ thống

Trước khi bắt đầu, hãy đảm bảo máy tính của bạn đã cài đặt các công cụ sau:
- **Node.js** (Phiên bản v18.0.0 trở lên)
- **npm** (đã đi kèm khi cài Node.js) hoặc **yarn**
- **Git**
- Máy ảo Android Studio (cho Android) / Xcode (cho iOS) hoặc ứng dụng **Expo Go** trên điện thoại thật.

---

## 🛠 Hướng dẫn Cài đặt & Chạy ứng dụng

### Bước 1: Tải mã nguồn và cài đặt thư viện
Mở Terminal, di chuyển vào thư mục dự án và chạy lệnh:
```bash
# Tải tất cả các gói thư viện (packages) cần thiết
npm install
```

### Bước 2: Cấu hình biến môi trường (.env)
Dự án yêu cầu các khóa API (Supabase, Google Maps, Gemini...) để hoạt động. 
1. Mở file `.env.example`.
2. Điền các khóa API hợp lệ vào.
3. Đổi tên file từ `.env.example` thành `.env` (hoặc tạo một bản sao tên `.env`).

### Bước 3: Khởi động Ứng dụng
Chạy lệnh sau để bật Metro Bundler của Expo:
```bash
npx expo start
```
*(Nếu bạn muốn xóa bộ đệm cũ để tránh lỗi khi cài thư viện mới, hãy chạy: `npx expo start -c`)*

### Bước 4: Xem ứng dụng trên máy ảo / Thiết bị thật
Khi lệnh khởi động thành công, Terminal sẽ hiện ra một **Mã QR code** và danh sách phím tắt:
- **Trên Điện thoại thật:** Tải app `Expo Go` (trên iOS/Android), mở app và quét mã QR. Đảm bảo điện thoại và máy tính kết nối chung mạng Wi-Fi.
- **Trên Máy ảo Android:** Bấm phím **`a`** trên bàn phím Terminal (yêu cầu Android Studio Emulator đã mở).
- **Trên Máy ảo iOS:** Bấm phím **`i`** trên bàn phím Terminal (yêu cầu máy Mac có Xcode Simulator).
- **Phím tiện ích:** Bấm phím **`r`** để tải lại (Reload) ứng dụng ngay lập tức khi bạn sửa code.

---

## 🧩 Công nghệ sử dụng
- **React Native / Expo** (Framework UI cốt lõi)
- **TypeScript** (Kiểm soát kiểu dữ liệu chặt chẽ)
- **Redux Toolkit** (Quản lý trạng thái State)
- **Supabase** (Backend as a Service: Auth, Database Postgres, Storage)
- **React Navigation v7** (Điều hướng mượt mà)
- **Google Maps API / Expo Location** (Bản đồ & Định vị)
- **React Native Paper & Lucide Icons** (Thư viện UI/Icon hiện đại)

Chúc bạn có một trải nghiệm code tuyệt vời cùng **Smart Travel**! 🎉
