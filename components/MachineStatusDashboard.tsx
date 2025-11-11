import React from 'react';
import { ProductionData } from '../types';
import { parseGanttDate } from '../utils/dateUtils';


interface DashboardProps {
  planData: ProductionData[];
  translations: any;
  machineIds: number[];
  machineTonnages: { [key: number]: number };
  onAddMaintenance: (machineId: number) => void;
}

const getActiveJobForToday = (machineId: number, data: ProductionData[]): ProductionData | null => {
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Start of today
  
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999); // End of today

  for (const job of data) {
    if (job.machineId !== machineId) continue;

    const startDate = parseGanttDate(job['İŞ EMRİ TARİH ve SAATİ']);
    const endDate = parseGanttDate(job['PARÇA ÜRETİM SONU TARİHİ ve SAATİ']);
    
    if (startDate && endDate) {
      // Check if job's timespan overlaps with today
      if (startDate <= endOfToday && endDate >= now) {
        return job;
      }
    }
  }
  return null;
};

const getWeeklyCapacity = (machineId: number, data: ProductionData[]): number => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // Sunday - 0, Monday - 1, ...
    const startOfWeek = new Date(today);
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to start on Monday
    startOfWeek.setDate(today.getDate() + diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    let totalHours = 0;
    const totalWeekHours = 24 * 7;

    const machineJobs = data.filter(job => job.machineId === machineId);

    for (const job of machineJobs) {
        const jobStart = parseGanttDate(job['İŞ EMRİ TARİH ve SAATİ']);
        const jobEnd = parseGanttDate(job['PARÇA ÜRETİM SONU TARİHİ ve SAATİ']);

        if (!jobStart || !jobEnd) continue;

        const overlapStart = Math.max(jobStart.getTime(), startOfWeek.getTime());
        const overlapEnd = Math.min(jobEnd.getTime(), endOfWeek.getTime());

        if (overlapEnd > overlapStart) {
            const durationMs = overlapEnd - overlapStart;
            totalHours += durationMs / (1000 * 60 * 60);
        }
    }

    return Math.round((totalHours / totalWeekHours) * 100);
};

const getMonthlyCapacity = (machineId: number, data: ProductionData[]): number => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    let totalHours = 0;
    const daysInMonth = endOfMonth.getDate();
    const totalMonthHours = 24 * daysInMonth;

    const machineJobs = data.filter(job => job.machineId === machineId);

    for (const job of machineJobs) {
        const jobStart = parseGanttDate(job['İŞ EMRİ TARİH ve SAATİ']);
        const jobEnd = parseGanttDate(job['PARÇA ÜRETİM SONU TARİHİ ve SAATİ']);

        if (!jobStart || !jobEnd) continue;

        const overlapStart = Math.max(jobStart.getTime(), startOfMonth.getTime());
        const overlapEnd = Math.min(jobEnd.getTime(), endOfMonth.getTime());

        if (overlapEnd > overlapStart) {
            const durationMs = overlapEnd - overlapStart;
            totalHours += durationMs / (1000 * 60 * 60);
        }
    }

    return Math.round((totalHours / totalMonthHours) * 100);
};


const MachineStatusDashboard: React.FC<DashboardProps> = ({
  planData,
  translations: t,
  machineIds,
  machineTonnages,
  onAddMaintenance,
}) => {
  const today = new Date();
  const formattedDate = today.toLocaleDateString(t.machine === 'Makine' ? 'tr-TR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  return (
    <section className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">{t.machineStatusDashboard}</h2>
        <div className="text-right">
          <p className="font-semibold text-slate-700">{t.todaysDate}</p>
          <p className="text-sm text-slate-500">{formattedDate}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {machineIds.map((id) => {
          const activeJob = getActiveJobForToday(id, planData);
          const weeklyCapacity = getWeeklyCapacity(id, planData);
          const monthlyCapacity = getMonthlyCapacity(id, planData);

          const weeklyCapacityColor = weeklyCapacity > 90 ? 'bg-red-500' : weeklyCapacity > 70 ? 'bg-yellow-500' : 'bg-green-500';
          const monthlyCapacityColor = monthlyCapacity > 90 ? 'bg-red-500' : monthlyCapacity > 70 ? 'bg-yellow-500' : 'bg-green-500';

          return (
            <div key={id} className="border border-slate-200 rounded-lg p-3 flex flex-col justify-between space-y-3">
              <div>
                <h3 className="font-bold text-brand-primary">
                  {t.machine} {id}
                </h3>
                <p className="text-xs text-slate-500 mb-2">
                  ({machineTonnages[id]} {t.ton})
                </p>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-slate-600">{t.weeklyCapacity}</p>
                  <div className="w-full bg-slate-200 rounded-full h-2.5">
                      <div className={`${weeklyCapacityColor} h-2.5 rounded-full`} style={{ width: `${weeklyCapacity}%` }}></div>
                  </div>
                  <p className="text-xs text-right text-slate-500">{weeklyCapacity}% {t.used}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-600">{t.monthlyCapacity}</p>
                  <div className="w-full bg-slate-200 rounded-full h-2.5">
                      <div className={`${monthlyCapacityColor} h-2.5 rounded-full`} style={{ width: `${monthlyCapacity}%` }}></div>
                  </div>
                  <p className="text-xs text-right text-slate-500">{monthlyCapacity}% {t.used}</p>
                </div>
              </div>

              {activeJob ? (
                 activeJob['PARÇA NO'] === 'BAKIM' ? (
                    <div className="text-sm pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                         <span className="relative flex h-2.5 w-2.5">
                           <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
                         </span>
                         <span className="font-semibold text-orange-700">{t.inMaintenance}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 truncate" title={activeJob['PARÇA ADI']}>
                         {activeJob['PARÇA ADI']}
                      </p>
                    </div>
                 ) : (
                    <div className="text-sm pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                        </span>
                        <span className="font-semibold text-green-700">{t.inProduction}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 truncate" title={activeJob['PARÇA ADI']}>
                        {activeJob['PARÇA ADI']}
                      </p>
                    </div>
                 )
              ) : (
                <div className="text-sm pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                       <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-400"></span>
                    </span>
                    <span className="font-semibold text-slate-600">{t.idle}</span>
                  </div>
                   <button 
                     onClick={() => onAddMaintenance(id)}
                     className="mt-2 w-full text-xs bg-blue-100/60 text-blue-800 hover:bg-blue-200/60 font-semibold py-1 px-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-accent">
                     {t.setMaintenance}
                   </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default MachineStatusDashboard;