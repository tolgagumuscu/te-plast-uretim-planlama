# TE-PLAST Üretim Asistanı

TE-PLAST Üretim Asistanı, Excel'deki üretim verilerini anlık olarak görselleştiren ve yapay zeka ile analiz imkanı sunan bir web uygulamasıdır. Bu araç, üretim planlamasını kolaylaştırmak ve makine verimliliğini artırmak amacıyla geliştirilmiştir.

## Temel Özellikler

*   **Dinamik Pano:** Excel dosyanızı yükleyerek üretim planını anında canlandırın.
*   **Gantt Şeması:** İş emirlerini, makineleri ve termin tarihlerini interaktif bir zaman çizelgesinde görüntüleyin.
*   **Verimlilik Analizi:** Makine kapasitelerini, duruş sürelerini ve genel verimliliği grafiklerle takip edin.
*   **AI Destekli Sorgulama:** Google Gemini entegrasyonu sayesinde üretim planı hakkında karmaşık sorular sorun ve anında cevaplar alın. (Örn: "Gelecek hafta en yoğun çalışacak makine hangisi?")
*   **Filtreleme ve Detay:** Müşteri, makine veya iş emri bazında filtreleme yaparak verilere odaklanın.

## Teknolojiler

*   **Frontend:** React, TypeScript, Vite
*   **Styling:** Tailwind CSS
*   **Yapay Zeka:** Google Gemini
*   **Grafikler:** dhtmlx-gantt ve özel React bileşenleri

## Yerel Kurulum

Projeyi yerel makinenizde çalıştırmak için:

1.  Projeyi klonlayın ve bağımlılıkları yükleyin.
    ```bash
    git clone https://github.com/tolgagumuscu/te-plast-uretim-planlama.git
    cd te-plast-uretim-planlama
    npm install
    ```

2.  `.env` dosyası oluşturup Google Gemini API anahtarınızı ekleyin.
    ```
    GEMINI_API_KEY=YOUR_API_KEY
    ```

3.  Geliştirme sunucusunu başlatın.
    ```bash
    npm run dev
    ```