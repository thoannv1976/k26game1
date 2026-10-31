import type { LocationInfo } from './schemas.js';

/** City locations. v1.0 ships Airport, Restaurant and University; the others are shown as "coming soon". */
export const LOCATIONS: LocationInfo[] = [
  {
    id: 'airport',
    name: { en: 'Airport', vi: 'Sân bay' },
    description: { en: 'Check-in, lost luggage, asking for information', vi: 'Làm thủ tục, hành lý thất lạc, hỏi thông tin' },
    available: true,
    grid: { x: 0, y: 0 },
    color: '#38bdf8',
  },
  {
    id: 'restaurant',
    name: { en: 'Restaurant & Café', vi: 'Nhà hàng & Café' },
    description: { en: 'Ordering, paying, handling complaints', vi: 'Gọi món, thanh toán, xử lý khiếu nại' },
    available: true,
    grid: { x: 2, y: 0 },
    color: '#f97316',
  },
  {
    id: 'university',
    name: { en: 'University', vi: 'Trường đại học' },
    description: { en: 'Academic information, group discussion', vi: 'Hỏi thông tin học vụ, thảo luận nhóm' },
    available: true,
    grid: { x: 1, y: 1 },
    color: '#a855f7',
  },
  {
    id: 'hotel',
    name: { en: 'Hotel', vi: 'Khách sạn' },
    description: { en: 'Booking, check-in, problem solving', vi: 'Đặt phòng, nhận phòng, giải quyết tình huống' },
    available: false,
    grid: { x: 0, y: 2 },
    color: '#14b8a6',
  },
  {
    id: 'office',
    name: { en: 'Office', vi: 'Văn phòng' },
    description: { en: 'Job interviews, meetings, presentations', vi: 'Phỏng vấn, họp nhóm, thuyết trình' },
    available: false,
    grid: { x: 2, y: 2 },
    color: '#64748b',
  },
  {
    id: 'mall',
    name: { en: 'Shopping Mall', vi: 'Trung tâm mua sắm' },
    description: { en: 'Shopping, returns, customer service', vi: 'Mua sắm, đổi trả, dịch vụ khách hàng' },
    available: false,
    grid: { x: 1, y: 3 },
    color: '#ec4899',
  },
];

export function getLocation(id: string): LocationInfo | undefined {
  return LOCATIONS.find((l) => l.id === id);
}
