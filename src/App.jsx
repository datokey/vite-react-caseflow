import Navbar from './components/Navbar';
import ArticleCard from './components/ArticleCard';
import Footer from './components/Footer';

function App() {
  return (
    <div className="bg-slate-50 min-h-screen">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-10">
       {/* Section search bar artikel */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <input 
            type="text" 
            placeholder="Cari artikel..." 
            className="w-full flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
          <button className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors">
            Cari
          </button>
        </div>
        {/* Section Daftar Artikel */}
        <div className="mt-16"> 
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 justify-items-center">
            <ArticleCard 
              title="Belajar Tailwind CSS dalam 10 Menit" 
              category="Desain"
              date="Mei 14, 2024"
              excerpt="very popular during the
                 Renaissance. The first line of Lorem Ipsum, 
                Lorem ipsum dolor siomes from a line in 
                "
            />
            <ArticleCard 
              title="State Management: Redux vs Context API" 
              category="Frontend"
              date="Mei 12, 2024"
              excerpt="Mana yang lebih cocok untuk project kamu? Simak perbandingan mendalamnya di sini."
            />
            <ArticleCard 
              title="Tips Menjadi Fullstack Developer 2024" 
              category="Karir"
              date="Mei 10, 2024"
              excerpt="Langkah-langkah praktis dan roadmap belajar untuk kamu yang ingin menguasai frontend dan backend."
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default App;
