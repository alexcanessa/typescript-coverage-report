import path from "node:path";
import { escapeHTML, relativeToRoot, toPagePath, toURLPath } from "../escape";

describe("escapeHTML", () => {
  it("escapes the five significant characters", () => {
    expect(escapeHTML(`& < > " '`)).toBe("&amp; &lt; &gt; &quot; &#39;");
  });

  it("escapes a closing textarea tag so it cannot terminate the editor", () => {
    expect(escapeHTML('const x = "</textarea>";')).toBe(
      "const x = &quot;&lt;/textarea&gt;&quot;;"
    );
  });

  it("escapes ampersands first so entities are not double-decoded", () => {
    // Without escaping, a source file containing the literal text "&amp;" is
    // displayed by the browser as "&" -- silently corrupting the source.
    expect(escapeHTML("a &amp; b")).toBe("a &amp;amp; b");
  });

  it("leaves ordinary text alone", () => {
    expect(escapeHTML("const greeting = `hello ${name}`;")).toBe(
      "const greeting = `hello ${name}`;"
    );
  });

  it("leaves non-ASCII alone", () => {
    expect(escapeHTML("✨ café 🤯")).toBe("✨ café 🤯");
  });
});

describe("toURLPath", () => {
  it("passes through a posix path", () => {
    expect(toURLPath("src/lib/index.ts")).toBe("src/lib/index.ts");
  });

  it("normalises Windows separators", () => {
    expect(toURLPath("src\\lib\\index.ts")).toBe("src/lib/index.ts");
  });

  it("percent-encodes characters that are significant in a URL", () => {
    expect(toURLPath("src/my file#1.ts")).toBe("src/my%20file%231.ts");
  });

  it("encodes each segment independently, keeping the separators", () => {
    expect(toURLPath("a b/c d.ts")).toBe("a%20b/c%20d.ts");
  });
});

describe("relativeToRoot", () => {
  it.each([
    ["a.ts", "../"],
    ["src/a.ts", "../../"],
    ["src/deep/nested/a.ts", "../../../../"]
  ])("walks up one level per segment: %s", (filename, expected) => {
    expect(relativeToRoot(filename)).toBe(expected);
  });

  it("treats Windows separators the same as posix ones", () => {
    expect(relativeToRoot("src\\lib\\a.ts")).toBe(
      relativeToRoot("src/lib/a.ts")
    );
  });
});

describe("toPagePath", () => {
  it("leaves a path inside the working directory alone", () => {
    expect(toPagePath("src/lib/index.ts")).toBe("src/lib/index.ts");
  });

  it("normalises Windows separators", () => {
    expect(toPagePath("src\\lib\\index.ts")).toBe("src/lib/index.ts");
  });

  it("drops a leading ./", () => {
    expect(toPagePath("./src/a.ts")).toBe("src/a.ts");
  });

  it.each([
    ["../a.ts", "__/a.ts"],
    ["../../pkg/a.ts", "__/__/pkg/a.ts"],
    ["../../../../a.ts", "__/__/__/__/a.ts"]
  ])("replaces each upward segment: %s", (filename, expected) => {
    expect(toPagePath(filename)).toBe(expected);
  });

  it("keeps a .. that is only part of a name", () => {
    expect(toPagePath("..foo/a..b.ts")).toBe("..foo/a..b.ts");
  });

  it("strips the leading slash of an absolute posix path", () => {
    expect(toPagePath("/etc/passwd.ts")).toBe("etc/passwd.ts");
  });

  it("turns a Windows drive into a directory name", () => {
    expect(toPagePath("C:\\src\\a.ts")).toBe("C/src/a.ts");
  });

  it("never produces a path that escapes its parent", () => {
    const cases = [
      "src/a.ts",
      "../a.ts",
      "../../../../../a.ts",
      "/abs/a.ts",
      "C:\\a.ts",
      "./a.ts"
    ];

    cases.forEach((filename) => {
      const joined = path.join("files", toPagePath(filename));

      expect(path.relative("files", joined).startsWith("..")).toBe(false);
    });
  });
});
