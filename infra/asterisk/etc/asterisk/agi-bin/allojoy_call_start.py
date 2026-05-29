#!/usr/bin/env python3
"""AGI : appelé au début de chaque appel — notifie l'API AlloJoy."""

import sys
import os
import json
import urllib.request
import urllib.error
from datetime import datetime, timezone

# Lire les variables AGI depuis stdin
agi_env = {}
while True:
    line = sys.stdin.readline().strip()
    if not line:
        break
    if ':' in line:
        key, _, value = line.partition(':')
        agi_env[key.strip()] = value.strip()

def agi_verbose(msg):
    sys.stdout.write(f'VERBOSE "{msg}" 1\n')
    sys.stdout.flush()
    sys.stdin.readline()

def agi_set_variable(name, value):
    sys.stdout.write(f'SET VARIABLE {name} "{value}"\n')
    sys.stdout.flush()
    sys.stdin.readline()

# Args passés depuis le dialplan : CALL_ID CITIZEN_PHONE
args = sys.argv[1:]
call_id      = args[0] if len(args) > 0 else agi_env.get('agi_uniqueid', 'unknown')
citizen_phone = args[1] if len(args) > 1 else agi_env.get('agi_callerid', 'unknown')
langue        = args[2] if len(args) > 2 else 'fr'

api_url = os.environ.get('API_URL', 'http://api:3000')
payload = json.dumps({
    'callId':       call_id,
    'citizenPhone': citizen_phone,
    'langue':       langue,
    'startedAt':    datetime.now(timezone.utc).isoformat(),
}).encode()

try:
    req = urllib.request.Request(
        f'{api_url}/webhooks/call-started',
        data=payload,
        headers={'Content-Type': 'application/json'},
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=3) as resp:
        agi_verbose(f'call-started OK: {resp.status}')
except urllib.error.URLError as e:
    agi_verbose(f'call-started WARN: {e.reason}')
except Exception as e:
    agi_verbose(f'call-started ERR: {e}')

sys.exit(0)
