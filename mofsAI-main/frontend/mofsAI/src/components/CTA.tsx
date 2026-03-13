import React from 'react';
import Button from './common/Button';

const CTA: React.FC = () => {
    return (
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white py-16 px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to run predictions?</h2>
            <p className="mb-8">Upload your dataset or enter features to get AI-powered material property predictions.</p>
            <Button href="/upload" label="Go to Upload" />
        </div>
    );
};

export default CTA;