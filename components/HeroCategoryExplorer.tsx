'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ArrowRight, ChevronRight, Clock, Lock, CheckCircle2 } from 'lucide-react';

interface HeroCategoryExplorerProps {
  selectedGame: string;
  onSelectGame: (gameSlug: string) => void;
}

const mainFranchises = [
  {
    slug: 'pokemon',
    name: 'Pokémon',
    badge: 'Pokémon',
    badgeIcon: '🔴',
    desc: 'การ์ดโปเกมอนสุดพิเศษ จากทุกยุคทุกสมัย',
    image: '/images/franchises/pokemon-banner.jpg',
    hoverBorder: 'hover:border-amber-400/80 hover:shadow-amber-500/20',
  },
  {
    slug: 'onepiece',
    name: 'One Piece',
    badge: 'One Piece',
    badgeIcon: '🏴‍☠️',
    desc: 'การ์ดวันพีซ จากโลกแห่งโจรสลัด',
    image: '/images/franchises/onepiece-banner.jpg',
    hoverBorder: 'hover:border-red-500/80 hover:shadow-red-500/20',
  },
  {
    slug: 'yugioh',
    name: 'Yu-Gi-Oh!',
    badge: 'Yu-Gi-Oh!',
    badgeIcon: '🧙',
    desc: 'การ์ดยูกิสุดคลาสสิก ที่แฟนการ์ดต้องมี',
    image: '/images/franchises/yugioh-banner.jpg',
    hoverBorder: 'hover:border-purple-500/80 hover:shadow-purple-500/20',
  },
];

const comingSoonFranchises = [
  {
    name: 'Dragon Ball',
    image: '/images/franchises/dragonball.jpg',
  },
  {
    name: 'Magic: The Gathering',
    image: '/images/franchises/magic.jpg',
  },
  {
    name: 'Digimon',
    image: '/images/franchises/digimon.jpg',
  },
  {
    name: 'Cardfight!! Vanguard',
    image: '/images/franchises/vanguard.jpg',
  },
  {
    name: 'Weiss Schwarz',
    image: '/images/franchises/weissschwarz.jpg',
  },
];

