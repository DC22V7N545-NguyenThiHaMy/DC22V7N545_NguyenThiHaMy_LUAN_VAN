# Thí nghiệm trên dữ liệu tương tác thật (Amazon Fashion)

Mục đích: bổ sung bằng chứng cho chương 5 của luận văn, vì toàn bộ tương tác trong DB demo là dữ liệu mô phỏng.
Thí nghiệm chạy **offline**, không ghi vào `data/velastyle.db`, và dùng lại đúng mã thuật toán của ứng dụng
(`CollaborativeFiltering`, `content_scores`, `combine_scores`, `temporal_split`, `ranking_metrics`).

## Nguồn dữ liệu

| Mục | Giá trị |
| --- | --- |
| Tên | Amazon Reviews 2023, category `Amazon_Fashion` |
| Tác giả | Yupeng Hou, Jiacheng Li, Zhankui He, An Yan, Xiusi Chen, Julian McAuley (UCSD, McAuley Lab) |
| Bài báo | "Bridging Language and Items for Retrieval and Recommendation", arXiv:2403.03952, 2024 |
| Trang dữ liệu | https://amazon-reviews-2023.github.io/ |
| Thống kê công bố | 2,0 triệu người dùng; 825,9 nghìn sản phẩm; 2,5 triệu đánh giá |
| File dùng | `review_categories/Amazon_Fashion.jsonl.gz` (292.425.439 byte), `meta_categories/meta_Amazon_Fashion.jsonl.gz` (224.299.124 byte); trên máy chủ cập nhật ngày 16/01/2025 |
| Giấy phép | Trang chính thức **không nêu giấy phép hay điều khoản sử dụng** (kiểm tra ngày 25/10/2026). Dữ liệu gốc thuộc Amazon; chỉ dùng cho nghiên cứu học thuật, không phân phối lại và không đưa vào Git |

Dữ liệu và ảnh tải về nằm ở `data/external/` (đã gitignore).

## Chạy

Từ gốc repo, dùng Python của `.venv`. Mỗi bước chạy lại được.

```powershell
$py = '.\.venv\Scripts\python.exe'
& $py scripts/real_data_experiment.py prepare --k-core 3   # lọc 3-core -> subset.json
& $py scripts/real_data_experiment.py images       # tải ảnh (thu nhỏ <= 448 px)
& $py scripts/real_data_experiment.py embed        # CLIP: ảnh + văn bản, kết hợp 0,6/0,4 như ứng dụng
& $py scripts/real_data_experiment.py evaluate     # -> artifacts/real-data-eval-amazon-fashion.json
```

## Quy trình xử lý

1. Bỏ sản phẩm thiếu tiêu đề hoặc ảnh. Mỗi cặp (người dùng, sản phẩm) giữ một lần, lấy thời điểm mới nhất.
2. Lọc **k-core** lặp đến khi ổn định (người dùng và sản phẩm đều có ít nhất k tương tác). Amazon_Fashion cực thưa (trung bình 1,2 tương tác mỗi người dùng): 5-core còn 0 bản ghi, 4-core còn 513 người dùng, nên dùng `--k-core 3` (2.223 người dùng, 2.245 sản phẩm, 12.490 tương tác).
3. Nếu vẫn hơn `--max-items` sản phẩm (mặc định 5000, không áp dụng ở 3-core): giữ các sản phẩm nhiều tương tác nhất rồi lọc lại (thiên về sản phẩm phổ biến).
4. Mỗi đánh giá được xem là một tương tác ngầm trọng số 1.
5. Chia dữ liệu bằng `temporal_split` (leave-last-item-out theo thời gian, loại rò rỉ) giống phần đánh giá trên dữ liệu demo.
6. So sánh: Popularity, Random, CF, CLIP, Hybrid với α = 0,0…1,0 (công thức α hiệu dụng giống `hybrid_recommender.recommend`), K = 5, 10, 20.
7. Khoảng tin cậy 95% bằng bootstrap (2000 lần lấy mẫu lại theo người dùng); chênh lệch NDCG giữa hai phương pháp tính theo cặp trên cùng người dùng.

## Hạn chế cần nêu

- Đánh giá sản phẩm trên Amazon là hành vi đã mua và đánh giá, không phải mọi lượt xem; không tương đương nhật ký duyệt web của cửa hàng VELASTYLE.
- Sản phẩm thời trang Amazon đa dạng người bán và chất lượng ảnh, khác catalog biên tập của VELASTYLE.
- Chỉ gồm người dùng có từ 3 đánh giá trở lên (rất nhỏ so với 2,0 triệu người dùng ban đầu) và catalog 2.245 sản phẩm; mật độ 0,25%.
- α tốt nhất được chọn trên chính tập kiểm tra nên chỉ mang tính khảo sát; kết quả chính dùng α = 0,5 đặt trước.
- Văn bản CLIP là tiêu đề, danh mục, đặc điểm đầu tiên; phần lớn bằng tiếng Anh, phù hợp mô hình.

## Kết quả (26/10/2026)

Xem `artifacts/verification.md` và mục 5.6 của luận văn. Hybrid (α = 0,5) NDCG@10 = 0,067 so với CF 0,054 và Popularity 0,031; chênh lệch Hybrid − CF có khoảng tin cậy 95% [0,008; 0,018].
