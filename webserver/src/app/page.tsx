"use client";
import { useState } from "react";
import Image from "next/image";

export default function Home() {
  // List of images to showcase
  const images = [
    {
      src: "/assets/opening.png",
      caption: "Blackbeard and the council of captains"
    },
    {
      src: "/assets/council.png",
      caption: "The council with the accountant"
    },
    {
      src: "/assets/charter.png",
      caption: "The accountant meets the Charter"
    },
    // Add more images here as needed
  ];

  const [current, setCurrent] = useState(0);

  const prev = () => setCurrent((c) => (c === 0 ? images.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === images.length - 1 ? 0 : c + 1));

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-100 to-blue-200 flex flex-col items-center py-10 font-serif">
      <h1 className="text-4xl font-bold mb-2 text-yellow-900 drop-shadow pirate-font">🏴‍☠️ The Council of Pirates 🏴‍☠️</h1>

      <div className="flex flex-col items-center w-full px-4 mt-12">
        <div className="relative flex flex-col items-center max-w-lg w-full mx-auto">
          <Image
            src={images[current].src}
            alt={images[current].caption}
            width={800}
            height={600}
            className="rounded pirate-border mb-4 bg-white"
            style={{ objectFit: "contain", background: "#fff", maxHeight: 600, maxWidth: "100%" }}
            priority
          />
          <div className="text-yellow-900 pirate-font text-2xl mt-2 text-center w-full">
            {images[current].caption}
          </div>
          {/* Carousel controls below image */}
          <div className="flex flex-row justify-center w-full mt-2 mb-2 px-2 py-10">
            <button
              onClick={prev}
              className="bg-yellow-700 text-white pirate-font px-6 py-2 rounded-lg border-2 border-yellow-900 hover:bg-yellow-800 transition font-bold"
              aria-label="Previous image"
            >
              🏴‍☠️ Prev
            </button>
            <button
              onClick={next}
              className="bg-yellow-700 text-white pirate-font px-6 py-2 rounded-lg border-2 border-yellow-900 hover:bg-yellow-800 transition font-bold"
              aria-label="Next image"
            >
              Next 🏴‍☠️
            </button>
          </div>
        </div>
      </div>
      <a
        href="/ledger"
        className="mt-16 bg-blue-700 text-white pirate-font text-2xl font-bold py-4 px-12 rounded-lg shadow-lg border-4 border-blue-900 pirate-btn hover:bg-blue-800 transition"
        style={{ letterSpacing: '2px' }}
      >
        ⚓️ Go to the Ledger
      </a>
      <style jsx global>{`
        .pirate-font {
          font-family: 'Pirata One', cursive, serif;
          letter-spacing: 1px;
        }
        .pirate-border {
          box-shadow: 0 0 0 4px #b7791f, 0 2px 8px #0003;
        }
        .pirate-btn {
          border: 2px solid #b7791f;
        }
      `}</style>
      {/* Google Fonts for pirate style */}
      <link href="https://fonts.googleapis.com/css2?family=Pirata+One&display=swap" rel="stylesheet" />
    </div>
  );
} 