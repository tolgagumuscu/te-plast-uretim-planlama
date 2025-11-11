
export interface ProductionData {
  machineId: number;
  "SIRA NO": string | null;
  // FIX: Corrected typo "TARH" to "TARİH".
  "İŞ EMRİ TARİH ve SAATİ": string | Date;
  "TERMİN TARİHİ": string | Date;
  "MÜŞTERİ ADI": string;
  "PARÇA NO": string;
  "PARÇA ADI": string;
  "TOPLAM ADET": string;
  "ÇEVRİM SÜRESİ": string;
  "TOPLAM DK": string;
  "BRÜT ÜRÜN GRAMAJI": string;
  "HAMMADDE ADI": string;
  "TOPLAM GEREKLİ HAMMADDE KG": string;
  "BOYA KODU": string;
  "TOPLAM GEREKLİ BOYA": string;
  "TOPLAM GEREKLİ BOYA KG.": string;
  "TOPLAM GÖZ": string;
  "BASKI SAYISI": string;
  "MAKİNE ÇALIŞMA SAATİ": string;
  "MAKİNE DURUŞ SAATİ": string;
  "PARÇA ÜRETİM SONU TARİHİ ve SAATİ"?: string | Date | null;
  [key: string]: any; // Allow for extra properties from parser
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface JobDetailModalProps {
  job: ProductionData | null;
  onClose: () => void;
  translations: any;
  headers: string[];
}

export interface DowntimeData {
  machineId: number;
  jobDowntime: number;
  idleTime: number;
  totalLoss: number;
}

export interface DowntimeHistogramProps {
  downtimeData: DowntimeData[];
  translations: any;
  machineTonnages: { [key: number]: number };
}