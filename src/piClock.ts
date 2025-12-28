/**
 * π-clock: A deterministic generator using π digits as a master tape.
 * 
 * "Set the dial, lock the file, and the universe snaps into that worldline."
 * 
 * Concept: π is an infinite reservoir. You pick:
 * - phase (offset): where in π you start reading
 * - tempo (rate): how fast you advance per tick
 * - lens (windowing): how you chunk digits into features
 * - file_tag: the "lock" that makes the stream unique to a file
 * 
 * Output: a deterministic stream tied to the dial + file, but feels like a clock ticking.
 */

// Precomputed first 10000 digits of π (after decimal point)
const PI_DIGITS = `
1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679
8214808651328230664709384460955058223172535940812848111745028410270193852110555964462294895493038196
4428810975665933446128475648233786783165271201909145648566923460348610454326648213393607260249141273
7245870066063155881748815209209628292540917153643678925903600113305305488204665213841469519415116094
3305727036575959195309218611738193261179310511854807446237996274956735188575272489122793818301194912
9833673362440656643086021394946395224737190702179860943702770539217176293176752384674818467669405132
0005681271452635608277857713427577896091736371787214684409012249534301465495853710507922796892589235
4201995611212902196086403441815981362977477130996051870721134999999837297804995105973173281609631859
5024459455346908302642522308253344685035261931188171010003137838752886587533208381420617177669147303
5982534904287554687311595628638823537875937519577818577805321712268066130019278766111959092164201989
3809525720106548586327886593615338182796823030195203530185296899577362259941389124972177528347913151
5574857242454150695950829533116861727855889075098381754637464939319255060400927701671139009848824012
8583616035637076601047101819429555961989467678374494482553797747268471040475346462080466842590694912
9331367702898915210475216205696602405803815019351125338243003558764024749647326391419927260426992279
6782354781636009341721641219924586315030286182974555706749838505494588586926995690927210797509302955
3211653449872027559602364806654991198818347977535663698074265425278625518184175746728909777727938000
8164706001614524919217321721477235014144197356854816136115735255213347574184946843852332390739414333
4547760879695970309833913077109870408591337464144282619278260890144311074676789672425841765990141636
4418287640957155672525325675328612910424877618258297651579598470356222629348600341587229805349896502
2628488651947170737874921388113231689786060956611562945780554316196318506676129063811051824197444849
7587012203408058879544547492461856953648644492410443207713449470495658467885098743394422125448770664
7809242300695159595513458280533760107107564759504606032909945289366010149428062241080154654283622417
2427255332050434728866109663191465843792220198938095257201065485863278865936153381827968230301952035
3018529689957736225994138912497217752879071983601371884341288077688575030934767933286827013835768223
3268498334771944396078544332204576876314506129457696589011701208239505474575028775996172986853580570
4587852746922569516857564014270477555132379641451523746639411491434159562586586557055269049652098580
3385715095701155881391585983747394562879617884003198814756787203594384797163946994046394239633993418
4884332738514112589985921732718154468137143235124035541864314718999999833959330470310361692036869542
6368899141325495099182934809562300885640952617926835622164331384583000752044933826560297606737113200
7093287091274437470472306969772093101416928368190255151086569637275891756172543189312978482168299894
8722658804857564014270477555132379641451523746639411491434159562586586557055269049652098580338537540
8289706414011097120628043903975951567715770042033786993600723055876317635942187312514712053292819182
6092592080682224680122482611771858963814091839036736722208883215137556003727983940041529700287830766709
9514414408427966527521221278873291589796104461712419512141123313580984292555962318766111959092164201989
7809525720106548586327886593615338182796823030195203530185296899577362259941389124972177528347913151
5574857242454150695950829533116861727855889075098381754637464939319255060400927701671139009848824012
8583616035637076601047101819429555961989467678374494482553797747268471040475346462080466842590694912
9331367702898915210475216205696602405803815019351125338243003558764024749647326391419927260426992279
6782354781636009341721641219924586315030286182974555706749838505494588586926995690927210797509302955
`
  .replace(/\s/g, '')
  .split('')
  .map(Number);

export interface PiClockSetting {
  dial: number; // 0-999 (3-digit setting)
  fileTag: string; // filename or unique identifier
  channel?: string; // optional fork label (e.g. "phone", "id", "note")
}

export interface PiClockState {
  phase: number;
  tempo: number;
  lensWidths: number[];
  position: number;
  state: number[];
  ticks: number;
}

export interface PiClockOutput {
  digits: number[];
  state: PiClockState;
  trace: string[];
}

/**
 * Hash a string to a number [0, max)
 */
function hashString(s: string, max: number): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0; // Convert to 32-bit integer
  }
  return Math.abs(h) % max;
}

/**
 * Initialize a π-clock for a given setting and file.
 */
