#!/usr/bin/env node
// Remove dist/ before every build.
//
// This is not housekeeping. v1.1.0 and v1.1.1 were published with a stale
// dist/ that still contained the pre-refactor React reporter
// (dist/lib/reporters/html.js and dist/components/**). Node's resolution
// picks html.js over html/index.js, so every install ran deleted code that
// required react/react-dom/semantic-ui-react -- none of them dependencies.
// A clean build is what stops that recurring.
import { rmSync } from "node:fs";

rmSync(new URL("../dist", import.meta.url), { recursive: true, force: true });
