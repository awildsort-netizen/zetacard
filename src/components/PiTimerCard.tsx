import React, { useState, useCallback } from 'react';
import { PiClockSetting, runPiClock, formatSignature } from '../piClock';

interface PiTimerCardProps {
  dial?: number;
  fileTag?: string;
  channel?: string;
  onSignatureGenerated?: (signature: string) => void;
}

/**
 * A zetacard-themed π-timer that generates "signatures" tied to files.
 * "Set your π-clock" like a spy gadget.
 */
export default function PiTimerCard({
  dial = 317,
  fileTag = 'zetacard',
  channel = 'primary',
  onSignatureGenerated,
}: PiTimerCardProps) {
  const [currentDial, setCurrentDial] = useState(dial);
  const [currentFileTag, setCurrentFileTag] = useState(fileTag);
  const [currentChannel, setCurrentChannel] = useState(channel);
  const [numTicks, setNumTicks] = useState(10);
  const [signature, setSignature] = useState<string | null>(null);
  const [traceVisible, setTraceVisible] = useState(false);
  const [lastTrace, setLastTrace] = useState<string[]>([]);
  const [formatStyle, setFormatStyle] = useState<'phone' | 'hex' | 'raw'>('raw');

  const handleGenerate = useCallback(() => {
    const setting: PiClockSetting = {
      dial: currentDial,
      fileTag: currentFileTag,
      channel: currentChannel,
    };

    const output = runPiClock(setting, numTicks);
    const sig = formatSignature(output, formatStyle);

    setSignature(sig);
    setLastTrace(output.trace);
    onSignatureGenerated?.(sig);
  }, [currentDial, currentFileTag, currentChannel, numTicks, formatStyle, onSignatureGenerated]);

  const handleCopySignature = useCallback(() => {
    if (signature) {
      navigator.clipboard.writeText(signature);
    }
  }, [signature]);

  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: '#0a0e27',
        color: '#fff',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '13px',
        border: '1px solid #1a3a52',
        maxWidth: '500px',
      }}
    >
      {/* Title */}
      <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', color: '#4caf50' }}>
        π-Clock Timer
      </div>

      {/* Dial Input */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', marginBottom: '4px' }}>
          Dial (0–999):
        </label>
        <input
          type="number"
          min="0"
          max="999"
          value={currentDial}
          onChange={(e) => setCurrentDial(Math.max(0, Math.min(999, Number(e.target.value))))}
          style={{
            width: '100%',
            padding: '6px',
            backgroundColor: '#1a1f2e',
            color: '#fff',
            border: '1px solid #333',
            borderRadius: '4px',
            fontSize: '13px',
          }}
        />
      </div>

      {/* File Tag Input */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', marginBottom: '4px' }}>
          Lock (file tag):
        </label>
        <input
          type="text"
          value={currentFileTag}
          onChange={(e) => setCurrentFileTag(e.target.value)}
          style={{
            width: '100%',
            padding: '6px',
            backgroundColor: '#1a1f2e',
            color: '#fff',
            border: '1px solid #333',
            borderRadius: '4px',
            fontSize: '13px',
          }}
        />
      </div>

      {/* Channel Input */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', marginBottom: '4px' }}>
          Channel (optional):
        </label>
        <input
          type="text"
          value={currentChannel}
          onChange={(e) => setCurrentChannel(e.target.value)}
          placeholder="phone, id, note..."
          style={{
            width: '100%',
            padding: '6px',
            backgroundColor: '#1a1f2e',
            color: '#fff',
            border: '1px solid #333',
            borderRadius: '4px',
            fontSize: '13px',
          }}
        />
      </div>

      {/* Ticks Input */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', marginBottom: '4px' }}>
          Ticks (digits to generate):
        </label>
        <input
          type="number"
          min="1"
          max="100"
          value={numTicks}
          onChange={(e) => setNumTicks(Math.max(1, Math.min(100, Number(e.target.value))))}
          style={{
            width: '100%',
            padding: '6px',
            backgroundColor: '#1a1f2e',
            color: '#fff',
            border: '1px solid #333',
            borderRadius: '4px',
            fontSize: '13px',
          }}
        />
      </div>

      {/* Format Style */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', marginBottom: '4px' }}>
          Format:
        </label>
        <select
          value={formatStyle}
          onChange={(e) => setFormatStyle(e.target.value as 'phone' | 'hex' | 'raw')}
          style={{
            width: '100%',
            padding: '6px',
            backgroundColor: '#1a1f2e',
            color: '#fff',
            border: '1px solid #333',
            borderRadius: '4px',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          <option value="raw">Raw</option>
          <option value="phone">Phone (XXX) XXX-XXXX</option>
          <option value="hex">Hex</option>
        </select>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        style={{
          width: '100%',
          padding: '8px 12px',
          backgroundColor: '#4caf50',
          color: '#000',
          border: 'none',
          borderRadius: '4px',
          fontWeight: 'bold',
          cursor: 'pointer',
          fontSize: '13px',
          marginBottom: '12px',
        }}
      >
        Generate Signature
      </button>

      {/* Signature Display */}
      {signature && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>
            Signature:
          </div>
          <div
            style={{
              backgroundColor: '#1a1f2e',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #333',
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#4caf50',
              wordBreak: 'break-all',
              userSelect: 'all',
              cursor: 'pointer',
            }}
            onClick={handleCopySignature}
            title="Click to copy"
          >
            {signature}
          </div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
            Click to copy
          </div>
        </div>
      )}

      {/* Trace Toggle */}
      <button
        onClick={() => setTraceVisible(!traceVisible)}
        style={{
          width: '100%',
          padding: '6px 8px',
          backgroundColor: '#333',
          color: '#fff',
          border: '1px solid #555',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          marginBottom: lastTrace.length > 0 ? '8px' : '0',
        }}
      >
        {traceVisible ? 'Hide' : 'Show'} Mechanism Trace
      </button>

      {/* Trace Display */}
      {traceVisible && lastTrace.length > 0 && (
        <div
          style={{
            backgroundColor: '#0f1419',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #1a3a52',
            fontSize: '11px',
            color: '#aaa',
            maxHeight: '200px',
            overflow: 'auto',
            marginTop: '8px',
          }}
        >
          {lastTrace.map((line, idx) => (
            <div key={idx} style={{ marginBottom: '2px' }}>
              {line}
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div
        style={{
          fontSize: '11px',
          color: '#666',
          marginTop: '12px',
          padding: '8px',
          backgroundColor: '#0f1419',
          borderRadius: '4px',
          lineHeight: '1.5',
        }}
      >
        <strong>How it works:</strong> Same dial + lock → same signature forever. Change dial → different worldline.
        The phase, tempo, and lens are derived from your inputs; π is the master tape.
      </div>
    </div>
  );
}
