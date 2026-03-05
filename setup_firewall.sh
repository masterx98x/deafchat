#!/usr/bin/env bash
# DeafChat – Setup firewall rules for coturn TURN server
# Run on the VPS as root: sudo bash setup_firewall.sh
set -euo pipefail

echo "══════════════════════════════════════════════"
echo "  DeafChat – Firewall Setup per coturn"
echo "══════════════════════════════════════════════"
echo ""

# Detect firewall tool
if command -v ufw &>/dev/null; then
    echo "[INFO] Rilevato: ufw"
    echo ""

    echo "[1/4] Apertura porta 3478 TCP (TURN signaling)..."
    ufw allow 3478/tcp comment "coturn TURN TCP"

    echo "[2/4] Apertura porta 3478 UDP (TURN signaling)..."
    ufw allow 3478/udp comment "coturn TURN UDP"

    echo "[3/4] Apertura porte 49152-65535 UDP (TURN relay range)..."
    ufw allow 49152:65535/udp comment "coturn relay range"

    echo "[4/4] Ricaricamento regole..."
    ufw reload

    echo ""
    echo "✓ Regole aggiunte. Stato attuale:"
    ufw status numbered | grep -E "(3478|49152|coturn)" || echo "(nessuna regola coturn trovata)"

elif command -v firewall-cmd &>/dev/null; then
    echo "[INFO] Rilevato: firewalld"
    echo ""

    echo "[1/4] Apertura porta 3478 TCP..."
    firewall-cmd --permanent --add-port=3478/tcp

    echo "[2/4] Apertura porta 3478 UDP..."
    firewall-cmd --permanent --add-port=3478/udp

    echo "[3/4] Apertura porte 49152-65535 UDP..."
    firewall-cmd --permanent --add-port=49152-65535/udp

    echo "[4/4] Ricaricamento..."
    firewall-cmd --reload

    echo ""
    echo "✓ Regole aggiunte."
    firewall-cmd --list-ports

elif command -v iptables &>/dev/null; then
    echo "[INFO] Rilevato: iptables (nessun ufw/firewalld)"
    echo ""

    echo "[1/4] Apertura porta 3478 TCP..."
    iptables -A INPUT -p tcp --dport 3478 -j ACCEPT

    echo "[2/4] Apertura porta 3478 UDP..."
    iptables -A INPUT -p udp --dport 3478 -j ACCEPT

    echo "[3/4] Apertura porte 49152-65535 UDP..."
    iptables -A INPUT -p udp --dport 49152:65535 -j ACCEPT

    echo "[4/4] Salvataggio regole..."
    if command -v netfilter-persistent &>/dev/null; then
        netfilter-persistent save
    elif command -v iptables-save &>/dev/null; then
        iptables-save > /etc/iptables/rules.v4 2>/dev/null || iptables-save > /etc/iptables.rules 2>/dev/null || true
    fi

    echo ""
    echo "✓ Regole aggiunte."
else
    echo "[ERRORE] Nessun firewall rilevato (ufw, firewalld, iptables)"
    echo "Se usi un cloud provider (AWS, GCP, Azure, Hetzner), apri le porte dal pannello di controllo:"
    echo "  - 3478 TCP/UDP"
    echo "  - 49152-65535 UDP"
fi

echo ""
echo "══════════════════════════════════════════════"
echo "  Verifica connettività TURN"
echo "══════════════════════════════════════════════"
echo ""

# Quick test: is coturn listening?
if command -v ss &>/dev/null; then
    echo "[CHECK] Porte in ascolto su 3478:"
    ss -tulnp | grep 3478 || echo "  ⚠ Nessun processo in ascolto su 3478!"
    echo ""
fi

# Quick test: is coturn container running?
if command -v docker &>/dev/null; then
    echo "[CHECK] Container coturn:"
    docker ps --filter name=deafchat-turn --format "  {{.Names}} | {{.Status}} | {{.Ports}}" || echo "  ⚠ Container non trovato"
    echo ""

    echo "[CHECK] Ultimi log coturn:"
    docker logs deafchat-turn --tail 15 2>&1 | sed 's/^/  /'
    echo ""
fi

# Test TURN allocation with turnutils_uclient if available
if command -v turnutils_uclient &>/dev/null; then
    echo "[CHECK] Test allocazione TURN..."
    timeout 5 turnutils_uclient -t -u deafchat -w deafchat-turn-secret 127.0.0.1 2>&1 | tail -5 | sed 's/^/  /' || echo "  ⚠ Allocazione fallita"
else
    echo "[INFO] turnutils_uclient non installato. Per installarlo:"
    echo "  apt install coturn-utils   (Debian/Ubuntu)"
    echo "  yum install coturn-utils   (CentOS/RHEL)"
fi

echo ""
echo "══════════════════════════════════════════════"
echo "  Test da browser:"
echo "  https://deafchat.deafnews.it/turn-test"
echo "══════════════════════════════════════════════"
