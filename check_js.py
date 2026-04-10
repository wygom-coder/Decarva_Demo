import esprima
import json
import sys

try:
    with open('js/market_supabase.js', 'r') as f:
        code = f.read()
    esprima.parseScript(code)
    print("JS is perfectly valid!")
except Exception as e:
    print(f"JS Syntax Error: {e}")
