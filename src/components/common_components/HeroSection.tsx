'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const slides = [
  {
    image: '/images/img1.jpg',
    title: '2026 World Cup',
    subtitle: 'The biggest tournament on Earth lands in North America',
  },
  {
    image: '/images/img2.jpg',
    title: '48 Teams, 104 Matches',
    subtitle: 'An expanded format means more action, more drama, more bets',
  },
  {
    image: '/images/img3.jpg',
    title: 'Live Odds, Real Time',
    subtitle: 'Track shifting odds as the game unfolds',
  },
  {
    image: '/images/img4.jpg',
    title: 'Build Your Slip',
    subtitle: 'Combine picks across matches for bigger payouts',
  },
  {
    image: '/images/img5.jpg',
    title: '16 Iconic Venues',
    subtitle: 'From the Azteca to MetLife — every stadium matters',
  },
  {
    image: '/images/img6.jpg',
    title: 'Smart Betting',
    subtitle: 'Data-driven insights to inform every decision',
  },
  {
    image: '/images/img7.jpg',
    title: 'Round the Clock',
    subtitle: 'Matches across every time zone — never miss a kick',
  },
  {
    image: '/images/img8.jpg',
    title: 'The Final',
    subtitle: 'July 19, 2026 — one trophy, one champion',
  },
];

export default function HeroSection() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative h-[45vh] min-h-[320px] w-full overflow-hidden sm:h-[55vh] lg:h-[65vh]">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${slides[current].image})` }}
        />
      </AnimatePresence>

      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />

      <div className="relative mx flex h-full max-w-6xl items-center px-4 sm:px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={`text-${current}`}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="max-w-lg"
          >
            <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
              {slides[current].title}
            </h2>
            <p className="mt-3 text-sm text-zinc-300 sm:text-base lg:text-lg">
              {slides[current].subtitle}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-2 rounded-full transition-all ${
              i === current ? 'w-6 bg-white' : 'w-2 bg-white/50'
            }`}
          />
        ))}
      </div>
    </section>
  );
}
