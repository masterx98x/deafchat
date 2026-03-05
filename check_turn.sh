#!/usr/bin/env bash
# DeafChat – Diagnostica TURN server
# Esegui sul server: bash check_turn.sh

set -e
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok() { echo -e "${GREEN}✅ $1${NC}"; }
fail() { echo -e "${RED}❌ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }

echo "========================================="
echo "  DeafChat TURN Server Diagnostics"
echo "========================================="
echo ""

# 1. Check coturn container
echo "--- 1. Container coturn ---"
if docker ps --format '{{.Names}}' | grep -q deafchat-turn; then
  ok "Container deafchat-turn è in esecuzione"
else
  fail "Container deafchat-turn NON è in esecuzione!"
  echo "   Prova: docker compose up -d coturn"
  echo "   Log:   docker compose logs coturn"
fi

echo ""
echo "--- 2. Porte in ascolto ---"
# Check port 3478
if ss -tuln | grep -q ':3478 ' 2>/dev/null || netstat -tuln 2>/dev/null | grep -q ':3478 '; then
  ok "Porta 3478 (TURN) in ascolto"
else
  fail "Porta 3478 (TURN) NON in ascolto!"
fi

# Check port 5349
if ss -tuln | grep -q ':5349 ' 2>/dev/null || netstat -tuln 2>/dev/null | grep -q ':5349 '; then
  ok "Porta 5349 (TURNS) in ascolto"
else
  warn "Porta 5349 (TURNS/TLS) non in ascolto (opzionale senza TLS cert)"
fi

echo ""
echo "--- 3. Firewall (iptables) ---"
if command -v iptables &>/dev/null; then
  if iptables -L INPUT -n 2>/dev/null | grep -q '3478'; then
    ok "Regola firewall per porta 3478 presente"
  else
    warn "Nessuna regola iptables esplicita per 3478 (potrebbe essere aperta di default)"
  fi
else
  warn "iptables non disponibile, controlla il firewall manualmente"
fi

# ufw check
if command -v ufw &>/dev/null; then
  echo ""
  echo "   UFW status:"
  ufw status 2>/dev/null | head -20 || true
fi

echo ""
echo "--- 4. Test connettività TURN dall'esterno ---"
IP="46.224.187.181"
echo "   IP pubblico configurato: $IP"

# Quick UDP test
if command -v nc &>/dev/null; then
  if echo -n "" | nc -u -w2 "$IP" 3478 2>/dev/null; then
    ok "UDP 3478 raggiungibile (basic test)"
  else
    warn "UDP 3478 potrebbe non essere raggiungibile dall'esterno"
  fi
fi

# TCP test
if command -v nc &>/dev/null; then
  if nc -z -w3 "$IP" 3478 2>/dev/null; then
    ok "TCP 3478 raggiungibile"
  else
    fail "TCP 3478 NON raggiungibile dall'esterno!"
  fi
fi

echo ""
echo "--- 5. Test TURN con turnutils_uclient ---"
if command -v turnutils_uclient &>/dev/null; then
  echo "   Testing TURN allocation..."
  if timeout 5 turnutils_uclient -t -u deafchat -w deafchat-turn-secret "$IP" 2>&1 | grep -q "allocate"; then
    ok "TURN allocation riuscita!"
  else
    fail "TURN allocation fallita"
  fi
else
  warn "turnutils_uclient non installato (apt install coturn per averlo)"
  echo "   Test manuale: turnutils_uclient -t -u deafchat -w deafchat-turn-secret $IP"
fi

echo ""
echo "--- 6. Log coturn (ultime 20 righe) ---"
docker logs deafchat-turn --tail 20 2>&1 || echo "   (impossibile leggere i log)"

echo ""
echo "--- 7. Test API ice-config ---"
if command -v curl &>/dev/null; then
  RESPONSE=$(curl -s http://localhost:8000/api/ice-config 2>/dev/null)
  if echo "$RESPONSE" | grep -q "turn:"; then
    ok "API /api/ice-config ritorna server TURN"
    echo "   $RESPONSE" | head -5
  else
    fail "API /api/ice-config NON contiene server TURN!"
    echo "   Response: $RESPONSE"
  fi
fi

echo ""
echo "========================================="
echo "  Diagnostica completata"
echo "========================================="
echo ""
echo "Se le porte non sono aperte, esegui:"
echo "  sudo ufw allow 3478/tcp"
echo "  sudo ufw allow 3478/udp"
echo "  sudo ufw allow 5349/tcp"
echo "  sudo ufw allow 5349/udp"
echo "  sudo ufw allow 49152:65535/udp"
echo ""
echo "Oppure con iptables:"
echo "  sudo iptables -A INPUT -p tcp --dport 3478 -j ACCEPT"
echo "  sudo iptables -A INPUT -p udp --dport 3478 -j ACCEPT"
echo "  sudo iptables -A INPUT -p tcp --dport 5349 -j ACCEPT"
echo "  sudo iptables -A INPUT -p udp --dport 5349 -j ACCEPT"
echo "  sudo iptables -A INPUT -p udp --dport 49152:65535 -j ACCEPT"
