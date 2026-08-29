import { describe, expect, test } from 'bun:test';
import { parseSseChunk } from './sse';

describe('parseSseChunk', () => {
  test('splits a chunk holding several whole frames', () => {
    const chunk = 'event: text\ndata: {"text":"hi"}\n\nevent: done\ndata: {"output":null}\n\n';
    const { frames, rest } = parseSseChunk('', chunk);
    expect(frames).toEqual([
      { event: 'text', data: '{"text":"hi"}' },
      { event: 'done', data: '{"output":null}' },
    ]);
    expect(rest).toBe('');
  });

  test('carries a partial frame across calls', () => {
    const first = parseSseChunk('', 'event: text\ndata: {"te');
    expect(first.frames).toEqual([]);
    expect(first.rest).toBe('event: text\ndata: {"te');

    const second = parseSseChunk(first.rest, 'xt":"hello"}\n\nevent: don');
    expect(second.frames).toEqual([{ event: 'text', data: '{"text":"hello"}' }]);
    expect(second.rest).toBe('event: don');

    const third = parseSseChunk(second.rest, 'e\ndata: {}\n\n');
    expect(third.frames).toEqual([{ event: 'done', data: '{}' }]);
    expect(third.rest).toBe('');
  });

  test('drops comment lines and comment-only frames', () => {
    const { frames } = parseSseChunk('', ': typed\n\n:keepalive\nevent: text\ndata: {"text":"x"}\n\n');
    expect(frames).toEqual([{ event: 'text', data: '{"text":"x"}' }]);
  });

  test('joins multi-line data with newlines', () => {
    const { frames } = parseSseChunk('', 'event: text\ndata: line one\ndata: line two\n\n');
    expect(frames).toEqual([{ event: 'text', data: 'line one\nline two' }]);
  });

  test('defaults the event name to message and keeps an empty data line', () => {
    const { frames } = parseSseChunk('', 'data: {"a":1}\n\ndata:\n\n');
    expect(frames).toEqual([
      { event: 'message', data: '{"a":1}' },
      { event: 'message', data: '' },
    ]);
  });

  test('tolerates CRLF line endings', () => {
    const { frames, rest } = parseSseChunk('', 'event: text\r\ndata: {"text":"crlf"}\r\n\r\n');
    expect(frames).toEqual([{ event: 'text', data: '{"text":"crlf"}' }]);
    expect(rest).toBe('');
  });

  test('strips exactly one space after the colon', () => {
    const { frames } = parseSseChunk('', 'event: text\ndata:  two spaces\n\n');
    expect(frames).toEqual([{ event: 'text', data: ' two spaces' }]);
  });
});
