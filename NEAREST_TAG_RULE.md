# Quy tắc chọn TAG gần nhất — V1.4.3

Detector vẫn quét AprilTag 36h11 như cũ và có thể trả về nhiều TAG trong cùng một khung hình.

Ứng dụng chỉ chọn **1 TAG có diện tích hình chiếu lớn nhất** để đưa vào `engine.handle()`.
Với các TAG cùng kích thước vật lý, diện tích hình chiếu lớn hơn tương ứng TAG gần camera hơn.

TAG ở xa hơn không được đưa vào luật bài thi, không kích hoạt âm thanh, không kích hoạt timer và không được xem là TAG hợp lệ trong frame đó.

Overlay cũng chỉ vẽ TAG gần nhất để người vận hành dễ quan sát.
