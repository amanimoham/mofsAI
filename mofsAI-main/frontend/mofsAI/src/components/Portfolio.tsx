import React from 'react';
import Card from './common/Card';

const projects = [
  {
    title: 'Project One',
    description: 'A brief description of Project One.',
    image: '/assets/project1.jpg',
  },
  {
    title: 'Project Two',
    description: 'A brief description of Project Two.',
    image: '/assets/project2.jpg',
  },
  {
    title: 'Project Three',
    description: 'A brief description of Project Three.',
    image: '/assets/project3.jpg',
  },
  {
    title: 'Project Four',
    description: 'A brief description of Project Four.',
    image: '/assets/project4.jpg',
  },
];

const Portfolio: React.FC = () => {
  return (
    <section className="py-16 bg-gray-100">
      <div className="container mx-auto text-center">
        <h2 className="text-3xl font-bold mb-8">Our Projects</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {projects.map((project, index) => (
            <Card key={index} title={project.title} description={project.description} image={project.image} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Portfolio;