export default function HeroCategoryExplorer({
  selectedGame,
  onSelectGame,
}: HeroCategoryExplorerProps) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleComingSoonClick = (name: string) => {
    setToastMessage(`หมวดหมู่ ${name} กำลังจะเปิดให้บริการเร็วๆ นี้ (Coming Soon) ⏳`);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleSelectGame = (slug: string) => {
    onSelectGame(slug);
    const targetElement = document.getElementById('card-listings-section');
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section id="hero-categories" className="relative w-full pt-2 pb-10 text-white select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#160f2e]/95 border border-purple-500/50 text-white px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <Clock className="w-5 h-5 text-amber-400 shrink-0 animate-spin" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Hero Header Area: Headline + Characters */}
      <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4 min-h-[140px] lg:min-h-[170px] mb-6 overflow-hidden">
        {/* Left Column: Titles */}
        <div className="z-10 max-w-xl py-2">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-white drop-shadow-md">
            เลือกหมวดหมู่ที่
            <span className="bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent">
              คุณสนใจ
            </span>
          </h1>

          <p className="text-purple-200/80 text-sm sm:text-base font-normal mt-2.5">
            ค้นหาการ์ดจากแฟรนไชส์ยอดนิยมได้ที่นี่
          </p>

          <div className="flex items-center gap-3 mt-3">
            <div className="w-12 h-1 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full shadow-sm shadow-purple-500/50" />
            {selectedGame !== 'all' && (
              <button
                onClick={() => onSelectGame('all')}
                className="text-xs text-purple-300 hover:text-white underline font-semibold transition cursor-pointer"
              >
                ล้างการเลือก (แสดงทุกเกม)
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Characters Background Art (Pikachu, Luffy, Yami Yugi) */}
        <div className="absolute right-0 top-0 bottom-0 w-full md:w-[58%] lg:w-[50%] pointer-events-none opacity-85 md:opacity-95 overflow-hidden">
          <div className="relative w-full h-full">
            <Image
              src="/images/franchises/hero-characters.jpg"
              alt="Popular TCG Characters"
              fill
              priority
              className="object-cover object-right"
            />
            {/* Soft Radial and Left Gradients to Blend Seamlessly */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#090715] via-[#090715]/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#090715] via-transparent to-[#090715]/30" />
          </div>
        </div>
      </div>

      {/* 3 Main Featured Cards: Pokémon, One Piece, Yu-Gi-Oh! */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        {mainFranchises.map((item) => {
          const isSelected = selectedGame === item.slug;

          return (
            <div
              key={item.slug}
              onClick={() => handleSelectGame(item.slug)}
              className={`group relative h-60 sm:h-64 lg:h-72 rounded-3xl overflow-hidden border transition-all duration-300 cursor-pointer shadow-xl ${
                isSelected
                  ? 'border-purple-400 ring-2 ring-purple-500/80 shadow-purple-500/30 scale-[1.02]'
                  : `border-purple-900/40 bg-[#130f28] ${item.hoverBorder} hover:shadow-2xl`
              }`}
            >
              {/* Card Background Image */}
              <Image
                src={item.image}
                alt={item.name}
                fill
                className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
              />

              {/* Shading Gradient for Readable Typography */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent group-hover:via-black/35 transition-colors" />

              {/* Top-Left Category Badge */}
              <div className="absolute top-4 left-4 z-10">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-xs font-bold text-white shadow-md">
                  <span>{item.badgeIcon}</span>
                  <span>{item.badge}</span>
                </span>
              </div>

              {/* Top-Right Active Indicator */}
              {isSelected && (
                <div className="absolute top-4 right-4 z-10">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-600 text-white text-xs font-bold shadow-lg shadow-purple-600/50">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>กำลังเลือก</span>
                  </span>
                </div>
              )}

              {/* Bottom Info: Title, Subtitle & Action Button */}
              <div className="absolute bottom-0 inset-x-0 p-5 lg:p-6 z-10 flex flex-col justify-end">
                <h2 className="text-2xl lg:text-3xl font-black text-white tracking-wide drop-shadow-md">
                  {item.name}
                </h2>
                <p className="text-gray-200 text-xs sm:text-sm mt-1.5 font-medium leading-relaxed drop-shadow">
                  {item.desc}
                </p>

                <div className="mt-4">
                  <span
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold text-white transition-all duration-200 shadow-md ${
                      isSelected
                        ? 'bg-purple-600 shadow-purple-600/50'
                        : 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/50 group-hover:gap-3'
                    }`}
                  >
                    <span>ดูหมวดหมู่</span>
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lower Row: หมวดหมู่เพิ่มเติม (Coming Soon) */}
      <div className="mt-8 pt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-4 bg-purple-500 rounded-sm -skew-x-12 shadow-sm shadow-purple-500" />
            <h3 className="text-base sm:text-lg font-bold text-white">หมวดหมู่เพิ่มเติม</h3>
          </div>

          <div className="flex items-center gap-1 text-xs font-bold text-purple-400">
            <span>เร็วๆ นี้ (Coming Soon)</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* 5 Franchises Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {comingSoonFranchises.map((item) => (
            <div
              key={item.name}
              onClick={() => handleComingSoonClick(item.name)}
              className="group relative h-16 rounded-2xl overflow-hidden border border-purple-900/40 bg-[#120e26] hover:border-purple-600/60 transition-all duration-200 cursor-pointer flex items-center p-3 shadow-md"
              title={`${item.name} - เร็วๆ นี้`}
            >
              {/* Background Art Thumbnail */}
              <Image
                src={item.image}
                alt={item.name}
                fill
                className="object-cover object-center opacity-40 group-hover:opacity-60 group-hover:scale-105 transition-all duration-300 filter grayscale-[15%]"
              />

              <div className="absolute inset-0 bg-gradient-to-r from-[#0c091f]/95 via-[#0c091f]/75 to-transparent" />

              {/* Title & Coming Soon Pill */}
              <div className="relative z-10 flex-1 min-w-0 pr-2">
                <div className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-purple-300 transition-colors">
                  {item.name}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-amber-300 font-extrabold bg-amber-950/70 border border-amber-500/30 px-1.5 py-0.2 rounded-md">
                    Coming Soon
                  </span>
                </div>
              </div>

              {/* Lock Indicator */}
              <div className="relative z-10 w-7 h-7 rounded-xl bg-purple-950/80 border border-purple-800/60 flex items-center justify-center shrink-0 text-purple-300 group-hover:text-amber-300 group-hover:border-amber-500/50 transition-colors">
                <Lock className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
