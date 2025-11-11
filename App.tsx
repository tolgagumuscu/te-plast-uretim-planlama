
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Chat, GenerateContentResponse } from '@google/genai';
import { ChatMessage, ProductionData } from './types';
import { initializeChat } from './services/geminiService';
import ProductionTable from './components/ProductionTable';
import ChatInterface from './components/ChatInterface';
import MachineStatusDashboard from './components/MachineStatusDashboard';
import DowntimeHistogram from './components/DowntimeHistogram';
import GanttChartView from './components/GanttChartView';
import JobDetailModal from './components/JobDetailModal';
import { logoBase64 } from './assets/logo';
import { translations } from './translations';
import { parseGanttDate, getFormattedDate, parseDowntimeToHours } from './utils/dateUtils';


declare var XLSX: any; // Global variable from SheetJS script

const machineTonnages: { [key: number]: number } = {
  1: 320, 2: 120, 3: 150, 4: 130, 5: 130, 6: 150,
};

// Columns to display in the table, now single-line and corrected
const displayedHeaders = [
  "SIRA NO",
  "İŞ EMRİ TARİH ve SAATİ",
  "TERMİN TARİHİ",
  "MÜŞTERİ ADI",
  "PARÇA NO",
  "PARÇA ADI",
  "TOPLAM ADET",
  "ÇEVRİM SÜRESİ",
  "TOPLAM DK",
  "BRÜT ÜRÜN GRAMAJI",
  "HAMMADDE ADI",
  "TOPLAM GEREKLİ HAMMADDE KG",
  "BOYA KODU",
  "TOPLAM GEREKLİ BOYA",
  "TOPLAM GEREKLİ BOYA KG.",
  "TOPLAM GÖZ",
  "BASKI SAYISI",
  "MAKİNE ÇALIŞMA SAATİ",
  "MAKİNE DURUŞ SAATİ",
  "PARÇA ÜRETİM SONU TARİHİ ve SAATİ",
];

type View = 'planner' | 'gantt';

const formatDurationString = (timeStr: string | null | undefined): string => {
    if (!timeStr || typeof timeStr !== 'string') return timeStr || '';

    // Regex to capture hours, minutes, seconds, and optional AM/PM
    const match = timeStr.match(/(\d{1,2}):(\d{2}):(\d{2})\s*(am|pm)?/i);

    if (!match) {
        // Handle cases like "4:00:00" which might not be parsed correctly if they are numbers in excel
        if (/^(\d{1,2}):(\d{2}):(\d{2})$/.test(timeStr)) return timeStr;

        // Try to parse Excel time serial number (a float from 0 to 1)
        const timeSerial = parseFloat(timeStr);
        if (!isNaN(timeSerial) && timeSerial >= 0 && timeSerial < 1) {
            const totalSeconds = Math.round(timeSerial * 86400);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            return [
                String(hours).padStart(2, '0'),
                String(minutes).padStart(2, '0'),
                String(seconds).padStart(2, '0')
            ].join(':');
        }
        return timeStr; 
    }

    let [, hours, minutes, seconds, modifier] = match;
    let h = parseInt(hours, 10);

    if (modifier) {
        modifier = modifier.toLowerCase();
        if (modifier === 'pm' && h < 12) {
            h += 12;
        }
        if (modifier === 'am' && h === 12) { // Handle 12 AM
            h = 0;
        }
    }
    
    // Now format back to HH:mm:ss
    return [
        String(h).padStart(2, '0'),
        minutes,
        seconds
    ].join(':');
};


const LanguageToggle: React.FC<{ language: 'tr' | 'en', setLanguage: (lang: 'tr' | 'en') => void }> = ({ language, setLanguage }) => (
    <div className="flex items-center p-1 rounded-full bg-slate-200">
        <button onClick={() => setLanguage('tr')} className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${language === 'tr' ? 'bg-white text-brand-primary shadow' : 'text-slate-600 hover:text-brand-primary'}`}>TR</button>
        <button onClick={() => setLanguage('en')} className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${language === 'en' ? 'bg-white text-brand-primary shadow' : 'text-slate-600 hover:text-brand-primary'}`}>EN</button>
    </div>
);

