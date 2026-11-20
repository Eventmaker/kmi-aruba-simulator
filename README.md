# 🧪 Aruba ACSA — Інтерактивний мережевий симулятор

Веб-додаток із набором інтерактивних лабораторій, теоретичних вижимок, глосарію термінів та тренажера питань для вивчення комп'ютерних мереж і підготовки до сертифікації **Aruba Certified Switching Associate (ACSA)**.

**Онлайн-версія:** https://eventmaker.github.io/kmi-aruba-simulator/

## Модулі
- **Блок 1 · L1–L2 та CLI:**
  1. OSI / TCP-IP, TCP 3-Way Handshake та MAC-таблиця комутатора (L2 Learning / Flooding)
  2. 802.1Q VLAN (HPE Aruba `untagged`/`tagged` vs Cisco) та DHCP DORA / ARP
  3. STP / RSTP / MSTP (розрахунок зв'язності, Root Bridge, RP/DP/AP) та LACP (`trk1`)
  4. Інтерактивний CLI-термінал **HPE ArubaOS-Switch (ProVision)** із готовими сценаріями Labs 1–6 (включно з Flash/TFTP та IP Routing)
- **Блок 2 · L3, VRRP та OSPF:**
  5. Бінарний калькулятор CIDR (`/1../32`), Wildcard Mask та оптимальний розбивач VLSM
  6. Таблиця маршрутизації: Longest Prefix Match (LPM) vs Administrative Distance (AD)
  7. VRRP (RFC 5798): Master/Backup failover, Preempt, Tie-Breaker по найбільшому IP та Skew Time
  8. OSPFv2 Single-Area: детектор помилок сусідства (Hello/Area/Mask/Auth/MTU), вибори DR/BDR та Cost
- **Блок 3 · VSF, SNMP, Wi-Fi та Тести:**
  9. Aruba VSF Stacking: Ring vs Chain, Split-Brain MAD та порівняння VSF vs Backplane Stacking
  10. SNMP v1/v2c/v3 (UDP 161/162), RMON, sFlow, Syslog (0–7), FCAPS та Aruba NetEdit 2.0
  11. Wi-Fi (2.4/5 ГГц, VSC/VLAN 50) та калькулятор PoE-бюджету (802.3af/at/bt)
  12. Екзамен-тренажер на **24 питання** з фільтром по блоках, поясненнями та розбором помилок

## Запуск локально
Відкрий `index.html` у будь-якому сучасному браузері — проєкт не потребує серверу чи інтернету.
