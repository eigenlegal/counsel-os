# Test samples from public benchmarks

A few rows of each benchmark, in the publisher's own file shape, so the loaders' tests run without the network. Each sample is a hand-copied excerpt, shortened where a document was long, and stays under the source's license:

- `legalbench/cuad_governing_law/` — three test rows, the base prompt and the task README from LegalBench (Guha et al., 2023; `huggingface.co/datasets/nguha/legalbench`, `github.com/HazyResearch/legalbench`), CC BY 4.0. The clauses derive from CUAD.
- `cuad/CUAD_v1.json` — one contract's first 800 characters and three of its 41 questions from CUAD (Hendrycks et al., 2021; The Atticus Project, `huggingface.co/datasets/theatticusproject/cuad`), CC BY 4.0.
- `maud/MAUD_test.csv` — three test rows, clauses cut to 400 characters, from MAUD (Wang et al., 2023; The Atticus Project, `huggingface.co/datasets/theatticusproject/maud`), CC BY 4.0.
- `contract-nli/test.json` — one NDA's first 1,500 characters with two of its 17 hypotheses from ContractNLI (Koreeda & Manning, 2021; `stanfordnlp.github.io/contract-nli`), CC BY 4.0.

Nothing from BigLaw Bench: it publishes no license.
