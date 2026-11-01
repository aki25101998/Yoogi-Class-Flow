export interface BankDefinition {
  bin: string;
  shortName: string;
  name: string;
  logo: string;
}

export const VIETNAM_BANKS: BankDefinition[] = [
  { bin: '970422', shortName: 'MBBank', name: 'Ngân hàng Quân Đội', logo: 'https://api.vietqr.io/img/MB.png' },
  { bin: '970436', shortName: 'Vietcombank', name: 'Ngân hàng Ngoại Thương Việt Nam', logo: 'https://api.vietqr.io/img/VCB.png' },
  { bin: '970407', shortName: 'Techcombank', name: 'Ngân hàng Kỹ Thương Việt Nam', logo: 'https://api.vietqr.io/img/TCB.png' },
  { bin: '970416', shortName: 'ACB', name: 'Ngân hàng Á Châu', logo: 'https://api.vietqr.io/img/ACB.png' },
  { bin: '970432', shortName: 'VPBank', name: 'Ngân hàng Việt Nam Thịnh Vượng', logo: 'https://api.vietqr.io/img/VPB.png' },
  { bin: '970423', shortName: 'TPBank', name: 'Ngân hàng Tiên Phong', logo: 'https://api.vietqr.io/img/TPB.png' },
  { bin: '970418', shortName: 'BIDV', name: 'Ngân hàng Đầu tư và Phát triển VN', logo: 'https://api.vietqr.io/img/BIDV.png' },
  { bin: '970405', shortName: 'Agribank', name: 'Ngân hàng Nông nghiệp & PTNT VN', logo: 'https://api.vietqr.io/img/VBA.png' },
  { bin: '970403', shortName: 'Sacombank', name: 'Ngân hàng Sài Gòn Thương Tín', logo: 'https://api.vietqr.io/img/STB.png' },
  { bin: '970415', shortName: 'VietinBank', name: 'Ngân hàng Công Thương Việt Nam', logo: 'https://api.vietqr.io/img/CTG.png' },
  { bin: '970448', shortName: 'OCB', name: 'Ngân hàng Phương Đông', logo: 'https://api.vietqr.io/img/OCB.png' },
  { bin: '970441', shortName: 'VIB', name: 'Ngân hàng Quốc tế Việt Nam', logo: 'https://api.vietqr.io/img/VIB.png' },
  { bin: '970428', shortName: 'NamABank', name: 'Ngân hàng Nam Á', logo: 'https://api.vietqr.io/img/NAB.png' },
  { bin: '970454', shortName: 'VietCapitalBank', name: 'Ngân hàng Bản Việt', logo: 'https://api.vietqr.io/img/BVB.png' },
  { bin: '970429', shortName: 'SCB', name: 'Ngân hàng TMCP Sài Gòn', logo: 'https://api.vietqr.io/img/SCB.png' },
  { bin: '970437', shortName: 'HDBank', name: 'Ngân hàng Phát triển TP.HCM', logo: 'https://api.vietqr.io/img/HDB.png' },
  { bin: '970443', shortName: 'SHB', name: 'Ngân hàng Sài Gòn - Hà Nội', logo: 'https://api.vietqr.io/img/SHB.png' },
  { bin: '970414', shortName: 'OceanBank', name: 'Ngân hàng Đại Dương', logo: 'https://api.vietqr.io/img/OJBK.png' },
  { bin: '970438', shortName: 'BaoVietBank', name: 'Ngân hàng Bảo Việt', logo: 'https://api.vietqr.io/img/BVBANK.png' },
  { bin: '970426', shortName: 'MSB', name: 'Ngân hàng Hàng Hải', logo: 'https://api.vietqr.io/img/MSB.png' }
];

export function removeVietnameseAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9\s-_]/g, '')
    .trim();
}

export function generateVietQRUrl(params: {
  bankBin: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  addInfo: string;
}): string {
  const sanitizedInfo = removeVietnameseAccents(params.addInfo).slice(0, 50);
  const info = encodeURIComponent(sanitizedInfo);
  const name = encodeURIComponent(params.accountName);
  return `https://img.vietqr.io/image/${params.bankBin}-${params.accountNumber}-compact2.png?amount=${params.amount}&addInfo=${info}&accountName=${name}`;
}
