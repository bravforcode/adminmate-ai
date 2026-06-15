import os, re, glob

emoji_pattern = re.compile(
    '[\U0001F300-\U0001FAFF\U0001F600-\U0001F64F\U0001F680-\U0001F6FF'
    '\U0001F900-\U0001F9FF\u2600-\u27BF\u2B50\u2705\u274C\u26A0\uFE0F'
    '\u00A9\u00AE\u2122\u23CF\u23F3\u23F0\u231A\u231B\u2328\u23CF'
    '\U0001F1E0-\U0001F1FF\u2702\u2708]', re.UNICODE)

for ext in ['*.tsx', '*.ts']:
    for f in sorted(glob.glob(f'src/**/{ext}', recursive=True)):
        try:
            with open(f, 'r', encoding='utf-8') as fh:
                for i, line in enumerate(fh, 1):
                    matches = emoji_pattern.findall(line)
                    if matches:
                        print(f"{f}:{i}: EM({','.join(set(matches))})")
        except Exception as e:
            print(f"Error reading {f}: {e}")
