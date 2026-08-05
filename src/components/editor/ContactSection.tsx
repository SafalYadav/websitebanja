import { Contact } from "@/types/website";

interface Props {
  contact: Contact;
}

export default function ContactSection({ contact }: Props) {
  return (
    <section className="mx-auto max-w-6xl px-10 py-24">

      <h2 className="mb-10 text-5xl font-bold">
        Contact
      </h2>

      <div className="space-y-4 text-xl text-zinc-300">

        <p>📞 {contact.phone}</p>

        <p>📧 {contact.email}</p>

        <p>📍 {contact.address}</p>

      </div>

    </section>
  );
}