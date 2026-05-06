export interface DiffPart {
  value: string;
  added?: boolean;
  removed?: boolean;
}

export function diffLines(before: string, after: string): DiffPart[] {
  const a = before.split('\n');
  const b = after.split('\n');
  const rows = a.length + 1;
  const cols = b.length + 1;
  const lcs: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i]![j] = a[i] === b[j]
        ? lcs[i + 1]![j + 1]! + 1
        : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }

  const parts: DiffPart[] = [];
  let i = 0;
  let j = 0;

  const push = (value: string, kind?: 'added' | 'removed') => {
    const last = parts[parts.length - 1];
    if (last && Boolean(last.added) === (kind === 'added') && Boolean(last.removed) === (kind === 'removed')) {
      last.value += `\n${value}`;
      return;
    }
    parts.push({
      value,
      added: kind === 'added' || undefined,
      removed: kind === 'removed' || undefined,
    });
  };

  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      push(a[i]!);
      i++;
      j++;
    } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) {
      push(a[i]!, 'removed');
      i++;
    } else {
      push(b[j]!, 'added');
      j++;
    }
  }

  while (i < a.length) push(a[i++]!, 'removed');
  while (j < b.length) push(b[j++]!, 'added');

  return parts.map(part => ({ ...part, value: `${part.value}\n` }));
}
