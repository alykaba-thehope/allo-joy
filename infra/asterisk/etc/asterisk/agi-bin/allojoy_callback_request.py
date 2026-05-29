#!/usr/bin/env python3
"""AGI : citoyen demande un rappel (file pleine / timeout)."""

import sys
import os
import json
import urllib.request
import urllib.error

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

args          = sys.argv[1:]
call_id       = args[0] if len(args) > 0 else 'unknown'
citizen_phone = args[1] if len(args) > 1 else agi_env.get('agi_callerid', 'unknown')

api_url = os.environ.get('API_URL', 'http://api:3000')
payload = json.dumps({
    'phone': citizen_phone,
    'callId': call_id,
    'requestedAt': __import__('datetime').datetime.utcnow().isoformat() + 'Z',
}).encode()

try:
    req = urllib.request.Request(
        f'{api_url}/api/callbacks',
        data=payload,
        headers={'Content-Type': 'application/json'},
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=3) as resp:
        agi_verbose(f'callback-request OK: {resp.status}')
except Exception as e:
    agi_verbose(f'callback-request ERR: {e}')

sys.exit(0)
