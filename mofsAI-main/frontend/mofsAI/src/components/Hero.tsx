import React from 'react';

const Hero: React.FC = () => {
    return (
        <section className="relative flex items-center justify-center h-screen bg-gradient-to-r from-blue-500 to-purple-500 overflow-hidden">
            <div className="absolute inset-0">
                <div className="w-full h-full bg-opacity-50" />
                <div className="absolute top-0 left-0 w-full h-full bg-[url('/assets/hero-background.svg')] bg-cover bg-center" />
            </div>
            <div className="relative z-10 text-center text-white p-8">
                <h1 className="text-5xl font-bold mb-4">Empowering Your Digital Journey</h1>
                <p className="text-xl mb-8">Innovative solutions powered by AI technology to elevate your business.</p>
                <a href="#contact" className="inline-block bg-white text-blue-500 font-semibold py-3 px-6 rounded-lg shadow-lg hover:bg-gray-200 transition">
                    Get Started
                </a>
            </div>
        </section>
    );
};

export default Hero;