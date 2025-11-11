
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ProductionData } from '../types';
import { parseGanttDate, formatGanttDate } from '../utils/dateUtils';

declare var gantt: any;

interface GanttChartViewProps {
  planData: ProductionData[];
  translations: any;
  machineIds: number[];
  machineTonnages: { [key: number]: number };
  onTaskClick: (job: ProductionData) => void;
}

type GeneralView = 'day' | 'week' | 'month';
type TimelineView = 'general' | 'daily';

const GanttChartView: React.FC<GanttChartViewProps> = ({ planData, translations: t, machineIds, machineTonnages, onTaskClick }) => {
  const ganttContainer = useRef<HTMLDivElement>(null);
  const [filteredMachines, setFilteredMachines] = useState<number[]>(machineIds);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all');
  const [generalView, setGeneralView] = useState<GeneralView>('week');
  const [timelineView, setTimelineView] = useState<TimelineView>('general');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const customerOptions = useMemo(() => {
    const customers = new Set(planData.map(p => p['MÜŞTERİ ADI']).filter(Boolean));
    return ['all', ...Array.from(customers)];
  }, [planData]);

  const machineColors = ['#3b82f6', '#10b981', '#ef4444', '#f97316', '#8b5cf6', '#ec4899'];

  const handleTaskClick = (id: string) => {
      const task = gantt.getTask(id);
      if (task.type === gantt.config.types.project) return;
      
      const originalJob = planData.find(job => `${job.machineId}-${job['SIRA NO'] || job.originalIndex}` === id);
      if(originalJob) {
        onTaskClick(originalJob);
      }
  };


  const handleMachineFilterChange = (machineId: number) => {
    setFilteredMachines(prev =>
      prev.includes(machineId) ? prev.filter(id => id !== machineId) : [...prev, machineId]
    );
  };

  useEffect(() => {
    if (!ganttContainer.current) return;
    
    // Explicitly enable the tooltip plugin to ensure it appears on hover.
    gantt.plugins({
        tooltip: true
    });
    
    gantt.clearAll();

    // Configure Gantt columns and appearance
    gantt.config.columns = [
        { name: "text", label: t.productionData, tree: true, width: '*' },
    ];
    gantt.config.readonly = true;
    gantt.config.date_format = "%Y-%m-%d %H:%i";
    gantt.i18n.setLocale(t.ganttLocale);
    gantt.config.row_height = 35;
    gantt.config.task_height = 18;
    gantt.config.scale_height = 65;
    gantt.config.autofit = false; // Prevent column auto-resizing

    gantt.templates.task_class = (start: Date, end: Date, task: any): string => {
        let classes = `machine_${task.machineId}`;
        if (task.due_date && end > task.due_date) {
            classes += ' overdue';
        }
        return classes;
    };
    
    gantt.templates.tooltip_text = (start: Date, end: Date, task: any) => {
        if (task.type === gantt.config.types.project) {
            return `<b>${task.text}</b>`;
        }
        return `<b>${t.customerName}:</b> ${task.customer || '-'}<br/>` +
               `<b>${t.partNo}:</b> ${task.part_no || '-'}<br/>` +
               `<b>${t.partName}:</b> ${task.text || '-'}<br/>` +
               `<b>${t.totalQuantity}:</b> ${task.total_quantity || '-'}<br/>` +
               `<b>${t.paintCode}:</b> ${task.paint_code || '-'}<br/>` +
               `<b>${t.productionEndDate}:</b> ${gantt.templates.tooltip_date_format(end)}`;
    };
    
    // Attach click event
    const onClickEvent = gantt.attachEvent("onTaskClick", handleTaskClick);

    gantt.init(ganttContainer.current);
    
    return () => {
        gantt.detachEvent(onClickEvent);
    }

  }, [t, machineTonnages, planData]);

  useEffect(() => {
    if (timelineView === 'general') {
        gantt.config.start_date = null; // Reset dates for general view
        gantt.config.end_date = null;
        gantt.config.fit_tasks = true; // Ensure tasks fit
        
        if (generalView === 'day') {
            gantt.config.scales = [
              { unit: "day", step: 1, date: "%d %M" },
              { unit: "hour", step: 1, date: "%H:%i" }
            ];
        } else if (generalView === 'week') {
            gantt.config.scales = [
              { unit: "month", step: 1, date: "%F, %Y" },
              { unit: "week", step: 1, date: t.weekNumber },
              { unit: "day", step: 1, date: "%d" }
            ];
        } else { // month
            gantt.config.scales = [
              { unit: "year", step: 1, date: "%Y" },
              { unit: "month", step: 1, date: "%F" }
            ];
        }
    } else { // daily view
        gantt.config.fit_tasks = false; // Disable fit_tasks for fixed daily view
        gantt.config.scales = [
            {unit: "day", step: 1, date: "%d %M, %Y"},
            {unit: "hour", step: 1, date: "%H:00"}
        ];
        const date = new Date(selectedDate);
        date.setUTCHours(0, 0, 0, 0);
        gantt.config.start_date = date;
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 1);
        gantt.config.end_date = endDate;
    }
    gantt.render();
  }, [timelineView, generalView, selectedDate, t.weekNumber])

  useEffect(() => {
    const filteredData = planData.filter(
      p => filteredMachines.includes(p.machineId) && (selectedCustomer === 'all' || p['MÜŞTERİ ADI'] === selectedCustomer)
    );

    const tasks = [] as any[];

    // Add machine parent tasks
    const displayedMachines = [...new Set(filteredData.map(p => Number(p.machineId)))].sort((a, b) => Number(a) - Number(b));
    
    displayedMachines.forEach(id => {
        tasks.push({
            id: `machine-${id}`,
            text: `${t.machine} ${id} (${machineTonnages[id as number]} ${t.ton})`,
            type: gantt.config.types.project,
            open: true,
            machineId: id as number,
            hide_bar: true, // This hides the bar for project/summary rows
        });
    });

    // Add job child tasks
    filteredData.forEach((job, index) => {
      const startDate = parseGanttDate(job['İŞ EMRİ TARİH ve SAATİ']);
      let endDate = parseGanttDate(job['PARÇA ÜRETİM SONU TARİHİ ve SAATİ']);
      const dueDate = parseGanttDate(job['TERMİN TARİHİ']);

      if (!startDate || !endDate) return;
      
      if (endDate < startDate) {
        const durationHoursStr = String(job['MAKİNE ÇALIŞMA SAATİ']).replace(',', '.');
        const durationHours = parseFloat(durationHoursStr);
        
        if (!isNaN(durationHours) && durationHours > 0) {
          const newEndDate = new Date(startDate.getTime());
          newEndDate.setHours(newEndDate.getHours() + durationHours);
          endDate = newEndDate;
        }
      }

      tasks.push({
        id: `${job.machineId}-${job['SIRA NO'] || index}`,
        text: job['PARÇA ADI'] || 'N/A',
        start_date: formatGanttDate(startDate),
        end_date: formatGanttDate(endDate),
        due_date: dueDate,
        parent: `machine-${job.machineId}`,
        machineId: job.machineId,
        customer: job['MÜŞTERİ ADI'],
        part_no: job['PARÇA NO'],
        total_quantity: job['TOPLAM ADET'],
        paint_code: job['BOYA KODU'],
        originalIndex: index,
      });
    });

    gantt.clearAll();
    gantt.parse({ data: tasks });

  }, [planData, filteredMachines, selectedCustomer, t, machineTonnages]);

  return (
    <main className="flex-grow flex flex-col space-y-4">
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
                <label className="text-sm font-semibold text-slate-600 block mb-1">{t.filterByCustomer}</label>
                <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md text-sm bg-white text-brand-primary">
                    {customerOptions.map(c => <option key={c} value={c}>{c === 'all' ? t.allCustomers : c}</option>)}
                </select>
            </div>
            <div>
                <label className="text-sm font-semibold text-slate-600 block mb-1">{t.filterByMachine}</label>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {machineIds.map(id => (
                        <div key={id} className="flex items-center">
                            <input type="checkbox" id={`machine-${id}`} checked={filteredMachines.includes(id)} onChange={() => handleMachineFilterChange(id)} className="h-4 w-4 rounded border-slate-300 text-brand-accent focus:ring-brand-accent"/>
                            <label htmlFor={`machine-${id}`} className="ml-1.5 text-sm text-slate-700">{t.machine} {id}</label>
                        </div>
                    ))}
                </div>
            </div>
             <div className="lg:col-span-2 flex flex-col md:flex-row items-start md:items-end gap-4">
                <div className="flex-1 w-full">
                     <label className="text-sm font-semibold text-slate-600 block mb-1">{timelineView === 'general' ? t.generalTimeline : t.dailyTimeline}</label>
                     <div className="flex items-center p-1 rounded-md bg-slate-200 w-full">
                         <button onClick={() => setTimelineView('general')} className={`flex-1 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${timelineView === 'general' ? 'bg-white text-brand-primary shadow' : 'text-slate-600'}`}>{t.generalTimeline}</button>
                         <button onClick={() => setTimelineView('daily')} className={`flex-1 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${timelineView === 'daily' ? 'bg-white text-brand-primary shadow' : 'text-slate-600'}`}>{t.dailyTimeline}</button>
                     </div>
                </div>
                {timelineView === 'general' ? (
                    <div className="flex-1 w-full">
                        <div className="flex items-center p-1 rounded-md bg-slate-200 w-full">
                            <button onClick={() => setGeneralView('day')} className={`flex-1 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${generalView === 'day' ? 'bg-white text-brand-primary shadow' : 'text-slate-600'}`}>{t.day}</button>
                            <button onClick={() => setGeneralView('week')} className={`flex-1 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${generalView === 'week' ? 'bg-white text-brand-primary shadow' : 'text-slate-600'}`}>{t.week}</button>
                            <button onClick={() => setGeneralView('month')} className={`flex-1 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${generalView === 'month' ? 'bg-white text-brand-primary shadow' : 'text-slate-600'}`}>{t.month}</button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 w-full">
                         <label htmlFor="date-select" className="text-sm font-semibold text-slate-600 block mb-1">{t.selectDate}</label>
                        <input type="date" id="date-select" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md text-sm bg-white text-brand-primary focus:ring-brand-accent focus:border-brand-accent"/>
                    </div>
                )}
            </div>
        </div>
      </div>
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex-grow flex flex-col">
         <div className="mb-2">
            <h3 className="text-sm font-semibold text-slate-600">{t.machineLegend}</h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                {machineIds.map((id, index) => (
                    <div key={id} className="flex items-center">
                        <span className="h-3 w-3 rounded-sm" style={{backgroundColor: machineColors[index]}}></span>
                        <span className="ml-1.5 text-xs text-slate-700">{t.machine} {id}</span>
                    </div>
                ))}
            </div>
         </div>
        <div ref={ganttContainer} className="flex-grow" style={{ width: '100%' }}></div>
      </div>
    </main>
  );
};

export default GanttChartView;
