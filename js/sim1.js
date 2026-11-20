/* Sim 1: OSI/TCP-IP, MAC Learning, 802.1Q VLAN, DHCP DORA, STP/MSTP, LACP & ArubaOS CLI (Labs 1-6) */
(function () {
  const OSI = [
    { n: 7, name: "Application (Прикладний)", pdu: "Data", prot: "HTTP/S, DNS, DHCP, SNMP, SSH", segs: [{ t: "App Data", c: "#6366f1" }], desc: "Інтерфейс мережевих сервісів із програмами користувача." },
    { n: 6, name: "Presentation (Представлення)", pdu: "Data", prot: "TLS/SSL, UTF-8, JPEG", segs: [{ t: "Encrypted Data", c: "#6366f1" }], desc: "Кодування, стиснення та шифрування даних." },
    { n: 5, name: "Session (Сеансовий)", pdu: "Data", prot: "RPC, SIP, NetBIOS", segs: [{ t: "Session + Data", c: "#6366f1" }], desc: "Відкриття, підтримка та закриття сеансів зв'язку." },
    { n: 4, name: "Transport (Транспортний)", pdu: "Segment / Datagram", prot: "TCP (3-Way Handshake), UDP (без з'єднання)", segs: [{ t: "TCP/UDP Header", c: "#0284c7" }, { t: "Data", c: "#6366f1" }], desc: "Порти (22, 53, 67/68, 80, 161/162, 443), контроль потоку, сегментація." },
    { n: 3, name: "Network (Мережевий)", pdu: "Packet (Пакет)", prot: "IPv4, IPv6, ICMP, OSPF, VRRP", segs: [{ t: "IP Header", c: "#059669" }, { t: "L4", c: "#0284c7" }, { t: "Data", c: "#6366f1" }], desc: "Логічна IP-адресація та маршрутизація між підмережами (LPM)." },
    { n: 2, name: "Data Link (Канальний)", pdu: "Frame (Кадр)", prot: "Ethernet, 802.1Q VLAN, ARP, STP, LACP", segs: [{ t: "Eth + 802.1Q", c: "#d97706" }, { t: "IP Packet", c: "#059669" }, { t: "FCS (CRC)", c: "#dc2626" }], desc: "MAC-адресація (48 біт), комутація в LAN, тегування VLAN, перевірка помилок FCS." },
    { n: 1, name: "Physical (Фізичний)", pdu: "Bits (Біти)", prot: "1000BASE-T, SFP+ оптика, Wi-Fi", segs: [{ t: "01011010 11001010 00110101 ...", c: "#475569" }], desc: "Передача електричних, оптичних або радіосигналів у середовищі." }
  ];

  window.renderOsi = function (sel = 2) {
    const list = document.getElementById("osi-list");
    if (!list) return;
    list.innerHTML = OSI.map(l => `
      <div class="osi-layer ${l.n === sel ? "active" : ""}" onclick="renderOsi(${l.n})">
        <div><b>L${l.n} · ${l.name}</b><div class="muted" style="font-size:0.78rem;">${l.prot}</div></div>
        <span class="pill pill-b">${l.pdu}</span>
      </div>`).join("");
    const cur = OSI.find(l => l.n === sel);
    document.getElementById("pdu-bar").innerHTML = cur.segs.map(s => `<span class="pdu-seg" style="background:${s.c};">${s.t}</span>`).join("");
    document.getElementById("osi-desc").innerHTML = `<b>Рівень ${cur.n} (${cur.pdu}):</b> ${cur.desc}`;
  };

  let cam = {};
  function renderCam() {
    const tb = document.getElementById("cam-body");
    if (!tb) return;
    const entries = Object.entries(cam);
    tb.innerHTML = entries.length
      ? entries.map(([m, p]) => `<tr><td><code>${m}</code></td><td>Port ${p}</td><td><span class="pill pill-g">Dynamic</span></td></tr>`).join("")
      : '<tr><td colspan="3" class="muted">Таблиця CAM порожня</td></tr>';
  }

  window.sendMacFrame = function () {
    const [sn, smac, sp] = document.getElementById("mac-src").value.split("|");
    const [dn, dmac] = document.getElementById("mac-dst").value.split("|");
    const log = document.getElementById("mac-log");
    let msg = `[Frame] ${sn}(${smac}) -> ${dn}(${dmac}) прийшов на Port ${sp}\n`;
    if (!cam[smac]) { cam[smac] = sp; msg += `  + LEARN: Записано ${smac} => Port ${sp} у CAM-таблицю.\n`; }
    if (dmac === "FF:FF:FF") {
      msg += `  * BROADCAST: Розсилаємо на ВСІ порти крім Port ${sp} (Flooding).\n`;
    } else if (cam[dmac]) {
      msg += cam[dmac] === sp
        ? `  - FILTER: Отримувач на тому ж порту ${sp}, кадр відфільтровано.\n`
        : `  > FORWARD: Знайдено ${dmac} => Port ${cam[dmac]}. Пересилаємо ТІЛЬКИ на Port ${cam[dmac]}!\n`;
    } else {
      msg += `  * UNKNOWN UNICAST: ${dmac} немає в CAM -> FLOODING на всі порти крім Port ${sp}.\n`;
    }
    log.textContent = msg + "\n" + log.textContent;
    renderCam();
  };

  window.clearMacTable = function () {
    cam = {};
    renderCam();
    document.getElementById("mac-log").textContent = "CAM-таблицю очищено.";
  };

  // --- VLAN & DHCP ---
  window.simulateVlan = function () {
    const v1 = document.getElementById("v-p1").value;
    const v2 = document.getElementById("v-p2").value;
    const lnk = document.getElementById("v-link").value;
    let txt = `1. PC-A надсилає НЕТЕГОВАНИЙ кадр на Edge_1 Port 1.\n`;
    txt += `2. Edge_1 приймає кадр у VLAN ${v1} (Port 1 = untagged ${v1}).\n`;
    if (lnk === "untagged1") {
      txt += `3. [ПОМИЛКА!] Port 24 має лише untagged VLAN 1. Кадр VLAN ${v1} НЕ проходить!\n   Результат: ❌ PING FAILED.`;
    } else if (lnk === "only10" && v1 !== "10") {
      txt += `3. [ПОМИЛКА!] На Port 24 дозволено лише tagged VLAN 10, а кадр у VLAN ${v1} → DROP!\n   Результат: ❌ PING FAILED.`;
    } else {
      txt += `3. Edge_1 додає 4-байтний тег IEEE 802.1Q (TPID 0x8100, VID=${v1}) і шле через Port 24 (tagged).\n`;
      txt += `4. Edge_2 приймає тегований кадр (VID=${v1}).\n`;
      txt += v1 === v2
        ? `5. Port 1 на Edge_2 є untagged у VLAN ${v2} → тег 802.1Q ЗНІМАЄТЬСЯ, кадр доставлено PC-B!\n   Результат: ✅ PING SUCCESS (L2 в межах VLAN ${v1})!`
        : `5. [ІЗОЛЯЦІЯ L2!] PC-B у VLAN ${v2}, а кадр у VLAN ${v1}. L2-комутатор ізолює різні VLAN!\n   Результат: ❌ PING FAILED — потрібен L3-маршрутизатор (Inter-VLAN Routing / SVI)!`;
    }
    document.getElementById("vlan-res").textContent = txt;
  };

  const DORA = [
    { code: "D — Discover", dir: "0.0.0.0 → 255.255.255.255 (UDP 68→67)", desc: "Клієнт шукає DHCP-сервер. Якщо сервер в іншому VLAN, маршрутизатор пересилає запит завдяки `ip helper-address <DHCP-IP>`." },
    { code: "O — Offer", dir: "DHCP Server → Client", desc: "Сервер пропонує IP, маску, Default Gateway, DNS та Lease Time." },
    { code: "R — Request", dir: "Client → 255.255.255.255", desc: "Клієнт підтверджує вибір конкретного сервера (broadcast звільняє пропозиції інших)." },
    { code: "A — Acknowledge (ACK)", dir: "DHCP Server → Client", desc: "Сервер фіксує оренду; клієнт застосовує IP і робить Gratuitous ARP." }
  ];
  let doraIdx = 0;
  function renderDora() {
    const el = document.getElementById("dora-steps");
    if (!el) return;
    el.innerHTML = doraIdx === 0
      ? '<div class="muted">Натисни «Наступний крок DORA», щоб запустити процес.</div>'
      : DORA.slice(0, doraIdx).map((s, i) => `
          <div class="osi-layer active" style="flex-direction:column;align-items:flex-start;gap:4px;">
            <div><span class="pill pill-g">Крок ${i + 1}</span> <b>${s.code}</b> <span style="font-size:0.78rem;color:var(--accent);">${s.dir}</span></div>
            <div style="font-size:0.82rem;">${s.desc}</div>
          </div>`).join("");
  }
  window.nextDora = function () { doraIdx = Math.min(4, doraIdx + 1); renderDora(); };
  window.resetDora = function () { doraIdx = 0; renderDora(); };

  // --- STP / MSTP (Bug 1 Fixed: true connected components + per-end roles) ---
  const stpLinks = { l12: true, l13: true, l23: true };
  window.toggleStpLink = function (k) {
    stpLinks[k] = !stpLinks[k];
    const b = document.getElementById("btn-" + k);
    const label = k === "l12" ? "R1↔E1" : k === "l13" ? "R1↔E2" : "E1↔E2";
    b.textContent = `Лінк ${label}: ${stpLinks[k] ? "UP" : "DOWN"}`;
    b.className = "btn " + (stpLinks[k] ? "btn-green" : "btn-danger");
    window.calcStp();
  };

  function cmpBid(a, b) { return a.prio !== b.prio ? a.prio - b.prio : a.mac.localeCompare(b.mac); }

  window.calcStp = function () {
    const svg = document.getElementById("stp-svg");
    if (!svg) return;
    const sw = [
      { id: "R1", name: "Router_1", prio: +document.getElementById("p-r1").value, mac: "00:11:01", x: 270, y: 50 },
      { id: "E1", name: "Edge_1", prio: +document.getElementById("p-e1").value, mac: "00:22:02", x: 110, y: 195 },
      { id: "E2", name: "Edge_2", prio: +document.getElementById("p-e2").value, mac: "00:33:03", x: 430, y: 195 }
    ];
    const adj = { R1: [], E1: [], E2: [] };
    const edges = [
      { k: "l12", a: sw[0], b: sw[1], up: stpLinks.l12 },
      { k: "l13", a: sw[0], b: sw[2], up: stpLinks.l13 },
      { k: "l23", a: sw[1], b: sw[2], up: stpLinks.l23 }
    ];
    edges.forEach(e => { if (e.up) { adj[e.a.id].push(e.b.id); adj[e.b.id].push(e.a.id); } });

    // Connected components
    const visited = new Set();
    const roots = new Set();
    const compSummary = [];
    sw.forEach(node => {
      if (visited.has(node.id)) return;
      const q = [node.id];
      const comp = [];
      visited.add(node.id);
      while (q.length) {
        const cur = q.shift();
        comp.push(sw.find(s => s.id === cur));
        adj[cur].forEach(nb => { if (!visited.has(nb)) { visited.add(nb); q.push(nb); } });
      }
      comp.sort(cmpBid);
      roots.add(comp[0].id);
      compSummary.push(`Сегмент [${comp.map(c => c.name).join(", ")}] → ★ Root: ${comp[0].name} (${comp[0].prio}.${comp[0].mac})`);
    });

    const allUp = stpLinks.l12 && stpLinks.l13 && stpLinks.l23;
    let blockedKey = null;
    if (allUp) {
      const globalRoot = [...sw].sort(cmpBid)[0].id;
      blockedKey = globalRoot === "R1" ? "l23" : globalRoot === "E1" ? "l13" : "l12";
    }

    let h = "";
    edges.forEach(e => {
      const col = !e.up ? "#ef4444" : e.k === blockedKey ? "#fbbf24" : "#34d399";
      const dash = !e.up ? "4,4" : e.k === blockedKey ? "8,5" : "";
      h += `<line x1="${e.a.x}" y1="${e.a.y}" x2="${e.b.x}" y2="${e.b.y}" stroke="${col}" stroke-width="4" stroke-dasharray="${dash}"/>`;
      const mx = (e.a.x + e.b.x) / 2, my = (e.a.y + e.b.y) / 2;
      let lbl = "DOWN";
      if (e.up) {
        if (e.k === blockedKey) {
          const loser = cmpBid(e.a, e.b) < 0 ? e.b.id : e.a.id;
          lbl = `DP ↔ AP(${loser})`;
        } else {
          lbl = "DP ↔ RP (FWD)";
        }
      }
      h += `<rect x="${mx - 54}" y="${my - 11}" width="108" height="20" rx="5" fill="#0f172a" stroke="${col}"/>`;
      h += `<text x="${mx}" y="${my + 3}" text-anchor="middle" fill="${col}" font-size="10" font-weight="700" font-family="Consolas">${lbl}</text>`;
    });

    sw.forEach(s => {
      const isR = roots.has(s.id);
      h += `<rect x="${s.x - 64}" y="${s.y - 26}" width="128" height="52" rx="10" fill="${isR ? "#0c4a6e" : "#1e293b"}" stroke="${isR ? "#38bdf8" : "#475569"}" stroke-width="2"/>`;
      h += `<text x="${s.x}" y="${s.y - 4}" text-anchor="middle" fill="#fff" font-size="13" font-weight="700">${s.name}${isR ? " ★" : ""}</text>`;
      h += `<text x="${s.x}" y="${s.y + 14}" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="Consolas">Prio:${s.prio} | ${s.mac}</text>`;
    });
    svg.innerHTML = h;

    document.getElementById("stp-info").textContent =
      compSummary.join("\n") + "\n" +
      (blockedKey
        ? `• Виявлено фізичну петлю (трикутник)! Порт комутатора з вищим BID на лінку ${blockedKey === "l23" ? "E1↔E2" : blockedKey === "l13" ? "R1↔E2" : "R1↔E1"} переведено в Alternate (Discarding).\n`
        : `• Фізичної петлі немає — усі активні лінки у стані Forwarding (RSTP збіжність < 1 сек).\n`) +
      `• MSTP (802.1s): дозволяє мати окремі Root Bridge для різних інстансів VLAN (балансування трафіку).`;
  };

  window.calcLacp = function () {
    const el = document.getElementById("lacp-out");
    if (!el) return;
    const n = +document.getElementById("lacp-n").value;
    const spd = +document.getElementById("lacp-spd").value;
    el.textContent =
      `Команда ArubaOS: trunk 21-${20 + n} trk1 lacp\n` +
      `Сумарна пропускна здатність: ${n * spd} Gbps (Full-Duplex: ${n * spd * 2} Gbps)\n` +
      `STP сприймає trk1 як ОДИН логічний інтерфейс (петлі немає!).\n` +
      `Відмовостійкість: при обриві 1 кабелю трафік миттєво йде через решту ${n - 1} портів.`;
  };

  // --- ARUBA CLI (Bug 2 Fixed: strict validation + Lab 2 Flash/TFTP + Lab 6 IP Routing) ---
  let cli = {};
  window.resetCli = function () {
    cli = {
      hostname: "Edge_1", mode: "manager", curVlan: null,
      vlans: { 1: { name: "DEFAULT_VLAN", untagged: "1-24", tagged: "", ip: "dhcp" } },
      trunks: [], stp: false, mstpName: "", ipRouting: false, routes: [],
      bootFlash: "primary", saved: true
    };
    const out = document.getElementById("term-out");
    if (out) out.textContent = "ArubaOS-Switch Simulator (ProVision · Labs 1–6) Ready.\nType 'help' or click a Lab Preset above.\n";
    updatePrompt();
  };

  function updatePrompt() {
    const p = document.getElementById("term-prompt");
    const b = document.getElementById("cli-mode-badge");
    if (!p || !b) return;
    if (cli.mode === "manager") { p.textContent = `${cli.hostname}#`; b.textContent = "Mode: Manager (#)"; }
    else if (cli.mode === "config") { p.textContent = `${cli.hostname}(config)#`; b.textContent = "Mode: Global Config"; }
    else { p.textContent = `${cli.hostname}(vlan-${cli.curVlan})#`; b.textContent = `Mode: VLAN ${cli.curVlan}`; }
  }

  function appendTerm(txt) {
    const out = document.getElementById("term-out");
    if (!out) return;
    out.textContent += txt + "\n";
    out.scrollTop = out.scrollHeight;
  }

  function processCmd(raw) {
    const cmd = raw.trim();
    if (!cmd) return;
    appendTerm(`${document.getElementById("term-prompt").textContent} ${cmd}`);
    const parts = cmd.split(/\s+/);
    const c0 = parts[0].toLowerCase();

    if (c0 === "help" || c0 === "?") {
      appendTerm(`Команди ArubaOS ProVision (Labs 1–6):
  configure | conf t                - увійти в режим конфігурації
  exit | end                        - вийти на рівень вище / в Manager
  hostname <name>                   - змінити ім'я пристрою
  vlan <1..4094>                    - створити/відкрити VLAN (name, untagged, tagged, ip address)
  no vlan <id>                      - видалити VLAN
  trunk <ports> <trkN> lacp         - створити LACP LAG (напр. trunk 21-22 trk1 lacp)
  no trunk <trkN>                   - видалити LAG
  spanning-tree [config-name <n>]   - увімкнути MSTP / задати регіон
  ip routing                        - увімкнути L3 маршрутизацію (Lab 6)
  ip route <net/pfx> <next-hop>     - додати статичний маршрут (Lab 6)
  copy running-config tftp <ip> <f> - бекап конфігурації по TFTP (Lab 2)
  boot system flash primary|secondary - вибрати образ ОС (Lab 2)
  write memory | wr                 - зберегти в startup-config
  ping <ip>                         - перевірити L3 зв'язність
  show vlan | show trunks | show spanning-tree | show ip route | show flash | show running-config`);
      return;
    }
    if (c0 === "configure" || cmd.toLowerCase() === "conf t") { cli.mode = "config"; updatePrompt(); return; }
    if (c0 === "end") { cli.mode = "manager"; cli.curVlan = null; updatePrompt(); return; }
    if (c0 === "exit") {
      if (cli.mode === "vlan") { cli.mode = "config"; cli.curVlan = null; }
      else if (cli.mode === "config") { cli.mode = "manager"; }
      updatePrompt(); return;
    }
    if (c0 === "hostname" && cli.mode !== "manager" && parts[1]) { cli.hostname = parts[1]; cli.saved = false; updatePrompt(); return; }
    if (c0 === "vlan" && cli.mode !== "manager" && parts[1]) {
      const id = Number(parts[1]);
      if (!Number.isInteger(id) || id < 1 || id > 4094) { appendTerm("% Error: VLAN ID must be an integer 1..4094."); return; }
      if (!cli.vlans[id]) cli.vlans[id] = { name: `VLAN${id}`, untagged: "", tagged: "", ip: "" };
      cli.curVlan = id; cli.mode = "vlan"; cli.saved = false; updatePrompt(); return;
    }
    if (c0 === "no" && cli.mode !== "manager") {
      if (parts[1] === "vlan" && parts[2]) {
        const id = Number(parts[2]);
        if (id === 1) { appendTerm("% Error: Cannot delete DEFAULT_VLAN 1."); return; }
        delete cli.vlans[id]; appendTerm(`Deleted VLAN ${id}.`); return;
      }
      if (parts[1] === "trunk" && parts[2]) {
        cli.trunks = cli.trunks.filter(t => t.name !== parts[2]); appendTerm(`Removed trunk ${parts[2]}.`); return;
      }
    }
    if (cli.mode === "vlan") {
      const v = cli.vlans[cli.curVlan];
      if (c0 === "name" && parts[1]) { v.name = parts[1]; cli.saved = false; return; }
      if (c0 === "untagged" && parts[1]) { v.untagged = parts[1]; cli.saved = false; return; }
      if (c0 === "tagged" && parts[1]) { v.tagged = parts[1]; cli.saved = false; return; }
      if (c0 === "ip" && parts[1] === "address" && parts[2]) { v.ip = parts.slice(2).join(" "); cli.saved = false; return; }
    }
    if (c0 === "trunk" && cli.mode !== "manager" && parts.length >= 4) {
      cli.trunks = cli.trunks.filter(t => t.name !== parts[2]);
      cli.trunks.push({ ports: parts[1], name: parts[2], type: parts[3].toUpperCase() });
      cli.saved = false; appendTerm(`Created LAG ${parts[2]} (${parts[3].toUpperCase()}) on ports ${parts[1]}.`); return;
    }
    if (c0 === "spanning-tree" && cli.mode !== "manager") {
      cli.stp = true; cli.saved = false;
      if (parts[1] === "config-name" && parts[2]) cli.mstpName = parts[2];
      appendTerm("Spanning-Tree (MSTP) enabled/updated."); return;
    }
    if (c0 === "ip" && cli.mode !== "manager") {
      if (parts[1] === "routing") { cli.ipRouting = true; cli.saved = false; appendTerm("IP Routing (L3) enabled."); return; }
      if (parts[1] === "route" && parts.length >= 4) {
        cli.routes.push({ dst: parts[2], nh: parts[3] }); cli.saved = false;
        appendTerm(`Added static route ${parts[2]} via ${parts[3]}.`); return;
      }
    }
    if (c0 === "copy" && parts[1] === "running-config" && parts[2] === "tftp" && parts.length >= 5) {
      appendTerm(`Uploading running-config to TFTP server ${parts[3]} as "${parts[4]}" ... 100% OK.`); return;
    }
    if (c0 === "boot" && parts[1] === "system" && parts[2] === "flash" && (parts[3] === "primary" || parts[3] === "secondary")) {
      cli.bootFlash = parts[3]; appendTerm(`Default boot image set to ${parts[3]} flash.`); return;
    }
    if ((c0 === "write" && parts[1] === "memory") || c0 === "wr") { cli.saved = true; appendTerm("Configuration saved to startup-config."); return; }
    if (c0 === "ping" && parts[1]) {
      appendTerm(cli.ipRouting || cli.routes.length
        ? `${parts[1]} is alive, time = 2 ms (L3 reachable)`
        : `${parts[1]} is alive (same subnet), time = 1 ms`);
      return;
    }
    if (c0 === "show") {
      const sub = (parts[1] || "").toLowerCase();
      if (sub === "vlan") {
        let s = "VLAN ID  Name                 Untagged       Tagged         IP\n-------  -------------------  -------------  -------------  -----------------\n";
        Object.entries(cli.vlans).forEach(([id, v]) => {
          s += `${id.padEnd(7)}  ${v.name.padEnd(19)}  ${(v.untagged || "-").padEnd(13)}  ${(v.tagged || "-").padEnd(13)}  ${v.ip || "-"}\n`;
        });
        appendTerm(s); return;
      }
      if (sub === "trunks") {
        if (!cli.trunks.length) { appendTerm("No trunks (LAGs) configured."); return; }
        let s = "Ports     Group   Type\n--------  ------  ------\n";
        cli.trunks.forEach(t => { s += `${t.ports.padEnd(8)}  ${t.name.padEnd(6)}  ${t.type}\n`; });
        appendTerm(s); return;
      }
      if (sub === "spanning-tree") {
        appendTerm(`STP Enabled: ${cli.stp ? "Yes (MSTP)" : "No"}\nMST Region: ${cli.mstpName || "(default)"}\nRoot Bridge: ${cli.hostname} (Priority 32768)`); return;
      }
      if (sub === "flash") {
        appendTerm(`Image             Size (Bytes)  Version\n----------------  ------------  -----------\nPrimary Image     28,412,928    WC.16.11.0014 ${cli.bootFlash === "primary" ? "(Default Boot)" : ""}\nSecondary Image   28,104,112    WC.16.10.0022 ${cli.bootFlash === "secondary" ? "(Default Boot)" : ""}`); return;
      }
      if (sub === "ip" && parts[2] === "route") {
        let s = `IP Routing: ${cli.ipRouting ? "Enabled" : "Disabled"}\nDestination        Gateway           Type\n-----------------  ----------------  ---------\n`;
        Object.entries(cli.vlans).forEach(([id, v]) => { if (v.ip && v.ip !== "dhcp") s += `${v.ip.split(" ")[0].padEnd(17)}  VLAN ${id.padEnd(11)}  Connected\n`; });
        cli.routes.forEach(r => { s += `${r.dst.padEnd(17)}  ${r.nh.padEnd(16)}  Static\n`; });
        appendTerm(s); return;
      }
      if (sub === "running-config" || sub === "run") {
        let s = `Running configuration:\n\nhostname "${cli.hostname}"\n`;
        if (cli.ipRouting) s += "ip routing\n";
        if (cli.stp) s += "spanning-tree\n" + (cli.mstpName ? `spanning-tree config-name "${cli.mstpName}"\n` : "");
        cli.trunks.forEach(t => { s += `trunk ${t.ports} ${t.name} ${t.type.toLowerCase()}\n`; });
        cli.routes.forEach(r => { s += `ip route ${r.dst} ${r.nh}\n`; });
        Object.entries(cli.vlans).forEach(([id, v]) => {
          s += `vlan ${id}\n   name "${v.name}"\n`;
          if (v.untagged) s += `   untagged ${v.untagged}\n`;
          if (v.tagged) s += `   tagged ${v.tagged}\n`;
          if (v.ip) s += `   ip address ${v.ip}\n`;
          s += "   exit\n";
        });
        appendTerm(s); return;
      }
    }
    appendTerm(`Invalid input: ${cmd} (type 'help')`);
  }

  window.execCli = function () {
    const inp = document.getElementById("term-in");
    processCmd(inp.value);
    inp.value = "";
  };

  window.runPreset = function (name) {
    const scripts = {
      lab1: ["configure", "hostname Edge_1", "vlan 1", "ip address 10.1.1.11 255.255.255.0", "end", "write memory", "show running-config"],
      lab2: ["show flash", "copy running-config tftp 10.1.1.100 edge1_backup.cfg", "boot system flash primary"],
      lab3: ["configure", "vlan 10", "name Employees", "untagged 1-10", "tagged 24", "vlan 20", "name Servers", "untagged 11-15", "tagged 24", "end", "show vlan"],
      lab4: ["configure", "trunk 21-22 trk1 lacp", "vlan 10", "tagged trk1", "end", "show trunks"],
      lab5: ["configure", "spanning-tree", "spanning-tree config-name DUICT_MSTP", "end", "show spanning-tree"],
      lab6: ["configure", "hostname Router_1", "ip routing", "vlan 10", "ip address 10.1.10.1 255.255.255.0", "vlan 20", "ip address 10.1.20.1 255.255.255.0", "exit", "ip route 0.0.0.0/0 10.1.254.1", "end", "show ip route"]
    };
    (scripts[name] || []).forEach(processCmd);
  };

  window.initSim1 = function () {
    window.renderOsi(2);
    renderCam();
    renderDora();
    window.calcStp();
    window.calcLacp();
    window.resetCli();
  };
})();
