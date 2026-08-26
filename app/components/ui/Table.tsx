import React from 'react';
import styles from './Table.module.css';

export const TableContainer = ({ children, className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`${styles.container} ${className}`} {...props}>
    <div className={styles.wrapper}>
      {children}
    </div>
  </div>
);

export const Table = React.forwardRef<HTMLTableElement, React.TableHTMLAttributes<HTMLTableElement>>(({
  children,
  className = '',
  ...props
}, ref) => (
  <table ref={ref} className={`${styles.table} ${className}`} {...props}>
    {children}
  </table>
));
Table.displayName = 'Table';

export const TableHeader = ({ children, className = '', ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={`${styles.thead} ${className}`} {...props}>
    {children}
  </thead>
);

export const TableBody = ({ children, className = '', ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={`${styles.tbody} ${className}`} {...props}>
    {children}
  </tbody>
);

export const TableRow = ({ children, className = '', ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={`${styles.tr} ${className}`} {...props}>
    {children}
  </tr>
);

export const TableHead = ({ children, className = '', ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={`${styles.th} ${className}`} {...props}>
    {children}
  </th>
);

export const TableCell = ({ children, className = '', ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={`${styles.td} ${className}`} {...props}>
    {children}
  </td>
);

// Aliases for convenience
export const Thead = TableHeader;
export const Tbody = TableBody;
export const Tr = TableRow;
export const Th = TableHead;
export const Td = TableCell;
