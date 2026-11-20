/* Sim 2: CIDR/VLSM (64-bit safe), LPM/AD Routing, VRRP (RFC 5798 Tie-Break + Skew), OSPFv2 (Wildcard, DR/BDR, Mismatch, Cost) */
(function () {
  function ipToInt(ip) {
    const p = ip.trim().split(".");
    if (p.length !== 4) return null;
    const nums = p.map(x => (/^\d+$/.test(x) ? Number(x) : -1));
    if (nums.some(x => x < 0 || x > 255)) return null;
    return nums[0] * 16777216 + nums[1] * 65536 + nums[2] * 256 + nums[3];
  }

  function intToIp(n) {
    return [
      Math.floor(n / 16777216) % 256,
      Math.floor(n / 65536) % 256,
      Math.floor(n / 256) % 256,
      n % 256
    ].join(".");
  }

  function prefixToMask(pfx) {
    if (pfx === 0) return 0;
    return ((0xffffffff << (32 - pfx)) >>> 0);
  }

  // --- TAB 1: CIDR & VLSM (Bug 3 Fixed) ---
  window.calcCidr = function () {
    const out = document.getElementById("cidr-out");
    if (!out) return;
    const ip = ipToInt(document.getElementById("cidr-ip").value);
    const pfx = parseInt(document.getElementById("cidr-pfx").value, 10);
    if (ip === null || isNaN(pfx) || pfx < 1 || pfx > 32) {
      out.textContent = "❌ Введи коректну IPv4-адресу та префікс (1..32).";
      document.getElementById("cidr-bits").innerHTML = "";
      return;
    }
    const mask = prefixToMask(pfx);
    const wildcard = 4294967295 - mask;
    const net = (ip & mask) >>> 0;
    const size = Math.pow(2, 32 - pfx);
    const bcast = net + size - 1;
    let hostRange = "", usable = 0;
    if (pfx === 32) {
      usable = 1;
      hostRange = `${intToIp(net)} (Host Route /32)`;
    } else if (pfx === 31) {
      usable = 2;
      hostRange = `${intToIp(net)} – ${intToIp(bcast)} (RFC 3021 P2P)`;
    } else {
      usable = size - 2;
      hostRange = `${intToIp(net + 1)} – ${intToIp(bcast - 1)}`;
    }
    out.textContent =
      `IP-адреса:       ${intToIp(ip)} /${pfx}\n` +
      `Маска підмережі: ${intToIp(mask)}\n` +
      `Wildcard Mask:   ${intToIp(wildcard)}  (для OSPF / ACL)\n` +
      `Network ID:      ${intToIp(net)}\n` +
      `Діапазон хостів: ${hostRange}\n` +
      `Broadcast:       ${pfx >= 31 ? "Немає (P2P / Host)" : intToIp(bcast)}\n` +
      `Придатних хостів:${usable} (усього адрес: ${size})`;

    const bin = ip.toString(2).padStart(32, "0");
    let html = "";
    for (let i = 0; i < 32; i++) {
      if (i > 0 && i % 8 === 0) html += '<span style="padding:3px 2px;color:#64748b;">.</span>';
      html += `<span class="${i < pfx ? "bit-net" : "bit-host"}">${bin[i]}</span>`;
    }
    document.getElementById("cidr-bits").innerHTML = html;
  };

  window.calcVlsm = function () {
    const tb = document.getElementById("vlsm-body");
    const warn = document.getElementById("vlsm-warn");
    if (!tb) return;
    const [baseStr, pfxStr] = document.getElementById("vlsm-net").value.trim().split("/");
    const baseIp = ipToInt(baseStr || "");
    const basePfx = parseInt(pfxStr, 10);
    if (baseIp === null || isNaN(basePfx) || basePfx < 8 || basePfx > 30) {
      tb.innerHTML = '<tr><td colspan="7">❌ Невірна базова мережа (приклад: 10.1.0.0/24)</td></tr>';
      return;
    }
    const reqs = document.getElementById("vlsm-reqs").value
      .split(",")
      .map(x => parseInt(x.trim(), 10))
      .filter(x => !isNaN(x) && x >= 1)
      .sort((a, b) => b - a);
    if (!reqs.length) {
      tb.innerHTML = '<tr><td colspan="7">Введи кількість хостів через кому (напр. 60, 28, 12, 2)</td></tr>';
      return;
    }
    const baseMask = prefixToMask(basePfx);
    let cur = (baseIp & baseMask) >>> 0;
    const totalCap = Math.pow(2, 32 - basePfx);
    const limit = cur + totalCap;
    let usedTotal = 0;
    let overflow = false;
    let rows = "";
    reqs.forEach((need, idx) => {
      const hBits = Math.max(2, Math.ceil(Math.log2(need + 2)));
      const pfx = 32 - hBits;
      const size = Math.pow(2, hBits);
      usedTotal += size;
      const bcast = cur + size - 1;
      const ok = cur + size <= limit;
      if (!ok) overflow = true;
      rows += `<tr style="${ok ? "" : "color:var(--red);"}">
        <td>LAN ${idx + 1}</td>
        <td>${need} / ${size - 2}</td>
        <td><code>/${pfx}</code></td>
        <td><code>${intToIp(prefixToMask(pfx))}</code></td>
        <td><code>${intToIp(cur)}</code></td>
        <td><code>${intToIp(cur + 1)} – ${intToIp(bcast - 1)}</code></td>
        <td><code>${intToIp(bcast)}</code></td>
      </tr>`;
      cur += size;
    });
    tb.innerHTML = rows;
    if (warn) {
      warn.textContent = overflow
        ? `⚠️ ПЕРЕПОВНЕННЯ! Потрібно ${usedTotal} адрес, а в базовій мережі /${basePfx} лише ${totalCap}. Зменш префікс (напр. /23).`
        : `✅ Вміщується оптимально: використано ${usedTotal} із ${totalCap} адрес (залишок: ${totalCap - usedTotal}).`;
      warn.style.color = overflow ? "var(--red)" : "var(--green)";
    }
  };

  // --- TAB 2: LPM & AD ---
  const ROUTES = [
    { net: "0.0.0.0", pfx: 0, proto: "Static Default", ad: 1, nh: "203.0.113.1 (ISP)" },
    { net: "10.1.0.0", pfx: 16, proto: "OSPF", ad: 110, nh: "10.1.254.2 (Router_2)" },
    { net: "10.1.20.0", pfx: 24, proto: "OSPF", ad: 110, nh: "10.1.254.6 (Core)" },
    { net: "10.1.20.0", pfx: 25, proto: "Static", ad: 1, nh: "vlan 20 (SVI 10.1.20.1)" },
    { net: "10.1.20.128", pfx: 25, proto: "Connected", ad: 0, nh: "vlan 21 (Direct)" }
  ];

  window.evalLpm = function () {
    const tb = document.getElementById("lpm-body");
    if (!tb) return;
    const dst = ipToInt(document.getElementById("lpm-dst").value);
    if (dst === null) { document.getElementById("lpm-res").textContent = "❌ Невірна IP-адреса!"; return; }
    let best = null;
    const evaluated = ROUTES.map(r => {
      const mask = prefixToMask(r.pfx);
      const match = ((dst & mask) >>> 0) === ((ipToInt(r.net) & mask) >>> 0);
      if (match && (!best || r.pfx > best.pfx || (r.pfx === best.pfx && r.ad < best.ad))) best = r;
      return { ...r, match };
    });
    tb.innerHTML = evaluated.map(r => `
      <tr class="${r === best ? "win-row" : ""}">
        <td><code>${r.net}/${r.pfx}</code></td><td>${r.proto}</td><td>${r.ad}</td><td><code>${r.nh}</code></td>
        <td>${r === best ? '<span class="pill pill-g">★ ПЕРЕМОЖЕЦЬ (LPM)</span>' : r.match ? '<span class="pill pill-a">Збіг (коротша маска)</span>' : "—"}</td>
      </tr>`).join("");
    document.getElementById("lpm-res").textContent = best
      ? `Пакет до ${intToIp(dst)} переслано за [${best.net}/${best.pfx}] → ${best.nh} (${best.proto}, AD=${best.ad}).\nПричина: найдовша маска (/${best.pfx}) серед усіх збігів!`
      : "Маршрут не знайдено — пакет відкинуто (ICMP Destination Unreachable).";
  };

  // --- TAB 3: VRRP (Bug 4 Fixed: RFC 5798 highest IP tie-break + Skew Time) ---
  const vrrpUp = { r1: true, r2: true };
  let curMaster = "r1";
  window.toggleVrrp = function (k) {
    vrrpUp[k] = !vrrpUp[k];
    const b = document.getElementById("vrrp-f" + (k === "r1" ? "1" : "2"));
    b.textContent = vrrpUp[k] ? "Стан: UP (Вимкнути)" : "Стан: DOWN (Увімкнути)";
    b.className = "btn " + (vrrpUp[k] ? "btn-green" : "btn-danger");
    window.updateVrrp();
  };

  window.updateVrrp = function () {
    const out = document.getElementById("vrrp-state");
    if (!out) return;
    const p1 = Math.max(1, Math.min(254, +document.getElementById("vrrp-p1").value || 100));
    const p2 = Math.max(1, Math.min(254, +document.getElementById("vrrp-p2").value || 100));
    const preempt = document.getElementById("vrrp-preempt").checked;

    if (!vrrpUp.r1 && !vrrpUp.r2) {
      curMaster = "none";
    } else if (vrrpUp.r1 && !vrrpUp.r2) {
      curMaster = "r1";
    } else if (!vrrpUp.r1 && vrrpUp.r2) {
      curMaster = "r2";
    } else {
      // RFC 5798: higher priority wins; on tie, HIGHER primary IP wins (10.1.10.3 > 10.1.10.2 => r2!)
      const winner = p1 > p2 ? "r1" : "r2";
      if (preempt || curMaster === "none") curMaster = winner;
    }

    const backupP = curMaster === "r1" ? p2 : p1;
    const skew = ((256 - backupP) / 256).toFixed(2);
    const downInt = (3 + Number(skew)).toFixed(2);
    const tieNote = p1 === p2 && vrrpUp.r1 && vrrpUp.r2 ? "\n⚖️ Рівні пріоритети! За RFC 5798 перемагає вища IP-адреса: Router_2 (10.1.10.3 > 10.1.10.2)!" : "";

    out.textContent =
      `Virtual Gateway: 10.1.10.1 (VRID 10) | Virtual MAC: 00-00-5E-00-01-0A\n` +
      `Router_1 (10.1.10.2, Prio ${p1}): ${!vrrpUp.r1 ? "INIT (DOWN)" : curMaster === "r1" ? "★ MASTER" : "BACKUP"}\n` +
      `Router_2 (10.1.10.3, Prio ${p2}): ${!vrrpUp.r2 ? "INIT (DOWN)" : curMaster === "r2" ? "★ MASTER" : "BACKUP"}\n` +
      `Master Down Interval (Backup): 3 × 1s + Skew(${skew}s) = ${downInt}s | Preempt: ${preempt ? "ON" : "OFF"}${tieNote}`;
  };

  // --- TAB 4: OSPFv2 (Bug 5 Fixed: added DR/BDR election & Wildcard) ---
  window.checkOspf = function () {
    const out = document.getElementById("ospf-res");
    if (!out) return;
    const errs = [];
    if (document.getElementById("o-area").value !== "0") errs.push("❌ Area ID mismatch (0 vs 1) → стан DOWN");
    if (document.getElementById("o-mask").value !== "24") errs.push("❌ Subnet Mask mismatch (/24 vs /30) → стан DOWN");
    if (document.getElementById("o-timer").value !== "10/40") errs.push("❌ Hello/Dead mismatch (10/40 vs 30/120) → стан DOWN");
    if (document.getElementById("o-auth").value !== "md5") errs.push("❌ Authentication mismatch → стан DOWN");
    if (document.getElementById("o-mtu").value !== "1500") errs.push("⚠️ MTU mismatch (1500 vs 1400) → застрягає в EXSTART / EXCHANGE!");
    out.textContent = errs.length === 0
      ? "✅ УСІ ПАРАМЕТРИ ЗБІГАЮТЬСЯ!\nFSM: Down → Init → 2-Way → ExStart → Exchange → Loading → FULL.\nLSDB синхронізовано, SPF (Дейкстра) побудував дерево маршрутів."
      : "ПОМИЛКА СУСІДСТВА OSPFv2:\n" + errs.join("\n");
  };

  window.calcOspfDr = function () {
    const out = document.getElementById("ospf-dr-out");
    if (!out) return;
    const nodes = [
      { name: "R1", prio: Math.max(0, Math.min(255, +document.getElementById("dr-p1").value || 0)), rid: "1.1.1.1", ipVal: ipToInt("1.1.1.1") },
      { name: "R2", prio: Math.max(0, Math.min(255, +document.getElementById("dr-p2").value || 0)), rid: "2.2.2.2", ipVal: ipToInt("2.2.2.2") },
      { name: "R3", prio: Math.max(0, Math.min(255, +document.getElementById("dr-p3").value || 0)), rid: "3.3.3.3", ipVal: ipToInt("3.3.3.3") }
    ];
    const eligible = nodes.filter(n => n.prio > 0).sort((a, b) => b.prio - a.prio || b.ipVal - a.ipVal);
    const dr = eligible[0] || null;
    const bdr = eligible[1] || null;
    out.textContent = nodes.map(n => {
      const role = n === dr ? "★ DR (Designated Router)" : n === bdr ? "☆ BDR (Backup DR)" : n.prio === 0 ? "DROTHER (Priority 0 — не бере участі)" : "DROTHER";
      return `${n.name} (RID ${n.rid}, Prio ${n.prio}) → ${role}`;
    }).join("\n");
  };

  window.calcOspfCost = function () {
    const out = document.getElementById("ospf-cost");
    if (!out) return;
    const ref = +document.getElementById("o-ref").value;
    const bw = +document.getElementById("o-bw").value;
    const cost = Math.max(1, Math.floor(ref / bw));
    const note = ref === 100 && bw >= 1000
      ? "\n⚠️ Reference BW = 100 Mbps дає Cost = 1 і для 1G, і для 10G! Збільш auto-cost reference-bandwidth!"
      : "\n✅ Reference Bandwidth коректно розрізняє гігабітні канали.";
    out.textContent = `Cost = max(1, floor(${ref} / ${bw})) = ${cost}${note}`;
  };

  window.initSim2 = function () {
    window.calcCidr();
    window.calcVlsm();
    window.evalLpm();
    window.updateVrrp();
    window.checkOspf();
    window.calcOspfDr();
    window.calcOspfCost();
  };
})();
