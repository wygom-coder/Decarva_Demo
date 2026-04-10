import esprima

with open('js/market_supabase.js', 'r') as f:
    code = f.read()

# Replace optional chaining to avoid esprima error
code = code.replace('?.', '.')

try:
    esprima.parseScript(code)
    print("JS is perfectly valid!")
except Exception as e:
    print(f"JS Syntax Error: {e}")
