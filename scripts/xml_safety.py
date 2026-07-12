"""Hardened XML parsing for untrusted OOXML (.docx) parts.

A ``.docx`` is a zip authored by an arbitrary counterparty, and the redline
pipeline ingests opposing-counsel markup by design — so its raw XML parts are
untrusted input. Stdlib ``xml.etree`` is vulnerable to entity-expansion
("billion laughs") and ``lxml`` resolves external entities and loads external
DTDs by default (classic XXE: local file read / SSRF).

OOXML forbids DTDs in its parts, so a legitimate ``.docx`` never declares one.
We therefore reject any part carrying a ``DOCTYPE`` outright and, as
defense-in-depth, parse with entity resolution and network access disabled.
This closes both XXE and billion-laughs without adding a third-party
dependency (the project ships no requirements manifest; ``lxml`` is already
present transitively via python-docx).
"""

from xml.etree import ElementTree as ET

# ``<!DOCTYPE`` is only valid in the XML prolog; anywhere else the literal
# bytes would have to be escaped, so a whole-document scan cannot miss a real
# declaration and a stray match only causes a fail-closed rejection. The XML
# spec requires the keyword uppercase; we also reject a lowercased spelling so
# a malformed-but-hostile part fails closed rather than reaching the parser.
_DOCTYPE_MARKERS = (b"<!DOCTYPE", b"<!doctype")


class UnsafeXmlError(ValueError):
    """An OOXML part declares a DTD — never legitimate, treated as hostile."""


def _as_bytes(blob):
    if isinstance(blob, str):
        return blob.encode("utf-8")
    return bytes(blob)


def _reject_dtd(raw):
    if any(marker in raw for marker in _DOCTYPE_MARKERS):
        raise UnsafeXmlError(
            "refusing to parse OOXML part declaring a DOCTYPE/DTD "
            "(possible XXE or entity-expansion attack)"
        )


def safe_fromstring(blob):
    """Parse an untrusted OOXML part with the stdlib ElementTree.

    Rejects any DTD before parsing so no internal entity is ever expanded.
    """
    raw = _as_bytes(blob)
    _reject_dtd(raw)
    return ET.fromstring(raw)


def safe_lxml_fromstring(blob):
    """Parse an untrusted OOXML part with lxml, entities and network disabled."""
    import lxml.etree as etree

    raw = _as_bytes(blob)
    _reject_dtd(raw)
    parser = etree.XMLParser(
        resolve_entities=False,
        no_network=True,
        load_dtd=False,
        dtd_validation=False,
        huge_tree=False,
    )
    return etree.fromstring(raw, parser=parser)
