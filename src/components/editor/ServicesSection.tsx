interface Service {
  title: string;
  description: string;
}

interface ServicesSectionProps {
  services: Service[];
}

export default function ServicesSection({
  services,
}: ServicesSectionProps) {
  return (
    <section className="mx-auto max-w-7xl px-10 py-24">

      <h2 className="mb-10 text-5xl font-bold">
        Services
      </h2>

      <div className="grid gap-8 md:grid-cols-3">

        {services.map((service, index) => (
          <div
            key={index}
            className="rounded-3xl border border-white/10 bg-white/5 p-8"
          >
            <h3 className="text-2xl font-bold">
              {service.title}
            </h3>

            <p className="mt-4 text-zinc-400">
              {service.description}
            </p>
          </div>
        ))}

      </div>

    </section>
  );
}