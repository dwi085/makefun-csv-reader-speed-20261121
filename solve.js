// SPDX-License-Identifier: MIT
// A fast drop-in for csv-reader 1.0.0: run(input) returns exactly csv-reader's
// {columns, rows, errors} for an input {text, header}. One left-to-right pass:
// fields are cut out with slice() instead of built character by character,
// quoted fields jump from quote to quote with indexOf, and only the rare
// broken constructs (a stray CR, doubled quotes, a line break inside quotes,
// junk after a closing quote) take a slower path. Nothing is kept from one
// call to the next.

const COMMA = 0;
const BREAK = 1;
const END = 2;

/** csv-reader 1.0.0's answer for one case's input. */
export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;

  const n = text.length;
  // A U+FEFF at the very start of the text is dropped.
  let pos = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  let line = 1;

  // The record being read: the line it starts on and the index in rows it
  // takes (null for the header). Refreshed for every record.
  let recordLine = 1;
  let recordRow = null;

  function pushErr(code) {
    errors.push({ code, line: recordLine, row: recordRow });
  }

  // Reads an unquoted field from pos, starting from `head` ('' normally, '"'
  // when re-reading an unterminated quote, a quoted field's value when
  // reading junk after its closing quote). A CR not followed by LF is dropped
  // (stray_cr). Returns {value, ended, added}: added counts the characters
  // this call kept, not counting head.
  function readUnquoted(head) {
    let value = head;
    let added = 0;
    let start = pos;
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === 44) {
        // Comma: the field ends, the record goes on.
        if (start < pos) {
          value = value === '' ? text.slice(start, pos) : value + text.slice(start, pos);
          added += pos - start;
        }
        pos += 1;
        return { value, ended: COMMA, added };
      }
      if (c === 10) {
        // LF: the field ends, the record ends.
        if (start < pos) {
          value = value === '' ? text.slice(start, pos) : value + text.slice(start, pos);
          added += pos - start;
        }
        pos += 1;
        line += 1;
        return { value, ended: BREAK, added };
      }
      if (c === 13) {
        if (text.charCodeAt(pos + 1) === 10) {
          // CRLF: the field ends, the record ends.
          if (start < pos) {
            value = value === '' ? text.slice(start, pos) : value + text.slice(start, pos);
            added += pos - start;
          }
          pos += 2;
          line += 1;
          return { value, ended: BREAK, added };
        }
        // A lone CR is dropped, and the field carries on.
        if (start < pos) {
          value = value === '' ? text.slice(start, pos) : value + text.slice(start, pos);
          added += pos - start;
        }
        pushErr('stray_cr');
        pos += 1;
        start = pos;
        continue;
      }
      pos += 1;
    }
    if (start < pos) {
      value = value === '' ? text.slice(start, pos) : value + text.slice(start, pos);
      added += pos - start;
    }
    return { value, ended: END, added };
  }

  // Reads a quoted field whose opening quote is at pos. Runs to the next
  // quote that is not doubled ("" inside is one quote); each CRLF or lone CR
  // inside it is read as LF. What follows its closing quote, up to the next
  // comma or line break, is appended as it stands (quote_junk, when the
  // field ends). A quote that never closes is a literal character and the
  // text after it is read again as unquoted (unterminated_quote).
  function readQuoted() {
    const open = pos;
    const openLine = line;
    let scan = pos + 1;
    let parts = null; // segments split by doubled quotes, joined at the close
    while (true) {
      const q = text.indexOf('"', scan);
      if (q === -1) {
        pos = open + 1;
        line = openLine;
        pushErr('unterminated_quote');
        return readUnquoted('"');
      }
      if (text.charCodeAt(q + 1) === 34) {
        if (parts === null) parts = [text.slice(scan, q)];
        else parts.push(text.slice(scan, q));
        parts.push('"');
        scan = q + 2;
        continue;
      }
      // The closing quote is at q.
      let raw;
      if (parts === null) raw = text.slice(scan, q);
      else {
        parts.push(text.slice(scan, q));
        raw = parts.join('');
      }
      // Every LF, CRLF and lone CR inside the quotes counts a line, and
      // each CRLF or lone CR is read as one LF in the value.
      let value = raw;
      if (raw.indexOf('\n') !== -1 || raw.indexOf('\r') !== -1) {
        for (let i = 0; i < raw.length; i++) {
          const cc = raw.charCodeAt(i);
          if (cc === 10) line += 1;
          else if (cc === 13) {
            line += 1;
            if (raw.charCodeAt(i + 1) === 10) i += 1;
          }
        }
        if (raw.indexOf('\r') !== -1) value = raw.replace(/\r\n?/g, '\n');
      }
      pos = q + 1;
      if (pos >= n) return { value, ended: END, added: 0 };
      const c = text.charCodeAt(pos);
      if (c === 44) {
        pos += 1;
        return { value, ended: COMMA, added: 0 };
      }
      if (c === 10) {
        pos += 1;
        line += 1;
        return { value, ended: BREAK, added: 0 };
      }
      if (c === 13 && text.charCodeAt(pos + 1) === 10) {
        pos += 2;
        line += 1;
        return { value, ended: BREAK, added: 0 };
      }
      const junk = readUnquoted(value);
      if (junk.added > 0) pushErr('quote_junk');
      return junk;
    }
  }

  while (true) {
    // Lines with no characters are no records.
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === 10) {
        pos += 1;
        line += 1;
      } else if (c === 13 && text.charCodeAt(pos + 1) === 10) {
        pos += 2;
        line += 1;
      } else {
        break;
      }
    }
    if (pos >= n) break;

    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;
    const fields = [];
    let field;
    let quoted = false;
    do {
      quoted = text.charCodeAt(pos) === 34;
      field = quoted ? readQuoted() : readUnquoted('');
      fields.push(field.value);
    } while (field.ended === COMMA);

    // A line that held only stray CRs is left with no characters: no record
    // (its stray_cr errors stay).
    if (fields.length === 1 && fields[0] === '' && !quoted) continue;

    if (width < 0) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      continue;
    }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}
