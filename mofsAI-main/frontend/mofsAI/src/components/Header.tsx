import React from 'react';
import Link from 'next/link';

const Header: React.FC = () => {
    return (
        <header className="bg-white shadow">
            <div className="container mx-auto px-4 py-6 flex justify-between items-center">
                <div className="text-2xl font-bold">
                    <Link href="/">mofsAI</Link>
                </div>
                <nav className="space-x-4">
                    <Link href="/" className="text-gray-700 hover:text-blue-500">Home</Link>
                    <Link href="/upload" className="text-gray-700 hover:text-blue-500">Upload</Link>
                    <Link href="/generate-materials" className="text-gray-700 hover:text-blue-500">Generate Materials</Link>
                    <a href="#services" className="text-gray-700 hover:text-blue-500">Services</a>
                    <a href="#projects" className="text-gray-700 hover:text-blue-500">Projects</a>
                    <a href="#about" className="text-gray-700 hover:text-blue-500">About</a>
                    <a href="#contact" className="text-gray-700 hover:text-blue-500">Contact</a>
                </nav>
            </div>
        </header>
    );
};

export default Header;