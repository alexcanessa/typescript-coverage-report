// Content that has historically broken the HTML reporter.
//
// The details page interpolates source straight into a <textarea>, so a
// literal closing tag terminates the element early and corrupts the editor.
// Ampersands and angle brackets are silently mangled without escaping, and
// template-literal types plus emoji have broken the syntax highlighter
// (issues #61 and #68).
export const closingTag = "</textarea>";
export const ampersand = "a &amp; b &lt;script&gt;";
export const angled = "<script>alert(1)</script>";
export const emoji = "✨ 🤯 café";

export type Greeting = `hello ${string}`;
export const greeting: Greeting = "hello world";

export const shrug: any = "¯\\_(ツ)_/¯";
