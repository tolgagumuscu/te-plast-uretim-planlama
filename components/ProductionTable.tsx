import React from 'react';
import { ProductionData } from '../types';
import { parseGanttDate } from '../utils/dateUtils';

interface ProductionTableProps {
  data: ProductionData[];
  headers: string[];
  noDataText: string;
  onRowClick: (job: ProductionData) => void;
}

const formatDateForDisplay = (dateInput: string | Date | null | undefined): string => {
  if (!dateInput) return '-';
  
  const dateObj = parseGanttDate(dateInput);
  if (!dateObj || isNaN(dateObj.getTime())) {
    return String(dateInput ?? '-'); // Fallback to the original string if parsing fails
  }

  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = String(dateObj.getFullYear());
  
  // Show time only if the date object has a non-zero time part.
  if (dateObj.getHours() !== 0 || dateObj.getMinutes() !== 0 || dateObj.getSeconds() !== 0) {
    const hours = dateObj.getHours();
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  } else {
    return `${day}.${month}.${year}`;
  }
};

const dateHeaders = new Set([
  "İŞ EMRİ TARİH ve SAATİ",
  "TERMİN TARİHİ",
  "PARÇA ÜRETİM SONU TARİHİ ve SAATİ",
]);


const ProductionTable: React.FC<ProductionTableProps> = ({ data, headers, noDataText, onRowClick }) => {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full text-slate-500">
        <p>{noDataText}</p>
    </div>;
  }

  const highlightHeader = "PARÇA ÜRETİM SONU TARİHİ ve SAATİ";

  return (
    <div className="overflow-auto rounded-lg border border-slate-200 shadow-sm h-full bg-white">
      <table className="w-full min-w-max text-sm text-left text-brand-primary">
        <thead className="text-xs text-brand-primary uppercase bg-slate-50 sticky top-0">
          <tr>
            {headers.map((header) => (
              <th 
                key={header} 
                scope="col" 
                className={`px-4 py-3 font-semibold ${
                  header === highlightHeader ? 'bg-blue-100 text-brand-accent' : ''
                }`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => onRowClick(row)}>
              {headers.map((header) => {
                const cellValue = row[header];
                const displayValue = dateHeaders.has(header)
                  ? formatDateForDisplay(cellValue)
                  : String(cellValue ?? '-');
                return (
                  <td 
                    key={`${rowIndex}-${header}`} 
                    className={`px-4 py-3 whitespace-nowrap ${
                      header === highlightHeader ? 'bg-blue-50 font-semibold text-brand-secondary' : ''
                    }`}
                  >
                    {displayValue}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProductionTable;