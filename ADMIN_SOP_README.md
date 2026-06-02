# Admin SOP Page

Halaman admin untuk mengelola Standard Operating Procedure (SOP) dengan fitur-fitur berikut:

## Features

### 1. **Informasi Dasar**
- **Judul SOP**: Input text untuk nama/judul SOP
- **Jenis Log**: Dropdown untuk memilih tipe SOP (Panduan Operasional, Incident, Complaint, Request, Inquiry, Other)

### 2. **Kondisi**
- Textarea untuk memasukkan daftar kondisi
- Setiap baris akan menjadi satu kondisi dalam array
- Auto-resize textarea menggunakan `react-textarea-autosize`

### 3. **Tahap Penanganan** 
- Fitur untuk menambah/menghapus tahap penanganan
- Setiap tahap terdiri dari:
  - **Judul Penanganan**: Nama tahap (contoh: "Tahap 1: Dengarkan dan Pahami")
  - **Instruksi Internal**: Panduan untuk tim (satu per baris)
  - **Template Chat**: Pesan template untuk live chat (dengan autocomplete variabel)

### 4. **Autocomplete Variabel** (Opsional)
- Klik tombol `@var` pada template chat untuk membuka menu variabel
- Variabel tersedia:
  - `{{nama_pelanggan}}` - Nama Pelanggan
  - `{{tanggal}}` - Tanggal
  - `{{nomor_tiket}}` - Nomor Tiket
  - `{{sapaan}}` - Sapaan (Bapak/Ibu)
  - `{{produk}}` - Produk
  - `{{status}}` - Status

### 5. **Plain Text Support**
- Semua field menggunakan textarea biasa (bukan rich text editor)
- Format tidak akan rusak saat di-copy ke live chat atau WhatsApp
- Output berupa plain text untuk konsistensi data

## Installation

Dependencies sudah diinstall:
```bash
npm install react-textarea-autosize react-mentions
```

## Usage

Akses halaman admin melalui:
```
http://localhost:5173/admin/sop
```

## Data Structure

Format data yang dikirim ke backend:

```json
{
  "title": "Judul SOP",
  "content": "",
  "details": {
    "JenisLog": "Panduan Operasional",
    "Kondisi": [
      "Pelanggan marah tentang kualitas produk",
      "Delay pengiriman"
    ],
    "Penanganan": [
      {
        "judulPenanganan": "Tahap 1: Dengarkan dan Pahami",
        "instruksiInternal": [
          "Dengarkan keluh kesah pelanggan hingga selesai",
          "Tunjukkan empati dan pemahaman"
        ],
        "templateChat": "Saya memahami frustrasi Anda. Mari kita lihat bagaimana saya bisa membantu {{nama_pelanggan}}..."
      }
    ]
  },
  "keyword": []
}
```

## Performance Optimization

- Menggunakan `react-textarea-autosize` untuk auto-resize tanpa lag
- Tidak menggunakan rich text editor (CKEditor, TinyMCE) - lebih ringan
- Plain text input untuk validasi lebih mudah
- Minimal dependencies untuk menjaga bundle size tetap kecil

## Notes

- Setiap baris pada Kondisi dan Instruksi Internal akan menjadi satu item array
- Template Chat mendukung variabel dengan format `{{variabel}}`
- Cursor position dipertahankan saat menambahkan variabel
- Minimal satu tahap penanganan harus ada
