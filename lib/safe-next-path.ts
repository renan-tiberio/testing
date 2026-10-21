// Any base works: only the origin comparison matters.
const PARSE_BASE = new URL('http://same-origin.invalid')

// The WHATWG URL parser removes these before parsing.
const PARSER_STRIPPED_CHARACTERS = ['\t', '\n', '\r']

// Returns a same-origin path for `next`, or '/'. The raw string cannot be trusted on its
// own: the URL parser drops tabs and newlines first, so `/\t/evil.com` passes a
// "starts with / but not //" check and still becomes `//evil.com`, another host.
// Normalize like the parser, check, then let the parser confirm the origin.
export const safeNextPath = (next: string | null): string => {
  if (next === null) {
    return '/'
  }

  const normalized = PARSER_STRIPPED_CHARACTERS.reduce(
    (value, character) => value.replaceAll(character, ''),
    next,
  )
  const isRootRelative =
    normalized.startsWith('/') && !normalized.startsWith('//') && !normalized.startsWith('/\\')
  if (!isRootRelative) {
    return '/'
  }

  const parsed = new URL(normalized, PARSE_BASE)
  if (parsed.origin !== PARSE_BASE.origin) {
    return '/'
  }

  return `${parsed.pathname}${parsed.search}${parsed.hash}`
}
