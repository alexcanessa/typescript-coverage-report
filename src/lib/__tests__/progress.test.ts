import { createProgress } from "../progress";

type FakeStream = NodeJS.WriteStream & { written: string[] };

const fakeStream = (isTTY: boolean): FakeStream => {
  const written: string[] = [];

  return {
    isTTY,
    written,
    write: (chunk: string) => {
      written.push(chunk);

      return true;
    }
  } as unknown as FakeStream;
};

describe("createProgress", () => {
  const originalCI = process.env.CI;

  beforeEach(() => {
    jest.useFakeTimers();
    delete process.env.CI;
  });

  afterEach(() => {
    jest.useRealTimers();
    if (originalCI === undefined) {
      delete process.env.CI;
    } else {
      process.env.CI = originalCI;
    }
  });

  it("writes nothing when the stream is not a TTY", () => {
    // Piping stdout or stderr to a file must not collect spinner frames.
    const stream = fakeStream(false);
    const progress = createProgress(stream);

    progress.update("Analysing...");
    jest.advanceTimersByTime(500);
    progress.stop();

    expect(stream.written).toEqual([]);
  });

  it("writes nothing when CI is set, even on a TTY", () => {
    // Some runners allocate a pseudo-terminal; without this the log fills
    // with spinner frames.
    process.env.CI = "true";
    const stream = fakeStream(true);
    const progress = createProgress(stream);

    progress.update("Analysing...");
    jest.advanceTimersByTime(500);

    expect(stream.written).toEqual([]);
  });

  it("renders the label on a TTY", () => {
    const stream = fakeStream(true);
    const progress = createProgress(stream);

    progress.update("Analysing types...");

    expect(stream.written.join("")).toContain("Analysing types...");
    progress.stop();
  });

  it("animates while work is happening", () => {
    const stream = fakeStream(true);
    const progress = createProgress(stream);

    progress.update("Working");
    const before = stream.written.length;
    jest.advanceTimersByTime(400);

    expect(stream.written.length).toBeGreaterThan(before);
    progress.stop();
  });

  it("rewrites a single line rather than scrolling", () => {
    const stream = fakeStream(true);
    const progress = createProgress(stream);

    progress.update("Working");
    jest.advanceTimersByTime(400);

    expect(stream.written.every((chunk) => chunk.startsWith("\r"))).toBe(true);
    expect(stream.written.some((chunk) => chunk.includes("\n"))).toBe(false);
    progress.stop();
  });

  it("clears the line on stop, so it cannot collide with real output", () => {
    const stream = fakeStream(true);
    const progress = createProgress(stream);

    progress.update("Working");
    progress.stop();

    expect(stream.written.at(-1)).toMatch(/^\r\s+\r$/);
  });

  it("stops animating once stopped", () => {
    const stream = fakeStream(true);
    const progress = createProgress(stream);

    progress.update("Working");
    progress.stop();
    const after = stream.written.length;
    jest.advanceTimersByTime(1000);

    expect(stream.written.length).toBe(after);
  });

  it("can be stopped without ever being updated", () => {
    const stream = fakeStream(true);

    expect(() => createProgress(stream).stop()).not.toThrow();
  });
});
