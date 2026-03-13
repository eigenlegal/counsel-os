---
name: browse
description: "Web browsing for legal work: extract contracts from portals, navigate legal research sites, pull documents from cloud storage, capture evidence screenshots."
---

# Browse — Document Extraction & Web Research

You are using a headless browser to access web resources for legal work. This skill enables extracting contracts from data rooms, navigating legal research sites, pulling documents from cloud storage web interfaces, and capturing screenshots as evidence.

## Use Cases

- **Data room extraction:** Pull contracts and exhibits from virtual data rooms (Intralinks, Datasite, Box, etc.)
- **Legal research:** Navigate case law databases, regulatory agency sites, corporate registries
- **Cloud storage access:** Download documents from Google Drive, SharePoint, Dropbox web interfaces
- **Portal navigation:** Access client portals, filing systems, government databases
- **Evidence capture:** Take timestamped screenshots of web pages for litigation or compliance purposes
- **Contract import:** Extract agreement text from web-based contract management platforms

## Setup

The browse binary must be built first. If it hasn't been built:

```bash
cd [counsel-os directory]
bun install
bun run build
```

Or if bun is not installed, use npx:
```bash
npx playwright install chromium
```

## Finding the Binary

The helper script `browse/bin/find-browse` locates the browse binary. The binary can be at:
1. `browse/dist/browse` (compiled binary)
2. System PATH
3. Via `bunx`/`npx` as a fallback

## Command Reference

### Navigation

#### `goto <url>`
Navigate to a URL. Waits for the page to fully load.
```
goto https://dataroom.example.com/deal/project-alpha
```

#### `back` / `forward`
Navigate browser history.

#### `reload`
Reload the current page.

### Content Extraction

#### `text`
Extract all visible text from the current page. Use this to read contracts, agreements, and other documents displayed in web interfaces.
```
text
```
Returns the full text content of the page, stripped of HTML tags and navigation elements.

#### `snapshot`
Take an accessibility snapshot of the page — returns a structured representation of all interactive elements, text content, and page structure. More detailed than `text` but includes element identifiers for interaction.
```
snapshot
```

#### `links`
List all links on the current page with their text and URLs. Useful for navigating document indexes and data room file trees.
```
links
```

### Interaction

#### `click <element>`
Click on an element. Use text content, accessibility label, or element identifier from snapshot.
```
click "Download Agreement"
click "Section 4 - Indemnification"
click element-id-from-snapshot
```

#### `fill <element> <value>`
Fill in a form field. Use for login forms, search boxes, and filters.
```
fill "Search" "Master Services Agreement"
fill "Username" "user@example.com"
fill "Password" "..."
```

#### `select <element> <value>`
Select an option from a dropdown.
```
select "Document Type" "Contracts"
select "Sort By" "Date Modified"
```

#### `hover <element>`
Hover over an element to reveal tooltips or dropdown menus.

#### `scroll <direction> [amount]`
Scroll the page. Direction: up, down, left, right.
```
scroll down 500
scroll down  # scrolls one viewport
```

### Screenshots & Evidence

#### `screenshot [filename]`
Take a screenshot of the current page. Use for evidence capture, documenting web page states, or recording counterparty portal content.
```
screenshot                           # auto-named with timestamp
screenshot "data-room-index.png"     # custom filename
```

Screenshots are saved to the current working directory. For legal evidence, screenshots include:
- Timestamp in the filename
- The URL of the page
- Full-page capture

#### `screenshot <element>`
Take a screenshot of a specific element on the page.
```
screenshot "contract-section-4"
```

### Advanced

#### `js <code>`
Execute JavaScript on the page. Use for extracting structured data, interacting with complex web apps, or working around non-standard interfaces.
```
js document.querySelectorAll('.contract-clause').forEach(c => console.log(c.textContent))
js document.title
```

#### `console`
Show the browser's console output. Useful for debugging JavaScript interactions.

#### `network`
Show recent network requests. Useful for finding API endpoints that serve document content directly.
```
network
```

#### `responsive <width> <height>`
Set the viewport size. Useful when sites render differently on mobile/desktop.
```
responsive 1920 1080  # desktop
responsive 375 812    # mobile
```

#### `diff`
Compare the current page state against the previous snapshot. Shows what changed after an interaction.

### Tab Management

#### `tabs`
List all open tabs.

#### `tab <index>`
Switch to a specific tab by index.

#### `newtab <url>`
Open a URL in a new tab.

#### `closetab`
Close the current tab.

### Cookie & Authentication

#### `cookies import <file>`
Import cookies from a file (Netscape/Mozilla format or JSON). Use this to access authenticated portals and data rooms without re-entering credentials.
```
cookies import ~/cookies/dataroom.txt
```

**Important for legal work:** Many data rooms and client portals require authentication. Export your browser cookies using a browser extension and import them here to maintain your authenticated session.

#### `cookies export <file>`
Export current cookies to a file for reuse.

### Chaining Commands

#### `chain <cmd1> | <cmd2> | <cmd3>`
Execute multiple commands in sequence. Useful for multi-step workflows.
```
chain goto https://dataroom.example.com | click "Documents" | click "Contracts" | text
```

## Common Workflows

### Extract a Contract from a Data Room

```
1. cookies import ~/cookies/dataroom-cookies.txt
2. goto https://dataroom.intralinks.com/deal/12345
3. snapshot                                          # see the page structure
4. click "Documents"                                 # navigate to documents
5. click "Executed Agreements"                        # find the right folder
6. links                                             # list available documents
7. click "MSA - Acme Corp - Executed.pdf"            # open the document
8. text                                              # extract the text
```

### Research a Legal Question

```
1. goto https://www.law.cornell.edu/uscode/text/15/chapter-2A
2. text                                              # read the statute
3. screenshot "ftc-act-section-5.png"                # capture for reference
```

### Capture Evidence Screenshot

```
1. goto https://counterparty-website.com/terms-of-service
2. screenshot "counterparty-tos-2026-03-13.png"       # timestamped capture
3. text                                              # extract text for analysis
```

### Download from Cloud Storage

```
1. cookies import ~/cookies/google-drive.txt
2. goto https://drive.google.com/drive/folders/abc123
3. links                                             # list files
4. click "Q1 Vendor Agreements"                      # navigate to folder
5. click "Vendor-MSA-Draft-v3.docx"                  # select file
6. click "Download"                                  # trigger download
```

## Security Notes

- **Cookie files contain credentials.** Store them securely and do not commit them to git.
- **Data room content is confidential.** Extracted text should be treated with the same confidentiality as the original document.
- **Screenshots may contain privileged information.** Label and store them appropriately.
- **Session cookies expire.** If access fails, re-export fresh cookies from your browser.
