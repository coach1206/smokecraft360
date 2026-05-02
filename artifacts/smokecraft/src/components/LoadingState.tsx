import { motion } from "framer-motion";

export function LoadingState() {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center flex-col" data-testid="loading-state">
      <div className="relative w-24 h-24 flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 bg-primary/20 rounded-full blur-xl"
        />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 rounded-full border-t-2 border-primary border-r-2 border-r-transparent border-l-2 border-l-transparent"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 bg-primary rounded-full shadow-[0_0_10px_rgba(200,150,50,0.8)]" />
        </div>
      </div>
      <motion.p
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="mt-8 font-serif text-lg tracking-widest text-primary/80 uppercase"
      >
        Curating Selection
      </motion.p>
    </div>
  );
}
