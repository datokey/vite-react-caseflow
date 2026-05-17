// src/components/FeaturedArticle.jsx
const FeaturedArticle = () => {
  return (
    <div className="relative w-full rounded-3xl overflow-hidden bg-slate-900 h-[400px] md:h-[500px]">
      <img 
        src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=1000" 
        className="w-full h-full object-cover opacity-50"
        alt="Hero"
      />
      <div className="absolute inset-0 p-8 md:p-16 flex flex-col justify-end bg-gradient-to-t from-slate-900 via-transparent">
        <span className="bg-indigo-600 text-white px-3 py-1 rounded-md text-xs font-bold w-max">LATEST</span>
        <h2 className="text-3xl md:text-5xl font-extrabold text-white mt-4 max-w-2xl leading-tight">
          Masa Depan Web Development dengan AI dan React 19
        </h2>
        <p className="text-slate-300 mt-4 max-w-lg hidden md:block">
          Bagaimana evolusi kecerdasan buatan mengubah cara kita menulis kode dan membangun interface yang lebih cerdas.
        </p>
      </div>
    </div>
  );
};

export default FeaturedArticle;