export function initPiClock(setting: PiClockSetting): PiClockState {
  const { dial, fileTag, channel = '' } = setting;

  // phase: deterministic offset based on file tag and channel
  const phase = hashString(fileTag + channel, PI_DIGITS.length);

  // tempo: derived from dial, in a "prime-ish" range
  // (1 + (dial mod 97)) gives range [1, 97]
  const tempo = 1 + (dial % 97);

  // lens widths: pattern from dial (creates a repeating window pattern)
  const lensWidths = [
    2 + (dial % 4),
    3 + ((dial >> 2) % 5),
    4 + ((dial >> 4) % 4),
  ];

  // initial state: 3-element vector derived from dial + file
  const state = [
    (dial / 1000) * (hashString(fileTag, 1000) / 1000),
    (Math.sin(dial / 314.159) + 1) / 2,
    (Math.cos(hashString(channel, 1000) / 100) + 1) / 2,
  ];

  return {
    phase,
    tempo,
    lensWidths,
    position: phase,
    state,
    ticks: 0,
  };
}

/**
 * Advance the π-clock by one tick.
 * Returns the output digit(s) and updates state.
 */
export function tickPiClock(
  state: PiClockState,
  numDigits: number = 1
): { digit: number; newState: PiClockState; trace?: string } {
  const { phase, tempo, lensWidths, position, state: oldState } = state;
  const L = PI_DIGITS.length;

  // Read a window from π at current position
  const window: number[] = [];
  const windowSize = 4; // read 4 digits per tick
  for (let i = 0; i < windowSize; i++) {
    const idx = (position + i) % L;
    window.push(PI_DIGITS[idx]);
  }

  // Apply lens: chunk window into columns
  const columns: number[][] = [];
  for (let w of lensWidths) {
    const col: number[] = [];
    for (let i = 0; i < w && i < window.length; i++) {
      col.push(window[i]);
    }
    columns.push(col);
  }

  // Mix into state: fold each column into state
  const newState = [...oldState];
  let output = 0;

  for (let colIdx = 0; colIdx < columns.length; colIdx++) {
    const col = columns[colIdx];
    // Average column
    const avg = col.length > 0 ? col.reduce((a, b) => a + b, 0) / col.length / 10 : 0;
    // Mix with state: simple feedback
    newState[colIdx] = (newState[colIdx] + avg) % 1;
    // Contribute to output
    output += newState[colIdx] * Math.pow(10, colIdx);
  }

  // Normalize to single digit
  const digit = Math.floor((output * 1e6) % 10);

  // Advance position for next tick
  const nextPos = (position + tempo) % L;

  const newClockState: PiClockState = {
    ...state,
    position: nextPos,
    state: newState,
    ticks: state.ticks + 1,
  };

  return {
    digit,
    newState: newClockState,
    trace: `tick ${state.ticks}: pos=${position}, col=[${columns.map((c) => c.join(',')).join('|')}], digit=${digit}`,
  };
}

/**
 * Run the π-clock for N ticks and return all digits + final state.
 */
export function runPiClock(
  setting: PiClockSetting,
  numTicks: number = 10
): PiClockOutput {
  const state = initPiClock(setting);
  const digits: number[] = [];
  const trace: string[] = [];

  // Initial trace
  trace.push(
    `π-clock initialized: dial=${setting.dial}, file=${setting.fileTag}, phase=${state.phase}, tempo=${state.tempo}`
  );
  trace.push(`lens widths: [${state.lensWidths.join(', ')}]`);
  trace.push(`initial state: [${state.state.map((s) => s.toFixed(4)).join(', ')}]`);
  trace.push('---');

  let currentState = state;
  for (let i = 0; i < numTicks; i++) {
    const { digit, newState, trace: tickTrace } = tickPiClock(currentState);
    digits.push(digit);
    currentState = newState;
    if (tickTrace) trace.push(tickTrace);
  }

  trace.push('---');
  trace.push(`final state: [${currentState.state.map((s) => s.toFixed(4)).join(', ')}]`);
  trace.push(`signature: ${digits.join('')}`);

  return {
    digits,
    state: currentState,
    trace,
  };
}

/**
 * Format π-clock output as a "signature" (like a phone number or code).
 */
export function formatSignature(output: PiClockOutput, style: 'phone' | 'hex' | 'raw' = 'raw'): string {
  const { digits } = output;
  const joined = digits.join('');

  switch (style) {
    case 'phone':
      // 10 digits → (XXX) XXX-XXXX
      if (joined.length >= 10) {
        const d = joined.substring(0, 10);
        return `(${d.substring(0, 3)}) ${d.substring(3, 6)}-${d.substring(6)}`;
      }
      return joined;
    case 'hex':
      // Convert to hex
      const num = BigInt(joined);
      return '0x' + num.toString(16);
    case 'raw':
    default:
      return joined;
  }
}
