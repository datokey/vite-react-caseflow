import { useState } from "react";

const ArticleCard = ({ title, category, date, excerpt, content, image, onEdit, onCopy }) => {
  // State untuk mengontrol apakah modal detail sedang terbuka atau tidak
  const [isOpen, setIsOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

 

  const handleCopy = (e) => {
    e.stopPropagation();
    if (onCopy) onCopy();
    // Menyalin seluruh konten penuh ke clipboard
    navigator.clipboard.writeText(`${content || excerpt}`).
      then(() => {
        setIsCopied(true) // Tampilkan feedback "Teks Disalin!" pada tombol
        // Kembalikan tombol ke tulisan "Salin" setelah 2 detik
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch(() => {
        alert("Gagal menyalin teks. Silakan coba lagi.");
      });
    
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    if (onEdit) onEdit();
  };

  return (
    <>
      {/* ========================================== */}
      {/* 1. CARD UTAMA (UKURAN KECIL)               */}
      {/* ========================================== */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow duration-300 p-5 flex flex-col justify-between max-w-sm">
        <div>
          {/* Bagian Atas: Tanggal & Tombol Aksi */}
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
              {date || "15 Mei 2026"}
            </span>
            <div className="flex gap-1">
              <button
                onClick={handleCopy}
                title={isCopied ? "Teks disalin" : "Copy Teks"}
                className={`p-1.5 rounded-lg transition-colors duration-200 ${isCopied ? "text-emerald-600 bg-emerald-50" : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"}`}
              >
                {isCopied ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
                  </svg>
                )}
              </button>
              <button onClick={handleEdit} title="Edit Konten" className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors duration-200">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </button>
            </div>
          </div>
          {/* Konten Teks Pendek */}
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-900 leading-snug">
              {title}
            </h3>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed line-clamp-2">
              {excerpt}
            </p>
          </div>
        </div>

        {/* Tombol Pemicu Modal */}
        <div className="border-t border-slate-50 pt-3 text-right mt-2">
          <button 
            onClick={() => setIsOpen(true)} 
            className="inline-flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors group/btn"
          >
            Lanjutkan
            <svg className="w-4 h-4 ml-1 transform group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. MODAL CARD DETAIL (SETENGAH LAYAR)     */}
      {/* ========================================== */}
     {/* ========================================== */}
{/* 2. MODAL CARD DETAIL (SETENGAH LAYAR)     */}
{/* ========================================== */}
{isOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
    
    {/* Backdrop click untuk menutup modal */}
    <div className="absolute inset-0" onClick={() => setIsOpen(false)}></div>

    {/* Wrapper Card Besar (Setengah Layar Desktop) */}
    <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh] z-10 animate-slide-up">
      
      {/* Tombol Close di Pojok Kanan Atas Modal */}
      <button 
        onClick={() => setIsOpen(false)}
        className="absolute top-4 right-4 z-20 p-2 text-slate-400 hover:text-slate-600 bg-white/80 hover:bg-white rounded-full shadow-xs transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>

      {/* Area Konten yang Bisa Di-scroll Jika Terlalu Panjang */}
      <div className="overflow-y-auto p-6 md:p-8">
        {/* Meta Data: Tanggal */}
        <div className="flex items-center text-xs font-medium text-slate-400 mb-3 gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
          <span>Diterbitkan pada {date || "15 Mei 2026"}</span>
        </div>

        {/* Judul Utuh */}
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight mb-4">
          {title}
        </h2>

        {/* Seluruh Isi Konten (Tanpa Potongan Teks) */}
        <div className="text-slate-600 text-base leading-relaxed space-y-4">
          {content ? (
            <p className="whitespace-pre-line">{content}</p>
          ) : (
            <p>{excerpt}</p>
          )}
        </div>
      </div>

      {/* Bagian Bawah Modal (Footer Tetap dengan Aksi Baru) */}
      <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex justify-between items-center gap-4">
        
        {/* SISI KIRI: Grup Tombol Aksi (Copy & Edit) */}
        <div className="flex items-center gap-2">
          {/* Tombol Copy / Salin */}
          <button 
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl border transition-all ${
              isCopied 
                ? "bg-emerald-50 border-emerald-200 text-emerald-600" 
                : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 shadow-2xs"
            }`}
          >
            {isCopied ? (
              <>
                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span>Tersalin!</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
                </svg>
                <span>Salin</span>
              </>
            )}
          </button>

          {/* Tombol Edit */}
          <button 
            onClick={() => {
              // Tulis fungsi edit kamu di sini, atau panggil prop seperti: onEdit(id)
              alert("Buka mode edit untuk artikel ini");
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100/80 border border-indigo-100 rounded-xl transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5M18.364 4.364a1.864 1.864 0 112.636 2.636L12 16.5l-4 1 1-4 9.364-9.364z"></path>
            </svg>
            <span>Edit</span>
          </button>
        </div>

        {/* SISI KANAN: Tombol Selesai Membaca */}
        <button 
          onClick={() => setIsOpen(false)}
          className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors shadow-xs shrink-0"
        >
          Selesai Membaca
        </button>
        
      </div>
    </div>
  </div>
)}
    </>
  );
};

export default ArticleCard;