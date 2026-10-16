/**
 * Safe client-side math expression evaluator.
 * Strictly avoids eval() and new Function().
 * Handles +, -, *, /, decimals, and multiplication symbols (x, *).
 */
export function safeEvaluateExpression(input: string | number): number {
  if (typeof input === 'number') {
    return isNaN(input) ? 0 : input;
  }

  if (!input || typeof input !== 'string') {
    return 0;
  }

  const cleaned = input
    .trim()
    .replace(/×/g, '*')
    .replace(/x/gi, '*')
    .replace(/\s+/g, '');

  if (!cleaned) return 0;

  // Simple number fast-path
  if (/^-?\d+(\.\d+)?$/.test(cleaned)) {
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  // Tokenize
  const tokens: (string | number)[] = [];
  let i = 0;
  while (i < cleaned.length) {
    const char = cleaned[i];
    if (char === '+' || char === '-' || char === '*' || char === '/' || char === '(' || char === ')') {
      tokens.push(char);
      i++;
    } else if (/\d|\./.test(char)) {
      let numStr = '';
      while (i < cleaned.length && /[\d.]/.test(cleaned[i])) {
        numStr += cleaned[i];
        i++;
      }
      const parsed = parseFloat(numStr);
      if (isNaN(parsed)) return 0;
      tokens.push(parsed);
    } else {
      // Invalid character encountered
      return 0;
    }
  }

  // Recursive descent parser
  let tokenIdx = 0;

  function parseExpression(): number {
    let result = parseTerm();
    while (tokenIdx < tokens.length) {
      const op = tokens[tokenIdx];
      if (op === '+') {
        tokenIdx++;
        result += parseTerm();
      } else if (op === '-') {
        tokenIdx++;
        result -= parseTerm();
      } else {
        break;
      }
    }
    return result;
  }

  function parseTerm(): number {
    let result = parseFactor();
    while (tokenIdx < tokens.length) {
      const op = tokens[tokenIdx];
      if (op === '*') {
        tokenIdx++;
        result *= parseFactor();
      } else if (op === '/') {
        tokenIdx++;
        const denom = parseFactor();
        result = denom === 0 ? 0 : result / denom;
      } else {
        break;
      }
    }
    return result;
  }

  function parseFactor(): number {
    if (tokenIdx >= tokens.length) return 0;
    const current = tokens[tokenIdx];

    if (current === '+') {
      tokenIdx++;
      return parseFactor();
    }
    if (current === '-') {
      tokenIdx++;
      return -parseFactor();
    }
    if (current === '(') {
      tokenIdx++;
      const val = parseExpression();
      if (tokens[tokenIdx] === ')') {
        tokenIdx++;
      }
      return val;
    }
    if (typeof current === 'number') {
      tokenIdx++;
      return current;
    }
    return 0;
  }

  try {
    const res = parseExpression();
    return isFinite(res) && !isNaN(res) ? Math.max(0, res) : 0;
  } catch {
    return 0;
  }
}
