"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/hooks/useWeb3";
import { NeonButton } from "@/components/ui/NeonButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { motion } from "framer-motion";
import { Plus, Users, Zap, ArrowRight, Wallet } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

import { BackgroundAnimation } from "@/components/ui/BackgroundAnimation";

export default function Home() {
  const { account, connectWallet, contract, getAllSessions } = useWeb3();
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const fetchSessions = async () => {
    if (contract) {
      const _sessions = await getAllSessions();
      setSessions(_sessions);
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [contract]);

  const handleCreateSession = async () => {
    if (!contract) return alert("Connect wallet first!");
    try {
      setIsLoading(true);
      const tx = await contract.createSession();
      const receipt = await tx.wait();

      // Find the SessionCreated event to get the new ID
      // This depends on how the receipt logs are parsed, but usually we can just refresh
      alert("Session created! Refreshing...");
      fetchSessions();

      // Ideally redirect to the new session, but we need the ID.
      // For now just refresh list.
    } catch (e) {
      console.error(e);
      alert("Failed to create session");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-background to-background relative overflow-hidden">
      <BackgroundAnimation />
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-background/50 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary animate-pulse" />
            <span className="text-xl font-bold tracking-tighter neon-text-primary">VibeFi</span>
          </div>
          <div>
            {account ? (
              <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                {account.slice(0, 6)}...{account.slice(-4)}
              </div>
            ) : (
              <NeonButton variant="ghost" onClick={connectWallet} className="h-9 px-4 text-sm">
                <Wallet className="mr-2 h-4 w-4" />
                Connect Wallet
              </NeonButton>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 relative z-10">
        {/* Hero */}
        <section className="mb-16 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 text-5xl font-black tracking-tight sm:text-7xl"
          >
            Check the <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Vibe</span>. <br />
            Win the <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">Pool</span>.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground"
          >
            The ultimate prediction market for human connection. Join a session, bet on the vibe, and let the players decide.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <NeonButton onClick={handleCreateSession} isLoading={isLoading} className="h-12 px-8 text-lg">
              <Plus className="mr-2 h-5 w-5" />
              Create New Session
            </NeonButton>
          </motion.div>
        </section>

        {/* Active Sessions */}
        <section>
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Active Sessions</h2>
            <div className="text-sm text-muted-foreground">Live on Monad Testnet</div>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No active sessions found. Create one to get started!
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {sessions.map((session, i) => (
                <Link href={`/session/${session.id}`} key={i} className="block group">
                  <GlassCard hoverEffect className="h-full relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Zap className="h-24 w-24 text-primary" />
                    </div>

                    <div className="relative z-10">
                      <div className="mb-4 flex items-center justify-between">
                        <span className={cn(
                          "rounded-full px-2 py-1 text-xs font-bold uppercase tracking-wider",
                          session.phase === "OPEN" ? "bg-green-500/20 text-green-400" :
                            session.phase === "PHASE1_VOTING" ? "bg-yellow-500/20 text-yellow-400" :
                              "bg-blue-500/20 text-blue-400"
                        )}>
                          {session.phase.replace("_", " ")}
                        </span>
                        <span className="text-xs text-muted-foreground">{session.id.slice(0, 8)}...</span>
                      </div>

                      <div className="mb-6 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Users className="h-4 w-4" /> Participants
                          </span>
                          <span className="font-mono font-bold">{session.participants.length}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Total Pool</span>
                          <span className="font-mono font-bold text-accent">{session.totalPool} MON</span>
                        </div>
                      </div>

                      <div className="flex items-center text-primary font-medium text-sm group-hover:translate-x-1 transition-transform">
                        Enter Session <ArrowRight className="ml-1 h-4 w-4" />
                      </div>
                    </div>
                  </GlassCard>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
