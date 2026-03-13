import React from 'react';
import Link from 'next/link';

const Footer: React.FC = () => {
    return (
        <footer className="bg-gray-800 text-white py-6">
            <div className="container mx-auto flex justify-between items-center">
                <div className="flex items-center">
                    <img src="/assets/logo.svg" alt="mofsAI Logo" className="h-10 mr-3" />
                    <span className="text-lg font-semibold">mofsAI</span>
                </div>
                <nav className="flex space-x-4">
                    <Link href="/" className="hover:text-gray-400">Home</Link>
                    <Link href="/upload" className="hover:text-gray-400">Upload</Link>
                    <a href="#services" className="hover:text-gray-400">Services</a>
                    <a href="#projects" className="hover:text-gray-400">Projects</a>
                    <a href="#about" className="hover:text-gray-400">About</a>
                    <a href="#contact" className="hover:text-gray-400">Contact</a>
                </nav>
            </div>
            <div className="text-center mt-4">
                <p className="text-sm">&copy; {new Date().getFullYear()} mofsAI. All rights reserved.</p>
            </div>
        </footer>
    );
};

export default Footer;