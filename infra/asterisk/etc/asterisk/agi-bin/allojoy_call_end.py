#!/usr/bin/env python3
"""AGI : appelé au raccroché — notifie l'API de la fin d'appel."""

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

args      = sys.argv[1:]
call_id   = args[0] if len(args) > 0 else agi_env.get('agi_uniqueid', 'unknown')
end_epoch = int(args[1]) if len(args) > 1 else 0
start_str = agi_env.get('agi_channel_start', '')

# Calculer la durée depuis CHANNEL(start)
duration = 0
try:
    start_epoch = int(agi_env.get('CDR(start_epoch)', '0'))
    if start_epoch and end_epoch:
        duration = max(0, end_epoch - start_epoch)
except ValueError:
    pass

api_url = os.environ.get('API_URL', 'http://api:3000')
payload = json.dumps({
    'callId':         call_id,
    'dureeSecondes':  duration,
}).encode()

try:
    req = urllib.request.Request(
        f'{api_url}/webhooks/call-ended',
        data=payload,
        headers={'Content-Type': 'application/json'},
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=3) as resp:
        agi_verbose(f'call-ended OK: {resp.status}')
except urllib.error.URLError as e:
    agi_verbose(f'call-ended WARN: {e.reason}')
except Exception as e:
    agi_verbose(f'call-ended ERR: {e}')

sys.exit(0)
