"""Serve the included web app for testing on a phone on the same Wi-Fi."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
import socket

parser = argparse.ArgumentParser()
parser.add_argument('--port', type=int, default=8000)
args = parser.parse_args()
web = Path(__file__).resolve().parent / 'web'
if not (web / 'index.html').is_file():
    raise SystemExit('Run the copy of start_testing.py included in the extracted mobile test package.')
address = 'YOUR-COMPUTER-IP'
try:
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as probe:
        probe.connect(('192.0.2.1', 9))  # Determines the route without sending a packet.
        address = probe.getsockname()[0]
except OSError:
    pass
server = ThreadingHTTPServer(('0.0.0.0', args.port), partial(SimpleHTTPRequestHandler, directory=str(web)))
print('\nPourMind phone test server is running.', flush=True)
print('Connect your iPhone to the same Wi-Fi as this computer.', flush=True)
print(f'Open http://{address}:{args.port}/ in Safari.', flush=True)
print('This is browser test mode. Home Screen installation and offline use require an HTTPS host.', flush=True)
print('Keep this window open. Press Ctrl+C to stop.\n', flush=True)
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
