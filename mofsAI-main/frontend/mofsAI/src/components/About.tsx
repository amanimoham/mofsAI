import Container from './common/Container';

export default function About() {
  return (
    <section id="about" className="py-20">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
            About mofsAI
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            mofsAI is a materials discovery platform that combines dataset
            analysis with predictive modeling to help researchers explore
            structure–property relationships faster.
          </p>
        </div>
      </Container>
    </section>
  );
}

