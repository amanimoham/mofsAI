import React from 'react';

const testimonials = [
  {
    name: 'John Doe',
    position: 'CEO of Company A',
    feedback: 'This agency transformed our digital presence and helped us reach new heights!',
  },
  {
    name: 'Jane Smith',
    position: 'Marketing Director at Company B',
    feedback: 'The team was incredibly professional and delivered results beyond our expectations.',
  },
  {
    name: 'Alice Johnson',
    position: 'Founder of Startup C',
    feedback: 'Their innovative approach to AI technology has given us a competitive edge in the market.',
  },
];

const Testimonials: React.FC = () => {
  return (
    <section className="py-16 bg-gray-100">
      <div className="container mx-auto text-center">
        <h2 className="text-3xl font-bold mb-8">What Our Clients Say</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-lg">
              <p className="text-lg italic">"{testimonial.feedback}"</p>
              <h3 className="mt-4 font-semibold">{testimonial.name}</h3>
              <p className="text-gray-500">{testimonial.position}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;