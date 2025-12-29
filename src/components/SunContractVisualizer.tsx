import React, { useState, useRef, useEffect } from "react";
import { SunContract, SunContractAgent } from "../cards/sunContract";

interface SunContractVisualizerProps {
  sourceStrength?: number;
}

export default function SunContractVisualizer({ sourceStrength = 5 }: SunContractVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contractRef = useRef(new SunContract(sourceStrength));
  const [agents, setAgents] = useState<Record<string, SunContractAgent>>({});
  const [stats, setStats] = useState({
    fieldEnergy: 0,
    totalViolations: 0,
    zeta: [1, 0, 0],
  });
  const [isRunning, setIsRunning] = useState(false);

  // Create sample agents
  useEffect(() => {
    const contract = contractRef.current;

    const agentA: SunContractAgent = {
      id: "Agent A (Safe)",
      capMax: 0.4,
      capCurrent: 0.4,
      processingCapacity: 0.3,
      ramping: 0.1,
      doseBudget: 20,
      exposure: 0.5,
      exposureRampRate: 0.05,
    };

    const agentB: SunContractAgent = {
      id: "Agent B (Risky)",
      capMax: 1.0,
      capCurrent: 1.0,
      processingCapacity: 0.1,
      ramping: 0.5,
      doseBudget: 5,
      exposure: 0.8,
      exposureRampRate: 0.3,
    };

    contract.couple(agentA);
    contract.couple(agentB);
    setAgents({ [agentA.id]: agentA, [agentB.id]: agentB });
  }, []);

  // Animation loop
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      const contract = contractRef.current;
      contract.step(0.016);

      setStats({
        fieldEnergy: contract.state.fieldEnergy,
        totalViolations: contract.state.violations.length,
        zeta: [...contract.zeta],
      });

      // Draw visualization
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = "#0a0e27";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw source (sun)
      const sunX = 50,
        sunY = 50;
      ctx.fillStyle = "#ffb700";
      ctx.beginPath();
      ctx.arc(sunX, sunY, Math.min(30, 10 + contract.state.sourceStrength * 10), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "11px monospace";
      ctx.fillText(`Source: ${contract.state.sourceStrength.toFixed(2)}`, sunX + 50, sunY);

      // Draw field energy (central pool)
      const poolX = 250,
        poolY = 100;
      ctx.fillStyle = "rgba(100, 200, 255, 0.3)";
      ctx.fillRect(poolX - 40, poolY - 20, 80, 40);
      ctx.fillStyle = "#64c8ff";
      ctx.fillText(`Field: ${contract.state.fieldEnergy.toFixed(2)}`, poolX - 30, poolY - 30);

      // Draw agents and their intake
      let agentY = 180;
      for (const agentId in contract.state.agents) {
        const agent = contract.state.agents[agentId];
        const intake = contract.state.agentIntake[agentId] ?? 0;
        const dose = contract.state.agentDose[agentId] ?? 0;
        const doseRatio = dose / agent.doseBudget;

        // Agent box
        const boxX = 100,
          boxW = 250;
        const boxColor =
          doseRatio > 0.9 ? "rgba(255,50,50,0.2)" : doseRatio > 0.6 ? "rgba(255,150,50,0.2)" : "rgba(100,200,100,0.2)";
        ctx.fillStyle = boxColor;
        ctx.fillRect(boxX, agentY, boxW, 60);

        // Agent label
        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px monospace";
        ctx.fillText(agentId, boxX + 10, agentY + 18);

        // Intake bar
        ctx.fillStyle = "#4caf50";
        ctx.fillRect(boxX + 10, agentY + 30, Math.max(1, intake * 100), 8);
        ctx.fillStyle = "#999";
        ctx.fillRect(boxX + 10 + intake * 100, agentY + 30, (agent.capCurrent - intake) * 100, 8);
        ctx.strokeStyle = "#fff";
        ctx.strokeRect(boxX + 10, agentY + 30, agent.capCurrent * 100, 8);
        ctx.fillStyle = "#ccc";
        ctx.font = "10px monospace";
        ctx.fillText(`cap: ${agent.capCurrent.toFixed(2)}`, boxX + 160, agentY + 36);

        // Dose bar
        ctx.fillStyle = doseRatio > 0.9 ? "#ff6b6b" : "#ffa726";
        ctx.fillRect(boxX + 10, agentY + 42, Math.max(1, doseRatio * 100), 8);
        ctx.strokeStyle = "#fff";
        ctx.strokeRect(boxX + 10, agentY + 42, 100, 8);
        ctx.fillStyle = "#ccc";
        ctx.fillText(`dose: ${dose.toFixed(2)} / ${agent.doseBudget.toFixed(2)}`, boxX + 160, agentY + 48);

        agentY += 80;
      }

      // Draw violations count
      ctx.fillStyle = contract.state.violations.length > 0 ? "#ff6b6b" : "#4caf50";
      ctx.font = "bold 14px monospace";
      ctx.fillText(`Violations: ${contract.state.violations.length}`, 100, canvas.height - 30);

      // Draw zeta health
      ctx.fillStyle = "#64c8ff";
      ctx.fillText(`Zeta Health: ${contract.zeta[0].toFixed(3)}`, 400, canvas.height - 30);
    }, 50);

    return () => clearInterval(interval);
  }, [isRunning]);

  return (
    <div style={{ padding: "20px", fontFamily: "monospace" }}>
      <h2 style={{ color: "#fff", marginBottom: "12px" }}>Sun Contract Visualizer</h2>
      <p style={{ color: "#bbb", marginBottom: "20px", maxWidth: "600px" }}>
        The contract offers unlimited energy (the "sun"). Two agents couple to it with different safety budgets.
        Watch how intake, dose accumulation, and violations track over time.
      </p>

      <div style={{ marginBottom: "12px", display: "flex", gap: "12px" }}>
        <button
          onClick={() => setIsRunning(!isRunning)}
          style={{
            padding: "8px 12px",
            background: isRunning ? "#ff6b6b" : "#4caf50",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          {isRunning ? "Pause" : "Start"}
        </button>
        <button
          onClick={() => {
            contractRef.current = new SunContract(sourceStrength);
            const agentA: SunContractAgent = {
              id: "Agent A (Safe)",
              capMax: 0.4,
              capCurrent: 0.4,
              processingCapacity: 0.3,
              ramping: 0.1,
              doseBudget: 20,
              exposure: 0.5,
              exposureRampRate: 0.05,
            };
            const agentB: SunContractAgent = {
              id: "Agent B (Risky)",
              capMax: 1.0,
              capCurrent: 1.0,
              processingCapacity: 0.1,
              ramping: 0.5,
              doseBudget: 5,
              exposure: 0.8,
              exposureRampRate: 0.3,
            };
            contractRef.current.couple(agentA);
            contractRef.current.couple(agentB);
            setStats({ fieldEnergy: 0, totalViolations: 0, zeta: [1, 0, 0] });
          }}
          style={{
            padding: "8px 12px",
            background: "#2196f3",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Reset
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={600}
        height={450}
        style={{
          border: "1px solid #333",
          backgroundColor: "#0a0e27",
          marginBottom: "20px",
          display: "block",
        }}
      />

      <div style={{ color: "#bbb", fontSize: "12px" }}>
        <p>
          <strong>Key invariants enforced:</strong>
        </p>
        <ul style={{ marginLeft: "20px", lineHeight: "1.6" }}>
          <li>
            <strong>Cap (A_a ≤ cap_a):</strong> Intake (green bar) never exceeds agent's safe capacity
          </li>
          <li>
            <strong>Ramp (|dA_a/dt| ≤ ρ_a):</strong> Intake changes gradually, no sudden spikes
          </li>
          <li>
            <strong>Dose (D_a ≤ B_a):</strong> Cumulative unprocessed load (orange bar) hits budget limit
          </li>
          <li>
            <strong>Violations:</strong> Red count shows invariant breaches (source too aggressive, or agent pushes limits)
          </li>
        </ul>
      </div>
    </div>
  );
}
