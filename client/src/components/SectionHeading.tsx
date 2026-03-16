import { motion } from "framer-motion";

export function SectionHeading(props: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      {props.eyebrow ? <div className="text-xs font-semibold tracking-widest text-white/50">{props.eyebrow}</div> : null}
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mt-2 font-display text-3xl font-semibold tracking-tight text-white md:text-4xl"
      >
        {props.title}
      </motion.h1>
      {props.subtitle ? <div className="mt-2 max-w-2xl text-white/65">{props.subtitle}</div> : null}
    </div>
  );
}

