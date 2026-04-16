#!/bin/bash
# Batch classify OG descriptions using Codex CLI (GPT).
# Reads /tmp/og_desc_informative.json, outputs /tmp/og_categories_result.jsonl
# Each line: {"description": "...", "primary": "category_id", "secondary": ["..."]}

INPUT="/tmp/og_desc_informative.json"
OUTPUT="/tmp/og_categories_result.jsonl"
BATCH_SIZE=50
MODEL="gpt-5.4"

CATEGORIES='1. kinase — Kinase, phosphatase, MAPK, CDPK, protein kinase
2. receptor — Receptor, receptor-like protein (NOT receptor-like kinase)
3. tf — Transcription factor, MYB, WRKY, bZIP, bHLH, NAC, homeobox, zinc finger TF, AP2
4. signaling — Signal transduction, hormone signaling (auxin, GA, ABA, ethylene, cytokinin), calcium signaling
5. transporter — Transporter, channel, permease, aquaporin, ABC transporter, carrier protein
6. defense — Disease resistance, NBS-LRR, NB-ARC, pathogenesis, defense, immune, R protein
7. photosynthesis — Photosynthesis, chloroplast, plastid, light harvesting, rubisco
8. flowering — Flowering time, circadian, photoperiod, heading date, vernalization
9. starch — Starch, grain quality, amylose, amylopectin, endosperm, seed storage
10. cell_wall — Cell wall, cellulose, pectin, expansin, xyloglucan, lignin
11. transposon — Transposon, retrotransposon, transposable element, reverse transcriptase, integrase
12. ribosomal — Ribosomal, ribosome, translation, tRNA, rRNA, elongation factor
13. metabolism — Enzyme, oxidase, reductase, hydrolase, transferase, synthase, ligase, isomerase, P450, cytochrome
14. structural — Cytoskeleton, tubulin, actin, structural protein, histone, chromatin
15. ubiquitin — Ubiquitin, proteasome, F-box, SCF complex, E3 ligase, protein degradation
16. repeat_domain — PPR (pentatricopeptide repeat), LRR repeat (non-NLR), WD40, TPR, ARM repeat, ankyrin
17. other — Does not fit any above category'

> "$OUTPUT"
TOTAL=$(node -e "console.log(require('$INPUT').length)")
echo "Total descriptions: $TOTAL, batch size: $BATCH_SIZE, model: $MODEL"

for ((START=0; START<TOTAL; START+=BATCH_SIZE)); do
  END=$((START + BATCH_SIZE))
  BATCH_NUM=$((START / BATCH_SIZE + 1))
  TOTAL_BATCHES=$(( (TOTAL + BATCH_SIZE - 1) / BATCH_SIZE ))
  echo "Batch $BATCH_NUM/$TOTAL_BATCHES (items $START-$END)..."

  DESCRIPTIONS=$(node -e "
    const d = require('$INPUT');
    const batch = d.slice($START, $END);
    const lines = batch.map((b, i) => ($START + i) + '. ' + b.description);
    console.log(lines.join('\n'));
  ")

  PROMPT="Classify each gene function description into exactly ONE primary category and optionally ONE secondary category.

Categories:
$CATEGORIES

Descriptions to classify:
$DESCRIPTIONS

Return ONLY a JSON array, one object per description, in order:
[{\"i\": 0, \"p\": \"primary_category_id\", \"s\": \"secondary_or_null\"}]
No explanation. Just the JSON array."

  RESULT=$(echo "$PROMPT" | codex exec --skip-git-repo-check --sandbox read-only --full-auto -m "$MODEL" - 2>/dev/null | grep -o '\[.*\]' | tail -1)

  if [ -z "$RESULT" ]; then
    echo "  WARNING: empty result for batch $BATCH_NUM, skipping"
    continue
  fi

  # Merge batch result with description text
  node -e "
    const d = require('$INPUT');
    const batch = d.slice($START, $END);
    const result = $RESULT;
    for (let i = 0; i < result.length && i < batch.length; i++) {
      const r = result[i];
      console.log(JSON.stringify({
        description: batch[i].description,
        ogCount: batch[i].count,
        primary: r.p || 'other',
        secondary: r.s || null,
      }));
    }
  " >> "$OUTPUT"

  echo "  Done ($( wc -l < "$OUTPUT" | tr -d ' ') total so far)"
done

echo "=== Complete: $( wc -l < "$OUTPUT" | tr -d ' ') descriptions classified ==="
echo "Output: $OUTPUT"
