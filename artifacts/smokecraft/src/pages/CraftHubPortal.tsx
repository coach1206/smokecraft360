import { useState } from 'react';

const sidebarItems = ['Cellar', 'Humidor', 'Lounge', 'Concierge', 'History', 'Settings'] as const;
const cards = [
  { title: 'SmokeCraft 360', subtitle: 'Build the profile. Match the pour. Guide the moment.', image: '/images/scenes/smokecraft-card.jpg', route: '/smokecraft' },
  { title: 'WineCraft 360', subtitle: 'Taste, pair, and recommend with confidence.', image: '/images/scenes/craft-hub.jpg', route: '/winecraft' },
  { title: 'PourCraft 360', subtitle: 'Guide cocktails, bourbon, whiskey, and premium pours.', image: '/images/pour-1.jpg', route: '/pourcraft' },
  { title: 'BeerCraft 360', subtitle: 'Match flavor, mood, and menu with the right beer.', image: '/images/scenes/brewcraft-card.jpg', route: '/beercraft' },
] as const;

export default function CraftHubPortal() {
  const [active, setActive] = useState<(typeof sidebarItems)[number]>('Cellar');

  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1] font-[Inter]">
      <div className="flex min-h-screen">
        <aside className="w-72 border-r border-[#50453b] bg-[#1c1b1b] p-4">
          <h2 className="font-serif text-2xl text-[#ffb95a] mb-4">The Curator</h2>
          <nav className="space-y-2">
            {sidebarItems.map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setActive(item)} className={`block rounded-xl px-4 py-3 transition ${active === item ? 'bg-[#8c6239] text-[#ffe8d7]' : 'bg-transparent text-[#d4c3b7] hover:bg-[#353534]'}`}>
                {item}
              </a>
            ))}
          </nav>
          <button onClick={() => alert('Staff has been notified.')} className="mt-6 w-full rounded-xl bg-[#f1bc8c] px-4 py-3 text-[#492905] font-semibold uppercase tracking-wider">Summon Staff</button>
        </aside>

        <main className="flex-1 p-8">
          <h1 className="text-5xl font-serif mb-2">Welcome to Craft Hub</h1>
          <p className="text-[#d4c3b7] mb-8">Craft the experience. Guide the moment. Elevate the room.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cards.map(card => (
              <a key={card.title} href={card.route} className="group relative h-72 overflow-hidden rounded-2xl border border-[#50453b] bg-[#201f1f]">
                <img src={card.image} alt={card.title} className="absolute inset-0 h-full w-full object-cover opacity-60 transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-0 p-6">
                  <h3 className="text-3xl font-serif">{card.title}</h3>
                  <p className="text-[#d4c3b7]">{card.subtitle}</p>
                </div>
              </a>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
