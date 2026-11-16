# Từ điển phát âm MC

Server có thể đọc `data/mc-pronunciation.json` ở máy vận hành. Tệp này nằm trong `data/` (đã bị Git bỏ qua), không được đưa vào repo. Mẫu cấu trúc rỗng: [mc-pronunciation.example.json](./mc-pronunciation.example.json).

Sau khi duyệt cách đọc cho từng từ trong danh sách rà soát, thêm quy tắc theo dạng:

```json
{
  "version": 1,
  "entries": [
    { "from": "TỪ_CẦN_RÀ", "to": "CÁCH_ĐỌC_ĐÃ_DUYỆT", "caseInsensitive": true }
  ]
}
```

`caseInsensitive` có thể bỏ trống hoặc đặt `false` để phân biệt hoa thường. Quy tắc chỉ thay từ nguyên vẹn trong nội dung gửi đi sinh giọng; chữ trên câu hỏi và overlay không đổi. Nội dung sau thay thế là một phần khóa cache nên sửa từ điển chỉ tạo lại các câu bị ảnh hưởng.
