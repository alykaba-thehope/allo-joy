FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    asterisk \
    curl \
    python3 \
    python3-requests \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Config personnalisée
COPY etc/asterisk/ /etc/asterisk/

# AGI scripts
RUN chmod +x /etc/asterisk/agi-bin/*.py 2>/dev/null || true

EXPOSE 5060/udp 5060/tcp 10000-10100/udp 8088/tcp

CMD ["asterisk", "-f", "-vvv"]
