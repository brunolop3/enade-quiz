#!/bin/bash
# Restore the 15 ENADE 2025 Administracao Formacao Geral questions to the bank,
# create a session, and import them into it.
#
# This version authenticates against /api/admin/auth first (the previous
# upload/import_adm.sh failed with HTTP 401 because the question-bank POST
# endpoint requires an x-admin-token header).
set -e

BASE_URL="http://localhost:3000"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-enade2024}"

echo "=== Logging in as admin ==="
ADMIN_TOKEN=$(python3 -c "
import json, urllib.request
data = json.dumps({'password': '$ADMIN_PASSWORD'}).encode('utf-8')
req = urllib.request.Request('$BASE_URL/api/admin/auth', data=data, headers={'Content-Type':'application/json'}, method='POST')
with urllib.request.urlopen(req) as resp:
    result = json.loads(resp.read())
    print(result.get('token',''))
")
if [ -z "$ADMIN_TOKEN" ]; then
    echo "❌ Failed to obtain admin token"
    exit 1
fi
echo "✅ Got admin token: ${ADMIN_TOKEN:0:8}..."

echo ""
echo "=== Importing 15 questions to question bank ==="
python3 << PYEOF
import json
import urllib.request

BASE_URL = "$BASE_URL"
TOKEN = "$ADMIN_TOKEN"

with open('/home/z/my-project/upload/adm_questions.json', 'r') as f:
    questions = json.load(f)

bank_ids = []
for i, q in enumerate(questions, 1):
    data = json.dumps(q).encode('utf-8')
    req = urllib.request.Request(
        BASE_URL + '/api/question-bank',
        data=data,
        headers={'Content-Type': 'application/json', 'x-admin-token': TOKEN},
        method='POST'
    )
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read())
        bank_ids.append(result['id'])
        print(f"  Q{i:02d} saved -> {result['id']}  | {q.get('title','')[:60]}")

with open('/home/z/my-project/upload/adm_bank_ids.json', 'w') as f:
    json.dump(bank_ids, f)

print(f"\nAll {len(bank_ids)} questions saved to bank.")
PYEOF

echo ""
echo "=== Creating session for ENADE 2025 Administracao Formacao Geral ==="
python3 << PYEOF
import json
import urllib.request

BASE_URL = "$BASE_URL"
TOKEN = "$ADMIN_TOKEN"

# Create session
session_data = json.dumps({"title": "ENADE 2025 — Administração (Formação Geral)"}).encode('utf-8')
req = urllib.request.Request(
    BASE_URL + '/api/session',
    data=session_data,
    headers={'Content-Type': 'application/json', 'x-admin-token': TOKEN},
    method='POST'
)
with urllib.request.urlopen(req) as resp:
    session = json.loads(resp.read())
    print(f"Session created: code={session['code']}, id={session['id']}")
    print(f"  Title: {session['title']}")

# Import all questions from bank to this session
with open('/home/z/my-project/upload/adm_bank_ids.json', 'r') as f:
    bank_ids = json.load(f)

import_data = json.dumps({
    "sessionCode": session['code'],
    "questionIds": bank_ids,
}).encode('utf-8')

req = urllib.request.Request(
    BASE_URL + '/api/question-bank/import',
    data=import_data,
    headers={'Content-Type': 'application/json', 'x-admin-token': TOKEN},
    method='POST'
)
with urllib.request.urlopen(req) as resp:
    result = json.loads(resp.read())
    print(f"\nImported {result['imported']} questions into session {session['code']}")
    print(f"\n=== SESSION CODE: {session['code']} ===")
    print(f"\nYou can access:")
    print(f"  Admin:      /admin")
    print(f"  Votar:      /votar/{session['code']}")
    print(f"  Apresentar: /apresentacao/{session['code']}")

with open('/home/z/my-project/upload/adm_session.json', 'w') as f:
    json.dump({"code": session['code'], "id": session['id'], "title": session['title']}, f, indent=2)
PYEOF

echo ""
echo "✅ Done!"
