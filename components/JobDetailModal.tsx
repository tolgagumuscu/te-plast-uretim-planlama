import React from 'react';
import { JobDetailModalProps } from '../types';
import { parseGanttDate } from '../utils/dateUtils';


const formatDateForDisplay = (dateInput: string | Date | null | undefined): string => {
  if (!dateInput) return '-';
  
  const dateObj = parseGanttDate(dateInput);
  if (!dateObj || isNaN(dateObj.getTime())) {
    return String(dateInput ?? '-');
  }

  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = String(dateObj.getFullYear());
  
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

const JobDetailModal: React.FC<JobDetailModalProps> = ({ job, onClose, translations: t, headers }) => {
  if (!job) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="modal-close-button" aria-label={t.close}>
          &times;
        </button>
        <h2 className="text-xl font-bold text-brand-primary mb-4">{t.jobDetailModalTitle}</h2>
        <div className="space-y-2 text-sm">
          {headers.map(header => {
            const value = job[header];
            const displayValue = dateHeaders.has(header)
                ? formatDateForDisplay(value)
                : String(value ?? '-');

            return (
                 <div key={header} className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-100">
                    <dt className="font-semibold text-slate-600 col-span-1">{header}</dt>
                    <dd className="text-brand-secondary col-span-2">{displayValue}</dd>
                </div>
            )
          })}
        </div>
        <div className="mt-6 flex justify-end">
            <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-200 text-slate-800 font-semibold rounded-lg hover:bg-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
            >
                {t.close}
            </button>
        </div>
      </div>
    </div>
  );
};

export default JobDetailModal;