import React from 'react';
import Card from './common/Card';

const servicesData = [
  {
    id: 1,
    title: 'Web Development',
    description: 'Building responsive and high-performance websites.',
    icon: '🌐', // You can replace this with an actual icon component
  },
  {
    id: 2,
    title: 'AI Solutions',
    description: 'Implementing AI-driven solutions for your business.',
    icon: '🤖', // You can replace this with an actual icon component
  },
  {
    id: 3,
    title: 'Digital Marketing',
    description: 'Enhancing your online presence through effective marketing strategies.',
    icon: '📈', // You can replace this with an actual icon component
  },
  {
    id: 4,
    title: 'UI/UX Design',
    description: 'Creating user-friendly and visually appealing designs.',
    icon: '🎨', // You can replace this with an actual icon component
  },
];

const Services: React.FC = () => {
  return (
    <section className="py-16 bg-gray-100">
      <div className="container mx-auto text-center">
        <h2 className="text-3xl font-bold mb-8">Our Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {servicesData.map(service => (
            <Card key={service.id} className="hover:shadow-lg transition-shadow duration-300">
              <div className="text-5xl mb-4">{service.icon}</div>
              <h3 className="text-xl font-semibold">{service.title}</h3>
              <p className="text-gray-600">{service.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;