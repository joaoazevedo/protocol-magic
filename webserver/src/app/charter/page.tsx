"use client";
import { useEffect, useState } from "react";
import { ethers, InterfaceAbi } from "ethers";
import Image from "next/image";
import closedPng from "../../../public/assets/closed.png";

type PirateRecord = {
  name: string;
  pirate: string;
  loot: string;
};

const CONTRACT_ABI: InterfaceAbi = [
  {
    inputs: [],
    name: "getLootTotals",
    outputs: [
      {
        components: [
          { internalType: "string", name: "name", type: "string" },
          { internalType: "address", name: "pirate", type: "address" },
          { internalType: "uint256", name: "loot", type: "uint256" },
        ],
        internalType: "struct PirateCouncil.PirateRecord[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PIRATE_CONTRACT_ADDRESS || "";
const RPC_URL = process.env.NEXT_PUBLIC_PIRATE_RPC_URL || "http://localhost:8545";
const CHARTER_ON = process.env.NEXT_PUBLIC_CHARTER_ON !== "false";

export default function CharterPage() {
  const [lootData, setLootData] = useState<PirateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!CHARTER_ON) return;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          CONTRACT_ABI,
          provider
        );
        const loot: PirateRecord[] = await contract.getLootTotals();
        setLootData(loot);
      } catch {
        setError("Failed to fetch loot totals.");
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  if (!CHARTER_ON) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-yellow-100 to-blue-200 pirate-font">
        <Image
          src={closedPng}
          alt="Charter Closed"
          width={400}
          height={400}
          className="mb-8 rounded-lg border-4 border-yellow-700 pirate-border"
        />
        <h1 className="text-4xl font-bold text-yellow-900 mb-4 pirate-font">
          The Charter is Closed!
        </h1>
        <p className="text-lg text-yellow-800">
          Return when the council opens the charter for all pirates to see the
          loot!
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center py-10 bg-gradient-to-b from-yellow-100 to-blue-200 pirate-font">
      <h1 className="text-4xl font-bold mb-8 text-yellow-900 pirate-font drop-shadow">
        🏴‍☠️ The Pirate Charter 🏴‍☠️
      </h1>
      {loading ? (
        <div className="text-yellow-900 text-xl">Loading the loot chart...</div>
      ) : error ? (
        <div className="text-red-700 font-bold">{error}</div>
      ) : (
        <div className="w-full max-w-2xl bg-white/80 rounded-lg shadow-lg p-8 border-4 border-yellow-700 pirate-border">
          <h2 className="text-2xl font-bold mb-6 text-yellow-900 pirate-font">
            Total Loot by Pirate
          </h2>
          <BarChart lootData={lootData} />
        </div>
      )}
      <style jsx global>{`
        .pirate-font {
          font-family: "Pirata One", cursive, serif;
          letter-spacing: 1px;
        }
        .pirate-border {
          box-shadow: 0 0 0 4px #b7791f, 0 2px 8px #0003;
        }
      `}</style>
      <link
        href="https://fonts.googleapis.com/css2?family=Pirata+One&display=swap"
        rel="stylesheet"
      />
    </div>
  );
}

function BarChart({ lootData }: { lootData: PirateRecord[] }) {
  if (!lootData || lootData.length === 0) {
    return <div className="text-yellow-900">No loot to display yet!</div>;
  }
  // Find the max loot for scaling
  const maxLoot = Math.max(...lootData.map((p) => Number(p.loot)));
  return (
    <div className="flex flex-row items-end justify-center gap-8 h-64 w-full">
      {lootData.map((pirate) => {
        const loot = Number(pirate.loot);
        const barHeight = `${(loot / (maxLoot || 1)) * 100}%`;
        return (
          <div key={pirate.pirate} className="flex flex-col items-center w-24">
            {/* Loot value above the bar */}
            <span className="mb-2 text-yellow-900 font-bold pirate-font drop-shadow">
              {loot / 1e18} PO8
            </span>
            {/* Bar */}
            <div className="relative flex items-end w-full h-48">
              <div
                className="bg-yellow-700 pirate-border w-full rounded-t-lg transition-all duration-500 flex items-end justify-center"
                style={{ height: barHeight, minHeight: 8 }}
              ></div>
            </div>
            {/* Pirate name below the bar */}
            <span className="mt-2 text-center font-bold text-yellow-900 pirate-font truncate w-full">
              {pirate.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
