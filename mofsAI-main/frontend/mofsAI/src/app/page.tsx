import React from 'react';
import Hero from '../components/Hero';
import Services from '../components/Services';
import Projects from '../components/Portfolio';
import About from '../components/About';
import Contact from '../components/Contact';
import CTA from '../components/CTA';

const Page: React.FC = () => {
  return (
    <main>
      <Hero />
      <Services />
      <Projects />
      <About />
      <Contact />
      <CTA />
    </main>
  );
};

export default Page;