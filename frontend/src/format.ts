export const money = (n: number | null | undefined) => new Intl.NumberFormat('vi-VN').format(n || 0) + '₫';

// The API returns naive UTC timestamps; add the Z so they are not read as local time.
export const formatDate = (value: string) => new Date(value.endsWith('Z') ? value : value + 'Z').toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

export const orderCode = (id: number) => 'VELA' + String(id).padStart(5, '0');

export const colorHex: Record<string, string> = {'Đỏ rượu':'#823944','Đỏ':'#b5493d','Trắng':'#eeede6','Xanh':'#71828f','Kem':'#e2d9ba','Vàng':'#d8b747','Be':'#c7b8a0','Đen':'#353633','Nâu':'#a67655','Hồng':'#d8a7af','Bạc':'#b5b8ba','Xám than':'#505252','Xanh dương':'#668aa9','Xám':'#a0a4a3','Vàng ánh kim':'#c1a361','Tím':'#9581ae','Xanh navy':'#333d60','Hồng tím':'#b577a1','Xanh lá':'#82966d','Đồng':'#b3825c','Xám thép':'#78858a','Khaki':'#a4a07c','Đa sắc':'#bd9b8c','Cam':'#cc8a54'};

export const GENDERS = ['Nữ', 'Nam', 'Unisex', 'Phụ kiện'];
export const STYLES = ['Nữ tính', 'Thanh lịch', 'Tối giản', 'Năng động'];
export const motionAllowed = () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
