import Container from './common/Container';
import Button from './common/Button';

export default function Contact() {
  return (
    <section id="contact" className="py-20 bg-slate-50">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
            Contact
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Have a dataset or a materials question? Send a message and we’ll get
            back to you.
          </p>
          <div className="mt-8 flex justify-center">
            <Button href="mailto:contact@mofsai.local">Email us</Button>
          </div>
        </div>
      </Container>
    </section>
  );
}

