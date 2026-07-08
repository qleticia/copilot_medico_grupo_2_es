import { Construction } from 'lucide-react';

function PlaceholderPage({ title, description }) {
  return (
    <section className="panel placeholder-panel">
      <Construction size={28} />
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </section>
  );
}

export default PlaceholderPage;
