"""Clean a source CSV, deduplicate product names and retain diagnostics."""
import argparse
import pandas as pd

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('input'); parser.add_argument('output')
    args = parser.parse_args()
    data = pd.read_csv(args.input)
    data['name'] = data['name'].str.strip()
    data['price'] = pd.to_numeric(data['price'], errors='coerce')
    before = len(data)
    data = data.dropna(subset=['name', 'price', 'thumbnail'])
    data = data[data['price'] > 0].drop_duplicates(subset=['name'])
    data.to_csv(args.output, index=False, encoding='utf-8-sig')
    print({'input': before, 'output': len(data), 'removed': before - len(data)})
