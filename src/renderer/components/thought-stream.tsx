import { motion } from 'framer-motion';
import { Brain, Sparkles } from 'lucide-react';
import React from 'react';

export type ThoughtStreamProps = {
  thought: string | null;
  isThinking: boolean;
};

export function ThoughtStream({ thought, isThinking }: ThoughtStreamProps) {
  if (!thought && !isThinking) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="relative flex w-full max-w-xl items-center gap-3 rounded-2xl border border-white/10 bg-bg-deep/95 px-5 py-3 backdrop-blur-xl"
      style={{
        boxShadow: isThinking
          ? '0 0 30px rgb(99 102 241 / 0.1), 0 4px 20px rgb(0 0 0 / 0.3)'
          : '0 4px 20px rgb(0 0 0 / 0.3)',
      }}
    >
      {/* AI Icon with pulse */}
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 border border-primary/20">
        {isThinking && (
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-20" />
        )}
        <Brain className="h-4 w-4 text-primary" />
        {isThinking && (
          <motion.div
            className="absolute -top-1 -right-1"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            <Sparkles className="h-3 w-3 text-secondary animate-pulse" />
          </motion.div>
        )}
      </div>

      {/* Thought Text */}
      <div className="flex-1 min-w-0">
        <p className="font-heading text-[10px] font-bold text-primary/50 uppercase tracking-widest leading-none mb-1">
          AGENT_REASONING
        </p>
        <p className="font-ui text-xs text-white/75 leading-relaxed truncate">
          <Typewriter text={thought || 'Processing context...'} />
        </p>
      </div>
    </motion.div>
  );
}

function Typewriter({ text }: { text: string }) {
  const [displayed, setDisplayed] = React.useState('');

  React.useEffect(() => {
    let i = 0;
    setDisplayed('');
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayed((prev) => prev + text.charAt(i));
        i++;
      } else {
        clearInterval(timer);
      }
    }, 20);
    return () => clearInterval(timer);
  }, [text]);

  return (
    <>
      {displayed}
      <motion.span
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 0.8, repeat: Number.POSITIVE_INFINITY }}
        className="inline-block w-1.5 h-3.5 bg-primary/40 align-sub ml-0.5 rounded-sm"
      />
    </>
  );
}
