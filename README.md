# 🧪 КМІ / Aruba ACSA — Інтерактивний Навчальний Симулятор (ДУІКТ ШІД-21)

Єдиний веб-додаток, що об'єднує всі інтерактивні лабораторії, теоретичні вижимки, глосарій термінів та екзаменаційний тренажер для курсу **«Конвергентна мережна інфраструктура, ч. I (Aruba Certified Switching Associate — ACSA)»**.

## Модулі
- **Блок 1 (Лекції 1–4 · Labs 1–6):**
  1. OSI / TCP-IP, TCP 3-Way Handshake та MAC-таблиця комутатора (L2 Learning / Flooding)
  2. 802.1Q VLAN (HPE Aruba `untagged`/`tagged` vs Cisco) та DHCP DORA / ARP
  3. STP / RSTP / MSTP (коректний розрахунок зв'язності, Root Bridge, RP/DP/AP) та LACP (`trk1`)
  4. Інтерактивний CLI-термінал **HPE ArubaOS-Switch (ProVision)** із пресетами **Labs 1–6** (включно з Flash/TFTP та IP Routing)
- **Блок 2 (Лекції 5–7 · Lab 6):**
  5. Бінарний калькулятор CIDR (`/1../32`) та оптимальний розбивач VLSM
  6. Таблиця маршрутизації: Longest Prefix Match (LPM) vs Administrative Distance (AD)
  7. VRRP (RFC 5798): Master/Backup failover, Preempt, Tie-Breaker по найбільшому IP та Skew Time
  8. OSPFv2 Single-Area: детектор помилок сусідства (Hello/Area/Mask/Auth/MTU), вибори DR/BDR, Wildcard Mask і Cost
- **Блок 3 (Лекції 8–9 · Lab 7 · Екзамен):**
  9. Aruba VSF Stacking: Ring vs Chain, Split-Brain MAD та порівняння VSF vs Backplane Stacking
  10. SNMP v1/v2c/v3 (UDP 161/162), RMON, sFlow, Syslog (0–7), FCAPS та Aruba NetEdit 2.0
  11. Wi-Fi SMB (Lab 7: 2.4/5 ГГц, VSC/VLAN 50) та калькулятор PoE-бюджету (802.3af/at/bt)
  12. Екзамен-тренажер на **24 питання** по всіх 9 темах із фільтром, поясненнями та розбором помилок

## Запуск локально
Просто відкрий `index.html` у будь-якому браузері — проєкт не потребує серверу чи інтернету.

## Публікація на GitHub Pages
1. Запуш репозиторій на GitHub (`main` branch).
2. У налаштуваннях репозиторію: **Settings → Pages → Source: Deploy from a branch → `main` / `/ (root)`**.
3. Через 1 хвилину сайт буде доступний за адресою `https://<username>.github.io/<repo-name>/`.
