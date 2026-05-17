import Navbar from './components/Navbar';
import ArticleCard from './components/ArticleCard';
import Footer from './components/Footer';

function App() {
  return (
    <div className="bg-slate-50 min-h-screen">
      <Navbar />
      
      <main className="max-w-6xl mx-auto px-4 py-10">
        {/* Section Unggulan */}
        {/* <FeaturedArticle /> */}

        {/* Section Daftar Artikel */}
        <div className="mt-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Artikel Terbaru</h2>
            <button className="text-indigo-600 font-semibold text-sm hover:underline">Lihat Semua</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            <ArticleCard 
              title="Belajar Tailwind CSS dalam 10 Menit" 
              category="Desain"
              date="Mei 14, 2024"
              excerpt="Contrary to popular belief, Lorem Ipsum is not simply random text. 
              It has roots in a piece of classical Latin literature from 45 BC, making it over 
              2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College
               in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, 
               discovered the undoubtable source. Lorem Ipsum comes from sections 1.10.32 and 1.10.33 of 
               de Finibus Bonorum et MalorumThis book is a
                treatise on the theory of ethics, very popular during the
                 Renaissance. The first line of Lorem Ipsum, 
                Lorem ipsum dolor siomes from a line in 
                Contrary to popular belief, Lorem Ipsum is not simply random text. 
              It has roots in a piece of classical Latin literature from 45 BC, making it over 
              2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College
               in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, 
               discovered the undoubtable source. Lorem Ipsum comes from sections 1.10.32 and 1.10.33 of 
               de Finibus Bonorum et MalorumThis book is a
                treatise on the theory of ethics, very popular during the
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