const ViewToggle: React.FC<{ view: View, setView: (view: View) => void, t: any }> = ({ view, setView, t }) => (
  <div className="flex items-center p-1 rounded-full bg-slate-200">
      <button onClick={() => setView('planner')} className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${view === 'planner' ? 'bg-white text-brand-primary shadow' : 'text-slate-600 hover:text-brand-primary'}`}>{t.plannerView}</button>
      <button onClick={() => setView('gantt')} className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${view === 'gantt' ? 'bg-white text-brand-primary shadow' : 'text-slate-600 hover:text-brand-primary'}`}>{t.ganttView}</button>
  </div>
);


const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<'tr' | 'en'>('tr');
  const [planData, setPlanData] = useState<ProductionData[]>([]);
  const [isFileLoading, setIsFileLoading] = useState<boolean>(false);
  const [view, setView] = useState<View>('planner');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<ProductionData | null>(null);
  const chatRef = useRef<Chat | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const t = translations[language];

  // Data Persistence: Load from localStorage on initial render
  useEffect(() => {
    try {
      const savedPlanData = localStorage.getItem('planData');
      const savedMessages = localStorage.getItem('messages');
      const savedLanguage = localStorage.getItem('language') as 'tr' | 'en';

      if (savedPlanData) {
        const parsedData = JSON.parse(savedPlanData, (key, value) => {
           if (["İŞ EMRİ TARİH ve SAATİ", "TERMİN TARİHİ", "PARÇA ÜRETİM SONU TARİHİ ve SAATİ"].includes(key) && typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
             return new Date(value);
           }
           return value;
        });
        setPlanData(parsedData);
      }
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      }
      if (savedLanguage) {
        setLanguage(savedLanguage);
      }
    } catch (e) {
      console.error("Failed to load data from localStorage", e);
    }
  }, []);

  // Data Persistence: Save to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem('planData', JSON.stringify(planData));
    } catch (e) {
      console.error("Failed to save planData to localStorage", e);
    }
  }, [planData]);

  useEffect(() => {
    try {
      localStorage.setItem('messages', JSON.stringify(messages));
    } catch (e) {
      console.error("Failed to save messages to localStorage", e);
    }
  }, [messages]);

   useEffect(() => {
    try {
      localStorage.setItem('language', language);
    } catch (e) {
      console.error("Failed to save language to localStorage", e);
    }
  }, [language]);


  const machineIds = useMemo(() => 
    [...new Set(planData.map(p => p.machineId))].sort((a,b) => Number(a) - Number(b)), 
    [planData]
  );

  const downtimeData = useMemo(() => {
    if (planData.length === 0) return [];

    const jobDowntimeByMachine: { [key: number]: number } = {};
    const idleTimeByMachine: { [key: number]: number } = {};

    for (const job of planData) {
        if (!jobDowntimeByMachine[job.machineId]) {
            jobDowntimeByMachine[job.machineId] = 0;
        }
        jobDowntimeByMachine[job.machineId] += parseDowntimeToHours(job['MAKİNE DURUŞ SAATİ']);
    }

    for (const id of machineIds) {
      idleTimeByMachine[id] = 0;
      const machineJobs = planData
          .filter(job => job.machineId === id)
          .sort((a, b) => {
              const dateA = parseGanttDate(a['İŞ EMRİ TARİH ve SAATİ']);
              const dateB = parseGanttDate(b['İŞ EMRİ TARİH ve SAATİ']);
              if (dateA && dateB) return dateA.getTime() - dateB.getTime();
              return 0;
          });

      for (let i = 0; i < machineJobs.length - 1; i++) {
          const currentJobEnd = parseGanttDate(machineJobs[i]['PARÇA ÜRETİM SONU TARİHİ ve SAATİ']);
          const nextJobStart = parseGanttDate(machineJobs[i + 1]['İŞ EMRİ TARİH ve SAATİ']);

          if (currentJobEnd && nextJobStart && nextJobStart.getTime() > currentJobEnd.getTime()) {
              const idleMillis = nextJobStart.getTime() - currentJobEnd.getTime();
              idleTimeByMachine[id] += idleMillis / (1000 * 60 * 60);
          }
      }
    }

    return machineIds.map(id => {
        const jobDowntime = jobDowntimeByMachine[id] || 0;
        const idleTime = idleTimeByMachine[id] || 0;
        return {
            machineId: id,
            jobDowntime,
            idleTime,
            totalLoss: jobDowntime + idleTime,
        };
    });
  }, [planData, machineIds]);
  
  const [selectedMachineId, setSelectedMachineId] = useState<number | null>(null);

  useEffect(() => {
    if (machineIds.length > 0 && !machineIds.includes(selectedMachineId as number)) {
      setSelectedMachineId(machineIds[0]);
    } else if (machineIds.length === 0) {
      setSelectedMachineId(null);
    }
  }, [machineIds, selectedMachineId]);
  
  useEffect(() => {
    if (planData.length === 0) {
      chatRef.current = null;
      if(messages.length === 0) { // Only set initial if no persisted messages
         setMessages([{ role: 'model', text: translations[language].uploadPrompt }]);
      }
      return;
    }

    const chatInstance = initializeChat(language, JSON.stringify(planData));

    if (chatInstance) {
      chatRef.current = chatInstance;
      // If messages are empty after loading data, set initial message
      if (messages.length === 0 || (messages.length === 1 && messages[0].text === t.uploadPrompt) ) {
         setMessages([{ role: 'model', text: t.initialMessage }]);
      }
    } else {
      setError(translations[language].chatError);
      setMessages([]);
    }
  }, [language, planData]);
  
  const handleResetChat = () => {
    setMessages([{ role: 'model', text: t.initialMessage }]);
     const chatInstance = initializeChat(language, JSON.stringify(planData));
     if (chatInstance) {
       chatRef.current = chatInstance;
     }
  };

  const handleSendMessage = async (prompt: string) => {
    if (!chatRef.current || planData.length === 0) {
      setError(t.chatError);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    const userMessage: ChatMessage = { role: 'user', text: prompt };
    setMessages(prev => [...prev, userMessage]);

    const enhancedPrompt = `(Current Date: ${getFormattedDate()}) ${prompt}`;

    try {
      const stream = await chatRef.current.sendMessageStream({ message: enhancedPrompt });

      let streamedText = '';
      setMessages(prev => [...prev, { role: 'model', text: '' }]);
      
      for await (const chunk of stream) {
        streamedText += chunk.text;
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { role: 'model', text: streamedText };
          return newMessages;
        });
      }
    } catch (err) {
      const errorMessage = t.modelError;
      setError(errorMessage);
      setMessages(prev => [...prev, { role: 'model', text: errorMessage }]);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAddMaintenance = (machineId: number) => {
    const today = new Date();
    
    const startMaintenanceDate = new Date(today);
    startMaintenanceDate.setHours(8, 0, 0, 0);

    const endMaintenanceDate = new Date(today);
    endMaintenanceDate.setHours(17, 0, 0, 0);

    const terminDate = new Date(today);
    terminDate.setHours(0,0,0,0);

    const newMaintenanceRecord: ProductionData = {
      machineId: machineId,
      "SIRA NO": null,
      "İŞ EMRİ TARİH ve SAATİ": startMaintenanceDate,
      "TERMİN TARİHİ": terminDate,
      "MÜŞTERİ ADI": "-",
      "PARÇA NO": "BAKIM",
      "PARÇA ADI": t.scheduledMaintenance,
      "TOPLAM ADET": "-",
      "ÇEVRİM SÜRESİ": "-",
      "TOPLAM DK": "480",
      "BRÜT ÜRÜN GRAMAJI": "-",
      "HAMMADDE ADI": "-",
      "TOPLAM GEREKLİ HAMMADDE KG": "-",
      "BOYA KODU": "-",
      "TOPLAM GEREKLİ BOYA": "-",
      "TOPLAM GEREKLİ BOYA KG.": "-",
      "TOPLAM GÖZ": "-",
      "BASKI SAYISI": "-",
      "MAKİNE ÇALIŞMA SAATİ": "8",
      "MAKİNE DURUŞ SAATİ": "00:00:00",
      "PARÇA ÜRETİM SONU TARİHİ ve SAATİ": endMaintenanceDate,
    };

    setPlanData(prevData => [...prevData, newMaintenanceRecord]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsFileLoading(true);
    setError(null);
    setPlanData([]);
    setMessages([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: false, dateNF:'dd.mm.yyyy hh:mm' });
        
        const sheetNames = ["MAKİNE 1", "MAKİNE 2", "MAKİNE 3", "MAKİNE 4", "MAKİNE 5", "MAKİNE 6"];
        let allData: ProductionData[] = [];

        const headerMapping: { [key: string]: keyof ProductionData } = {
          A: "SIRA NO",
          B: "İŞ EMRİ TARİH ve SAATİ",
          C: "TERMİN TARİHİ",
          D: "MÜŞTERİ ADI",
          E: "PARÇA NO",
          F: "PARÇA ADI",
          G: "TOPLAM ADET",
          H: "ÇEVRİM SÜRESİ",
          I: "TOPLAM DK",
          L: "BRÜT ÜRÜN GRAMAJI",
          M: "HAMMADDE ADI",
          N: "TOPLAM GEREKLİ HAMMADDE KG",
          O: "BOYA KODU",
          P: "TOPLAM GEREKLİ BOYA",
          Q: "TOPLAM GEREKLİ BOYA KG.",
          R: "TOPLAM GÖZ",
          S: "BASKI SAYISI",
          V: "MAKİNE ÇALIŞMA SAATİ",
          X: "MAKİNE DURUŞ SAATİ",
          AA: "PARÇA ÜRETİM SONU TARİHİ ve SAATİ",
        };

        for (const sheetName of sheetNames) {
          if (workbook.Sheets[sheetName]) {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 'A', raw: false });
            
            const machineId = parseInt(sheetName.split(' ')[1]);

            const processedData = jsonData.slice(1) // Skip the header row
              .filter(row => row['E'] && row['E'] !== '#N/A')
              .map((row: any) => {
                const newRow: any = { machineId };
                 for (const col in headerMapping) {
                  const header = headerMapping[col];
                  if (header === "MAKİNE DURUŞ SAATİ") {
                    newRow[header] = formatDurationString(row[col]);
                  } else {
                    newRow[header] = row[col] || null;
                  }
                }
                return newRow as ProductionData;
              });
            allData = allData.concat(processedData);
          }
        }
        
        setPlanData(allData);
        setMessages([{ role: 'model', text: t.initialMessage }]); // Reset chat on new file
      } catch (err) {
        console.error("File parsing error:", err);
        setError(t.fileError);
      } finally {
        setIsFileLoading(false);
      }
    };
    reader.onerror = () => {
      setError(t.fileError);
      setIsFileLoading(false);
    };
    reader.readAsArrayBuffer(file);
    if (e.target) e.target.value = '';
  };

  const openJobModal = (job: ProductionData) => {
    setSelectedJob(job);
    setIsModalOpen(true);
  };

  const filteredData = useMemo(() => 
    selectedMachineId ? planData.filter(p => p.machineId === selectedMachineId) : [],
    [selectedMachineId, planData]
  );

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-6 lg:p-8 space-y-4 bg-brand-bg text-brand-primary">
      <header className="flex justify-between items-start">
        <div className="flex items-center gap-4">
            <img src={logoBase64} alt="Company Logo" className="h-12 sm:h-14 w-auto" />
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold">{t.title}</h1>
                <p className="text-sm sm:text-base text-slate-600 mt-1">{t.subtitle}</p>
            </div>
        </div>
         <div className="flex items-center gap-4">
            {planData.length > 0 && (
              <>
                <ViewToggle view={view} setView={setView} t={t} />
                <LanguageToggle language={language} setLanguage={setLanguage} />
              </>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".xlsx, .xls, .csv"
            />
            <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isFileLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-accent text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent disabled:bg-slate-400 disabled:cursor-wait"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                {planData.length > 0 ? t.updateExcel : t.uploadExcel}
            </button>
        </div>
      </header>
      
      {isFileLoading ? (
         <main className="flex-grow flex flex-col items-center justify-center text-center">
            <svg className="animate-spin h-8 w-8 text-brand-accent mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-4 text-lg font-semibold">{t.processingFile}</p>
         </main>
      ) : planData.length === 0 ? (
         <main className="flex-grow flex flex-col items-center justify-center text-center">
            <p className="text-slate-600 max-w-md">{error || t.uploadPrompt}</p>
         </main>
      ) : (
        view === 'planner' ? (
        <>
          <DowntimeHistogram
            downtimeData={downtimeData}
            translations={t}
            machineTonnages={machineTonnages}
          />
          <MachineStatusDashboard 
            planData={planData} 
            translations={t} 
            machineIds={machineIds}
            machineTonnages={machineTonnages}
            onAddMaintenance={handleAddMaintenance}
          />

          <main className="flex-grow grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-0">
            <section className="lg:col-span-3 flex flex-col overflow-hidden">
                <h2 className="text-xl font-semibold mb-4">{t.productionData}</h2>
                <div className="border-b border-slate-200">
                  <nav className="-mb-px flex space-x-1 sm:space-x-2" aria-label="Tabs">
                    {machineIds.map((id) => (
                      <button
                        key={id}
                        onClick={() => setSelectedMachineId(id)}
                        className={`${
                          id === selectedMachineId
                            ? 'border-brand-accent text-brand-accent'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-400'
                        } whitespace-nowrap py-2 px-1 sm:px-2 border-b-2 font-semibold text-xs sm:text-sm transition-colors focus:outline-none`}
                        aria-current={id === selectedMachineId ? 'page' : undefined}
                      >
                        {t.machine} {id} ({machineTonnages[id]} {t.ton})
                      </button>
                    ))}
                  </nav>
                </div>
                <div className="flex-grow overflow-hidden mt-4">
                   <ProductionTable data={filteredData} headers={displayedHeaders} noDataText={t.noData} onRowClick={openJobModal} />
                </div>
            </section>
            
            <section className="lg:col-span-2 flex flex-col overflow-hidden">
               <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">{t.chatAssistant}</h2>
                <button
                  onClick={handleResetChat}
                  title={t.resetChatTooltip}
                  className="p-1.5 text-slate-500 hover:text-brand-primary hover:bg-slate-200 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-accent"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                     <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.667 0l3.182-3.182m0 0h-4.992m4.992 0v-4.992m-4.993 0l-3.181-3.182a8.25 8.25 0 00-11.667 0L2.985 15.644z" />
                  </svg>
                </button>
              </div>
              <div className="flex-grow min-h-0">
                {error && !chatRef.current && <div className="bg-red-500/10 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}
                <ChatInterface messages={messages} onSendMessage={handleSendMessage} isLoading={isLoading} placeholder={t.chatPlaceholder} />
              </div>
            </section>
          </main>
        </>
        ) : (
          <GanttChartView 
            planData={planData} 
            translations={t} 
            machineIds={machineIds} 
            machineTonnages={machineTonnages}
            onTaskClick={openJobModal}
          />
        )
      )}
      {isModalOpen && <JobDetailModal job={selectedJob} onClose={() => setIsModalOpen(false)} translations={t} headers={displayedHeaders} />}
    </div>
  );
};

export default App;