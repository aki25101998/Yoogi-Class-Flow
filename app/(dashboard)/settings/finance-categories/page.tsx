import { Metadata } from 'next';
import FinanceCategoriesClient from './FinanceCategoriesClient';

export const metadata: Metadata = {
  title: 'Danh Mục Thu - Chi - Cài Đặt - Yoogi',
  description: 'Cấu hình cây danh mục 2 cấp cho sổ quỹ tài chính và phân tích doanh thu - chi phí',
};

export default function FinanceCategoriesPage() {
  return <FinanceCategoriesClient />;
}

