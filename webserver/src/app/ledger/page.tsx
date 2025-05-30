"use client";
import { useEffect, useState } from "react";
import { ethers, InterfaceAbi } from "ethers";

// Dynamic pirates list from contract
// type Pirate = { name: string; address: string };

const CONTRACT_ABI: InterfaceAbi = [
  {
    inputs: [
      { internalType: "address", name: "pirate", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "recordHaul",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "round",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "piratesYetToReport",
    outputs: [
      { internalType: "address[]", name: "", type: "address[]" },
      { internalType: "string[]", name: "", type: "string[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "hoistTheColors",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "generateChart",
    outputs: [{ internalType: "bytes", name: "png", type: "bytes" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "generateChart",
    outputs: [{ internalType: "bytes", name: "", type: "bytes" }],
    stateMutability: "view",
    type: "function",
  },
];

const ONCHAIN_GRAPH = process.env.NEXT_PUBLIC_ONCHAIN_GRAPH === "true";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PIRATE_CONTRACT_ADDRESS || "";
const RPC_URL =
  process.env.NEXT_PUBLIC_PIRATE_RPC_URL || "http://localhost:8545";
const PIRATE_PRIVATE_KEY = process.env.NEXT_PUBLIC_PIRATE_PRIVATE_KEY || "";

export default function Home() {
  const [selectedPirate, setSelectedPirate] = useState("");
  const [lootAmount, setLootAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentRound, setCurrentRound] = useState<number>(0);
  const [missingPirates, setMissingPirates] = useState<
    { address: string; name: string }[]
  >([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [chartPng, setChartPng] = useState<string | null>(null);

  // Fetch round and missing pirates
  const fetchRoundInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        provider
      );
      const round: ethers.BigNumberish = await contract.round();
      setCurrentRound(Number(round));
      const [missingAddrs, missingNames]: [string[], string[]] =
        await contract.piratesYetToReport();
      const missing = missingAddrs.map((address, i) => ({
        address,
        name: missingNames[i],
      }));
      setMissingPirates(missing);
    } catch {
      setError("Failed to fetch round info.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRoundInfo();
  }, []);

  useEffect(() => {
    if (missingPirates.length > 0) {
      setSelectedPirate(missingPirates[0].address);
    } else {
      setSelectedPirate("");
    }
  }, [missingPirates]);

  // Call generateChart and fetch PNG
  const fetchOnchainChart = async () => {
    try {
      if (!PIRATE_PRIVATE_KEY) throw new Error("Private key not set");
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const wallet = new ethers.Wallet(PIRATE_PRIVATE_KEY, provider);
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        wallet
      );
      const pngBytes = await contract.generateChart();
      let actualPng;
      if (typeof pngBytes === "string" && pngBytes.startsWith("0x")) {
        // Remove '0x' and convert hex to Uint8Array
        const hex = pngBytes.slice(2);
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < bytes.length; i++) {
          bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
        }
        actualPng = bytes; // Use as-is, do not subarray(64)
      } else if (pngBytes instanceof Uint8Array) {
        actualPng = pngBytes;
      } else if (Array.isArray(pngBytes)) {
        actualPng = Uint8Array.from(pngBytes);
      } else {
        throw new Error("Unknown PNG bytes format");
      }
      const blob = new Blob([actualPng], { type: "image/png" });
      // Check PNG header
      if (actualPng[0] !== 0x89) {
        throw new Error("PNG header is NOT correct");
      }
      const url = URL.createObjectURL(blob);
      setChartPng(url);
      setTimeout(() => {}, 1000);
    } catch {
      setChartPng(null);
    }
  };

  // When all pirates have reported, fetch the chart if ONCHAIN_GRAPH
  useEffect(() => {
    if (ONCHAIN_GRAPH && missingPirates.length === 0) {
      fetchOnchainChart();
    } else {
      setChartPng(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missingPirates.length, ONCHAIN_GRAPH]);

  // Handle loot submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      if (!PIRATE_PRIVATE_KEY) throw new Error("Private key not set");
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const wallet = new ethers.Wallet(PIRATE_PRIVATE_KEY, provider);
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        wallet
      );
      const pirate = missingPirates.find((p) => p.address === selectedPirate);
      if (!pirate) throw new Error("Pirate not found");
      const tx = await contract.recordHaul(
        selectedPirate,
        ethers.parseEther(lootAmount)
      );
      await tx.wait();
      setLootAmount("");
      setSuccess("Loot submitted!");
      fetchRoundInfo();
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to report loot.");
    }
    setSubmitting(false);
  };

  // Handle new round
  const handleNewRound = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (!PIRATE_PRIVATE_KEY) throw new Error("Private key not set");
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const wallet = new ethers.Wallet(PIRATE_PRIVATE_KEY, provider);
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        wallet
      );
      const tx = await contract.hoistTheColors();
      await tx.wait();
      setSuccess("A new round has begun!");
      fetchRoundInfo();
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to start new round.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-100 to-blue-200 flex flex-col items-center py-10 font-serif">
      <h1 className="text-4xl font-bold mb-2 text-yellow-900 drop-shadow pirate-font">
        🏴‍☠️ Pirate Loot Ledger 🏴‍☠️
      </h1>
      <p className="mb-8 text-lg text-yellow-800 italic">
        Record yer loot, avoid the seas!
      </p>
      <div className="mb-4 text-xl pirate-font text-yellow-900">
        <span>
          Days at sea: <span className="font-bold">{currentRound}</span>
        </span>
      </div>
      {missingPirates.length === 0 ? (
        ONCHAIN_GRAPH ? (
          <div className="flex flex-col items-center w-full max-w-md">
            {chartPng ? (
              <img
                src={chartPng}
                alt="On-chain Pirate Loot Chart"
                className="w-full max-w-lg rounded-lg border-4 border-yellow-700 pirate-border mb-4"
                style={{ background: "#fff" }}
              />
            ) : (
              <>
                <div className="text-yellow-900 pirate-font text-xl">
                  Loading on-chain chart...
                </div>
                {/* Fallback test image for debugging */}
                <img
                  src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PkQnNwAAAABJRU5ErkJggg=="
                  alt="Test PNG"
                  style={{ width: 64, height: 64, marginTop: 16 }}
                />
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center w-full max-w-md">
            <a
              href="/charter"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full block text-center bg-green-700 text-white text-2xl font-bold py-8 rounded-lg shadow-lg border-4 border-green-900 pirate-btn hover:bg-green-800 transition mb-8"
              style={{ letterSpacing: "2px", fontSize: "2rem" }}
            >
              🏴‍☠️ Call the Charter 🏴‍☠️
            </a>
          </div>
        )
      ) : (
        <>
          <form
            onSubmit={handleSubmit}
            className="bg-white/80 rounded-lg shadow-lg p-6 flex flex-col gap-4 w-full max-w-md border-4 border-yellow-700 pirate-border"
          >
            <label className="font-bold text-yellow-900">Who are ye:</label>
            <select
              className="p-2 rounded border-2 border-yellow-700 bg-yellow-50 focus:outline-none pirate-border"
              value={selectedPirate}
              onChange={(e) => setSelectedPirate(e.target.value)}
            >
              {missingPirates.map((pirate) => (
                <option key={pirate.address} value={pirate.address}>
                  {pirate.name} ({pirate.address.slice(0, 6)}...
                  {pirate.address.slice(-4)})
                </option>
              ))}
            </select>
            <label className="font-bold text-yellow-900">
              How much loot do ye bring today?
            </label>
            <input
              type="number"
              min="0"
              step="any"
              className="p-2 rounded border-2 border-yellow-700 bg-yellow-50 focus:outline-none pirate-border"
              value={lootAmount}
              onChange={(e) => setLootAmount(e.target.value)}
              placeholder="Loot value in Pieces of Eight (PO8)"
              required
            />
            <button
              type="submit"
              className="bg-yellow-700 text-white font-bold py-2 rounded shadow pirate-btn hover:bg-yellow-800 transition"
              disabled={
                submitting ||
                !lootAmount ||
                loading ||
                missingPirates.length === 0 ||
                !selectedPirate
              }
            >
              {submitting ? "Reporting..." : "Report Loot (PO8)"}
            </button>
            {error && <div className="text-red-700 font-bold">{error}</div>}
            {success && (
              <div className="text-green-700 font-bold">{success}</div>
            )}
          </form>
          <div className="mt-8 w-full max-w-md bg-white/80 rounded-lg shadow-lg p-6 border-4 border-yellow-700 pirate-border">
            <h2 className="text-xl font-bold text-yellow-900 pirate-font mb-2">
              Pirates Yet to Report
            </h2>
            {missingPirates.length === 0 ? (
              <div className="text-green-800 pirate-font">
                All pirates have reported for this round!
              </div>
            ) : (
              <ul className="list-disc pl-6">
                {missingPirates.map((pirate) => (
                  <li
                    key={pirate.address}
                    className="text-yellow-900 pirate-font"
                  >
                    {pirate.name} ({pirate.address.slice(0, 6)}...
                    {pirate.address.slice(-4)})
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
      <button
        onClick={handleNewRound}
        className="mt-16 bg-blue-700 text-white font-bold py-2 px-6 rounded pirate-btn hover:bg-blue-800 transition disabled:opacity-50"
        disabled={loading || missingPirates.length > 0}
      >
        Set Sail!
      </button>
      <style jsx global>{`
        .pirate-font {
          font-family: "Pirata One", cursive, serif;
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
      <link
        href="https://fonts.googleapis.com/css2?family=Pirata+One&display=swap"
        rel="stylesheet"
      />
    </div>
  );
}
