import React from 'react';

const Hero = () => {
  return (
    <div className="relative bg-gray-900 h-[500px]">
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&q=80&w=1920')",
          filter: "brightness(0.6)"
        }}
      ></div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
        <div className="text-white max-w-2xl">
          <h1 className="text-5xl font-serif font-bold mb-6">
            L'Excellence du Luxe Français
          </h1>
          <p className="text-xl mb-8">
            Découvrez une sélection exclusive d'articles de luxe authentiques. 
            Achetez et vendez en toute confiance sur la première plateforme 
            dédiée au luxe français.
          </p>
          <div className="space-x-4">
            <button className="bg-white text-gray-900 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              Explorer
            </button>
            <button className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-gray-900 transition-colors">
              Vendre
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;