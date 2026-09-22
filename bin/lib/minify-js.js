// dist/yeti.min.js. lightningcss minifies CSS only, and a real JS minifier
// would be a second dependency for a few hundred bytes, so this does the one
// safe thing: it removes comments and blank lines. Nothing is renamed and
// nothing is reformatted, so a stack trace from the minified bundle still
// points at code a person recognises.
//
// It reads character by character instead of matching a regular expression,
// because a comment marker inside a string ("https://…"), a template or a
// regex literal is not a comment and no regular expression can tell the
// difference. Anything it cannot finish reading throws: a build that stops is
// better than a module quietly cut in half.

// After one of these words a slash opens a regex literal; after a name, a
// number, a closing bracket or a closing paren it divides.
const REGEX_AFTER = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'case', 'do', 'else', 'yield', 'await', 'throw']);

/** The index just past the string or template literal that starts at `start`. */
function endOfString(source, start) {
	const quote = source[start];
	let i = start + 1;
	while (i < source.length) {
		const ch = source[i];
		if (ch === '\\') { i += 2; continue; }
		if (ch === quote) return i + 1;
		// A template's ${ … } holds real code, which may hold another string
		// or another template, so read it rather than hunting for the next
		// backtick, which could be inside one of them.
		if (quote === '`' && ch === '$' && source[i + 1] === '{') { i = endOfExpression(source, i + 2); continue; }
		if (quote !== '`' && ch === '\n') break;
		i += 1;
	}
	throw new Error(`unterminated ${quote === '`' ? 'template' : 'string'} at index ${start}`);
}

/** The index just past the closing brace of a template's ${ … }. */
function endOfExpression(source, start) {
	let depth = 1;
	let i = start;
	while (i < source.length) {
		const ch = source[i];
		if (ch === '"' || ch === "'" || ch === '`') { i = endOfString(source, i); continue; }
		if (ch === '{') depth += 1;
		if (ch === '}' && --depth === 0) return i + 1;
		i += 1;
	}
	throw new Error(`unterminated template expression at index ${start}`);
}

/** The index just past the regex literal and its flags that start at `start`. */
function endOfRegex(source, start) {
	let i = start + 1;
	let inClass = false;
	while (i < source.length) {
		const ch = source[i];
		if (ch === '\\') { i += 2; continue; }
		if (ch === '[') inClass = true;
		else if (ch === ']') inClass = false;
		else if (ch === '/' && !inClass) {
			i += 1;
			while (i < source.length && /[a-z]/.test(source[i])) i += 1;
			return i;
		} else if (ch === '\n') break;
		i += 1;
	}
	throw new Error(`unterminated regex at index ${start}`);
}

/** Strips comments and blank lines. Throws rather than guess at anything it cannot read. */
export function minifyJs(source) {
	let out = '';
	let i = 0;
	// The last character written and the identifier it ends: together they say
	// whether the next slash opens a regex literal or divides.
	let lastChar = '';
	let lastWord = '';
	const push = (text) => {
		out += text;
		const trimmed = text.trimEnd();
		if (!trimmed) return;
		lastChar = trimmed.at(-1);
		lastWord = trimmed.match(/[A-Za-z0-9_$]+$/)?.[0] ?? '';
	};
	while (i < source.length) {
		const ch = source[i];
		const next = source[i + 1];
		if (ch === '/' && next === '/') {
			while (i < source.length && source[i] !== '\n') i += 1;
			continue;
		}
		if (ch === '/' && next === '*') {
			const end = source.indexOf('*/', i + 2);
			if (end === -1) throw new Error(`unterminated block comment at index ${i}`);
			i = end + 2;
			continue;
		}
		if (ch === '"' || ch === "'" || ch === '`') {
			const end = endOfString(source, i);
			push(source.slice(i, end));
			i = end;
			continue;
		}
		if (ch === '/' && regexAllowed(lastChar, lastWord)) {
			const end = endOfRegex(source, i);
			push(source.slice(i, end));
			i = end;
			continue;
		}
		push(ch);
		i += 1;
	}
	// A line that held only a comment is now blank, and a stripped trailing
	// comment leaves the spaces that were in front of it.
	const lines = out.split('\n').map((line) => line.trimEnd()).filter((line) => line !== '');
	return lines.length ? `${lines.join('\n')}\n` : '';
}

function regexAllowed(lastChar, lastWord) {
	if (!lastChar) return true;
	if (/[)\]}]/.test(lastChar)) return false;
	if (/[A-Za-z0-9_$]/.test(lastChar)) return REGEX_AFTER.has(lastWord);
	return true;
}
