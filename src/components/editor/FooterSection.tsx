import { Footer } from "@/types/website";

interface Props {
  footer: Footer;
}

export default function FooterSection({ footer }: Props) {
  return (
    <footer className="border-t border-white/10 py-10 text-center text-zinc-400">
      {footer.copyright}
    </footer>
  );
}