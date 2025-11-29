"use client";

import { useEffect, useState, use } from "react";
import { useWeb3 } from "@/hooks/useWeb3";
import { NeonButton } from "@/components/ui/NeonButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Clock, Trophy, ThumbsUp, ThumbsDown, Minus, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

// Types
type Phase = "OPEN" | "PHASE1_VOTING" | "PHASE2_PLAYER_VOTING" | "RESOLVED";

// Mock Data Generator
const getMockSession = (id: string) => ({
  id,
  creator: "0x123...creator",
  participants: ["0x1", "0x2", "0x3", "0x4", "0x5"],
  player1: "0xBob",
  player2: "0xAlice",
  phase: "OPEN" as Phase, // Default to OPEN for demo, will toggle
  totalPool: "0.0",
  phase1EndTime: Date.now() + 240000,
  phase2EndTime: Date.now() + 300000,
});

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { account, contract } = useWeb3();
  
  // State
  const [session, setSession] = useState(getMockSession(id));
  const [timeLeft, setTimeLeft] = useState<string>("00:00");
  const [selectedVote, setSelectedVote] = useState<"YES" | "NO" | "NEUTRAL" | "SUPER_YES" | "SUPER_NO" | null>(null);
  const [stakeAmount, setStakeAmount] = useState("0.5");
  
  // Simulation for demo purposes (Toggle phases)
  const cyclePhase = () => {
    const phases: Phase[] = ["OPEN", "PHASE1_VOTING", "PHASE2_PLAYER_VOTING", "RESOLVED"];
    const currentIndex = phases.indexOf(session.phase);
    const nextPhase = phases[(currentIndex + 1) % phases.length];
    setSession(prev => ({ ...prev, phase: nextPhase }));
  };

  // Timer Logic
  useEffect(() => {
    const timer = setInterval(() => {
      const target = session.phase === "PHASE1_VOTING" ? session.phase1EndTime : session.phase2EndTime;
      const diff = target - Date.now();
      if (diff <= 0) {
        setTimeLeft("00:00");
      } else {
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${m}:${s.toString().padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [session.phase, session.phase1EndTime, session.phase2EndTime]);

  // Actions
  const handleJoin = () => alert("Joined session!");
  const handleStart = () => {
    alert("Starting session...");
    setSession(prev => ({ ...prev, phase: "PHASE1_VOTING" }));
  };
  const handleVote = () => alert(`Voted ${selectedVote} with ${stakeAmount} MON`);
  const handlePlayerVote = (vote: boolean) => alert(`Player voted: ${vote ? "YES" : "NO"}`);
  const handleClaim = () => alert("Winnings claimed!");

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono text-muted-foreground">SESSION ID</span>
              <span className="text-xs font-mono bg-white/5 px-2 py-1 rounded">{id.slice(0,12)}...</span>
            </div>
            <h1 className="text-3xl font-bold neon-text-primary">Vibe Check Session</h1>
          </div>
          
          {/* Phase Indicator */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Current Phase</div>
              <div className={cn(
                "font-bold text-lg",
                session.phase === "OPEN" ? "text-green-400" :
                session.phase === "RESOLVED" ? "text-blue-400" : "text-yellow-400"
              )}>
                {session.phase.replace(/_/g, " ")}
              </div>
            </div>
            {/* Dev Tool: Cycle Phase */}
            <button onClick={cyclePhase} className="text-xs bg-white/10 px-2 py-1 rounded hover:bg-white/20">
              Dev: Next Phase
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Left Column: Stats & Info */}
          <div className="space-y-6">
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-muted-foreground">Total Pool</h3>
                <Trophy className="h-5 w-5 text-yellow-500" />
              </div>
              <div className="text-4xl font-mono font-bold text-white">{session.totalPool} <span className="text-lg text-primary">MON</span></div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-muted-foreground">Participants</h3>
                <Users className="h-5 w-5 text-blue-400" />
              </div>
              <div className="text-4xl font-mono font-bold text-white">{session.participants.length}</div>
              <div className="mt-4 space-y-2">
                {session.participants.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-white/60">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    {p}
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Right Column: Interactive Area */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Timer Banner (Only active phases) */}
            {(session.phase === "PHASE1_VOTING" || session.phase === "PHASE2_PLAYER_VOTING") && (
              <GlassCard className="bg-primary/10 border-primary/30 flex items-center justify-center gap-4 py-4">
                <Clock className="h-6 w-6 text-primary animate-pulse" />
                <span className="text-2xl font-mono font-bold">{timeLeft}</span>
                <span className="text-sm uppercase tracking-widest opacity-70">Time Remaining</span>
              </GlassCard>
            )}

            {/* PHASE 0: OPEN */}
            {session.phase === "OPEN" && (
              <GlassCard className="text-center py-12">
                <div className="mb-6">
                  <div className="mx-auto h-20 w-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <Users className="h-10 w-10 text-white/50" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Session is Open</h2>
                  <p className="text-muted-foreground">Waiting for participants to join...</p>
                </div>
                <div className="flex justify-center gap-4">
                  <NeonButton onClick={handleJoin} variant="secondary">Join Session</NeonButton>
                  <NeonButton onClick={handleStart}>Start Session (Creator)</NeonButton>
                </div>
              </GlassCard>
            )}

            {/* PHASE 1: AUDIENCE VOTING */}
            {session.phase === "PHASE1_VOTING" && (
              <div className="space-y-6">
                {/* Players Reveal */}
                <div className="grid grid-cols-2 gap-4">
                  <GlassCard className="text-center border-primary/50">
                    <div className="text-xs text-primary mb-2">PLAYER 1</div>
                    <div className="font-mono font-bold text-lg">{session.player1}</div>
                  </GlassCard>
                  <GlassCard className="text-center border-secondary/50">
                    <div className="text-xs text-secondary mb-2">PLAYER 2</div>
                    <div className="font-mono font-bold text-lg">{session.player2}</div>
                  </GlassCard>
                </div>

                {/* Voting Interface */}
                <GlassCard>
                  <h3 className="text-xl font-bold mb-6 text-center">Do they Vibe? Place your bet.</h3>
                  
                  <div className="grid grid-cols-3 gap-4 mb-8">
                    <button 
                      onClick={() => setSelectedVote("YES")}
                      className={cn("p-4 rounded-xl border transition-all flex flex-col items-center gap-2", 
                        selectedVote === "YES" ? "bg-green-500/20 border-green-500 text-green-400" : "bg-white/5 border-white/10 hover:bg-white/10"
                      )}
                    >
                      <ThumbsUp className="h-6 w-6" />
                      <span className="font-bold">YES</span>
                      <span className="text-xs opacity-70">They Vibe</span>
                    </button>

                    <button 
                      onClick={() => setSelectedVote("NEUTRAL")}
                      className={cn("p-4 rounded-xl border transition-all flex flex-col items-center gap-2", 
                        selectedVote === "NEUTRAL" ? "bg-gray-500/20 border-gray-500 text-gray-400" : "bg-white/5 border-white/10 hover:bg-white/10"
                      )}
                    >
                      <Minus className="h-6 w-6" />
                      <span className="font-bold">NEUTRAL</span>
                      <span className="text-xs opacity-70">Unsure</span>
                    </button>

                    <button 
                      onClick={() => setSelectedVote("NO")}
                      className={cn("p-4 rounded-xl border transition-all flex flex-col items-center gap-2", 
                        selectedVote === "NO" ? "bg-red-500/20 border-red-500 text-red-400" : "bg-white/5 border-white/10 hover:bg-white/10"
                      )}
                    >
                      <ThumbsDown className="h-6 w-6" />
                      <span className="font-bold">NO</span>
                      <span className="text-xs opacity-70">No Vibe</span>
                    </button>
                  </div>

                  {/* Super Bets */}
                  <div className="grid grid-cols-2 gap-4 mb-8">
                     <button 
                      onClick={() => setSelectedVote("SUPER_YES")}
                      className={cn("p-4 rounded-xl border transition-all flex flex-col items-center gap-2 relative overflow-hidden", 
                        selectedVote === "SUPER_YES" ? "bg-green-500/30 border-green-400 text-green-300" : "bg-white/5 border-white/10 hover:bg-white/10"
                      )}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                      <Crown className="h-5 w-5" />
                      <span className="font-bold">SUPER YES</span>
                      <span className="text-xs opacity-70">+15% Bonus</span>
                    </button>
                     <button 
                      onClick={() => setSelectedVote("SUPER_NO")}
                      className={cn("p-4 rounded-xl border transition-all flex flex-col items-center gap-2 relative overflow-hidden", 
                        selectedVote === "SUPER_NO" ? "bg-red-500/30 border-red-400 text-red-300" : "bg-white/5 border-white/10 hover:bg-white/10"
                      )}
                    >
                      <Crown className="h-5 w-5" />
                      <span className="font-bold">SUPER NO</span>
                      <span className="text-xs opacity-70">+15% Bonus</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-4 bg-black/40 p-4 rounded-lg mb-6">
                    <span className="text-sm text-muted-foreground">Stake Amount (MON):</span>
                    <input 
                      type="number" 
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      className="bg-transparent border-none text-right font-mono font-bold text-xl focus:ring-0 w-full"
                    />
                  </div>

                  <NeonButton onClick={handleVote} className="w-full h-12 text-lg">
                    Place Bet
                  </NeonButton>
                </GlassCard>
              </div>
            )}

            {/* PHASE 2: PLAYER VOTING */}
            {session.phase === "PHASE2_PLAYER_VOTING" && (
              <GlassCard className="text-center py-12 border-accent/50 bg-accent/5">
                <h2 className="text-3xl font-bold mb-2 neon-text-primary">Player Vibe Check</h2>
                <p className="text-muted-foreground mb-8">Only Player 1 and Player 2 can vote now.</p>
                
                <div className="flex justify-center gap-8">
                  <button 
                    onClick={() => handlePlayerVote(true)}
                    className="h-32 w-32 rounded-full bg-green-500/20 border-2 border-green-500 hover:bg-green-500/40 transition-all flex flex-col items-center justify-center gap-2 group"
                  >
                    <ThumbsUp className="h-10 w-10 text-green-400 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-green-400">WE VIBE</span>
                  </button>

                  <button 
                    onClick={() => handlePlayerVote(false)}
                    className="h-32 w-32 rounded-full bg-red-500/20 border-2 border-red-500 hover:bg-red-500/40 transition-all flex flex-col items-center justify-center gap-2 group"
                  >
                    <ThumbsDown className="h-10 w-10 text-red-400 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-red-400">NO VIBE</span>
                  </button>
                </div>
              </GlassCard>
            )}

            {/* PHASE 3: RESOLVED */}
            {session.phase === "RESOLVED" && (
              <GlassCard className="text-center py-12">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="mb-8"
                >
                  <h2 className="text-4xl font-black mb-4">RESULT: <span className="text-green-400">YES</span></h2>
                  <p className="text-xl text-muted-foreground">The vibes matched! 🎉</p>
                </motion.div>

                <div className="bg-white/5 p-6 rounded-xl mb-8 max-w-md mx-auto">
                  <div className="flex justify-between items-center mb-2">
                    <span>Your Bet</span>
                    <span className="font-bold text-green-400">SUPER YES</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span>Stake</span>
                    <span className="font-mono">1.5 MON</span>
                  </div>
                  <div className="h-px bg-white/10 my-4" />
                  <div className="flex justify-between items-center text-xl font-bold">
                    <span>Winnings</span>
                    <span className="text-primary">~2.8 MON</span>
                  </div>
                </div>

                <NeonButton onClick={handleClaim} className="h-14 px-12 text-xl">
                  Claim Winnings
                </NeonButton>
              </GlassCard>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
