import React from 'react';
import Container from '../../components/common/Container';
import GenerativeMaterials from '../../components/GenerativeMaterials';

export default function Page() {
  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <Container>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mb-2">
          Generative Material Discovery
        </h1>
        <p className="text-slate-600 mb-8">
          Generate entirely new candidate materials using a VAE trained on your dataset, then rank them for transistor performance.
        </p>
        <GenerativeMaterials />
      </Container>
    </div>
  );
}

