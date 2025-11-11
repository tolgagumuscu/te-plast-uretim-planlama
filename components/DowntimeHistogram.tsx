import React from 'react';
import { DowntimeHistogramProps } from '../types';

// More serious, professional color palette
const barColors = {
  idleTime: '#f59e0b',    // amber-500
  jobDowntime: '#ef4444', // red-500
  totalLoss: '#475569',   // slate-600
};

const DowntimeHistogram: React.FC<DowntimeHistogramProps> = ({ downtimeData, translations: t, machineTonnages }) => {
  if (!downtimeData || downtimeData.length === 0) {
    return null;
  }
  
  const totals = downtimeData.reduce(
    (acc, data) => {
        acc.idleTime += data.idleTime;
        acc.jobDowntime += data.jobDowntime;
        acc.totalLoss += data.totalLoss;
        return acc;
    },
    { idleTime: 0, jobDowntime: 0, totalLoss: 0 }
  );


  // Max value should be based on the total loss, as it will always be the largest
  const maxVal = Math.max(
    ...downtimeData.map(d => d.totalLoss),
    1 // Avoid division by zero and ensure there's always a scale
  );

  const Bar = ({ value, maxValue, color, title, labelStyle }: { value: number; maxValue: number; color: string; title: string; labelStyle: string }) => {
    const heightPercentage = (value / maxValue) * 100;
    // Don't render a bar if the height is effectively zero to avoid visual noise
    if (heightPercentage < 0.1) {
      return <div className="relative w-1/3"></div>;
    }
    return (
      <div
        className="relative w-1/3 rounded-t-md transition-all duration-500"
        style={{
          height: `${heightPercentage}%`,
          backgroundColor: color,
        }}
        title={title}
      >
        <span className={`absolute left-1/2 -translate-x-1/2 text-xs ${labelStyle}`}>
          {value.toFixed(2)}
        </span>
      </div>
    );
  };

  return (
    <section className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-xl font-semibold text-brand-primary w-1/4">{t.machineLossTimes}</h2>
        
        <div className="flex-1 flex justify-center gap-6 text-center -mt-1">
          <div>
            <p className="text-xs font-semibold text-slate-500">{t.totalIdleTime}</p>
            <p className="text-xl font-bold text-amber-500">{totals.idleTime.toFixed(2)} <span className="text-sm font-medium text-slate-600">{t.hours}</span></p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">{t.totalJobDowntime}</p>
            <p className="text-xl font-bold text-red-500">{totals.jobDowntime.toFixed(2)} <span className="text-sm font-medium text-slate-600">{t.hours}</span></p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">{t.overallTotalLoss}</p>
            <p className="text-xl font-bold text-slate-600">{totals.totalLoss.toFixed(2)} <span className="text-sm font-medium text-slate-600">{t.hours}</span></p>
          </div>
        </div>

        <div className="w-1/4 flex justify-end items-center gap-4 text-xs font-semibold">
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-sm mr-1.5" style={{backgroundColor: barColors.idleTime}}></span>
            <span>{t.idleTimeShort}</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-sm mr-1.5" style={{backgroundColor: barColors.jobDowntime}}></span>
            <span>{t.jobDowntimeShort}</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-sm mr-1.5" style={{backgroundColor: barColors.totalLoss}}></span>
            <span>{t.totalLossShort}</span>
          </div>
        </div>
      </div>
      <div className="flex justify-around items-end h-56 space-x-1">
        {downtimeData.map(({ machineId, jobDowntime, idleTime, totalLoss }) => (
          <div 
            key={machineId} 
            className={`flex flex-col items-center flex-1 h-full text-center px-2 border-r border-slate-200 last:border-r-0`}
          >
             <div className="w-full flex-grow flex items-end justify-center gap-1.5 pt-8">
               <Bar 
                 value={idleTime}
                 maxValue={maxVal}
                 color={barColors.idleTime}
                 title={`${t.machine} ${machineId} - ${t.idleTimeShort}: ${idleTime.toFixed(2)} ${t.hours}`}
                 labelStyle="font-semibold text-slate-600 -top-5"
               />
               <Bar 
                 value={jobDowntime}
                 maxValue={maxVal}
                 color={barColors.jobDowntime}
                 title={`${t.machine} ${machineId} - ${t.jobDowntimeShort}: ${jobDowntime.toFixed(2)} ${t.hours}`}
                 labelStyle="font-semibold text-slate-600 -top-5"
               />
                <Bar 
                 value={totalLoss}
                 maxValue={maxVal}
                 color={barColors.totalLoss}
                 title={`${t.machine} ${machineId} - ${t.totalLossShort}: ${totalLoss.toFixed(2)} ${t.hours}`}
                 labelStyle="bg-slate-700 text-white px-1.5 py-0.5 rounded-md font-bold -top-7"
               />
            </div>
            <div className="text-sm font-bold text-brand-primary mt-2">
              {t.machine} {machineId}
            </div>
            <div className="text-xs text-slate-500">
              ({machineTonnages[machineId]} {t.ton})
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default DowntimeHistogram;