/* Sim 3: Aruba VSF Stacking (Ring vs Chain + MAD), SNMP/NetEdit 2.0, Wi-Fi SMB & PoE, 24-Question Exam Trainer */
(function () {
  // --- TAB 1: VSF (Bug 6 Fixed: Ring vs Chain topology + Backplane comparison) ---
  let vsfCut = false;
  window.toggleVsfCut = function () {
    vsfCut = !vsfCut;
    const b = document.getElementById("vsf-cut-btn");
    b.textContent = vsfCut ? "Відновити VSF-лінк" : "Розірвати VSF-лінк між M1 та M2";
    b.className = "btn " + (vsfCut ? "btn-green" : "btn-danger");
    window.renderVsf();
  };

  window.renderVsf = function () {
    const nodesEl = document.getElementById("vsf-nodes");
    if (!nodesEl) return;
    const topo = document.getElementById("vsf-topo").value; // ring | chain
    const mad = document.getElementById("vsf-mad").checked;
    let nodes = [
      { id: "Member 1", role: "Commander ★", state: "ACTIVE", col: "#34d399" },
      { id: "Member 2", role: "Standby", state: "ACTIVE", col: "#38bdf8" },
      { id: "Member 3", role: "Member", state: "ACTIVE", col: "#a78bfa" }
    ];
    let log = "";

    if (!vsfCut) {
      log = `✅ VSF Стек цілісний (Топологія: ${topo === "ring" ? "RING — кільце, рекомендовано!" : "CHAIN — ланцюжок"}).\n• Member 1 (Commander) керує control plane, Member 2 (Standby) готовий до hitless failover.\n• Крос-стековий LACP (1/1/24 + 2/1/24) працює без STP-блокування!`;
    } else if (topo === "ring") {
      log = "✅ РОЗРИВ ОДНОГО ЛІНКУ В ТОПОЛОГІЇ RING (КІЛЬЦЕ)!\n• Трафік стеку автоматично обходить розрив через резервний VSF-лінк M1↔M3!\n• Стек НЕ розпадається, Split-Brain НЕ виникає, MAD не потребує вимкнення портів. Саме тому в production завжди використовують Ring!";
    } else if (mad) {
      nodes[0] = { id: "Member 1", role: "Inactive Fragment (MAD Shutdown!)", state: "PORTS DISABLED", col: "#fbbf24" };
      nodes[1] = { id: "Member 2", role: "New Commander ★ (Більший фрагмент)", state: "ACTIVE", col: "#34d399" };
      nodes[2] = { id: "Member 3", role: "Standby (у фрагменті з M2)", state: "ACTIVE", col: "#38bdf8" };
      log = "⚠️ РОЗРИВ ЛІНКУ В CHAIN! Спрацював MAD (Multi-Active Detection)!\n• Стек розпався на M1 (1 вузол) і M2+M3 (2 вузли).\n• MAD вимикає всі не-VSF порти на меншому фрагменті (M1), запобігаючи конфлікту IP/MAC (Split-Brain)!";
    } else {
      nodes[0] = { id: "Member 1", role: "Commander #1 (КОНФЛІКТ!)", state: "SPLIT-BRAIN!", col: "#f87171" };
      nodes[1] = { id: "Member 2", role: "Commander #2 (КОНФЛІКТ!)", state: "SPLIT-BRAIN!", col: "#f87171" };
      nodes[2] = { id: "Member 3", role: "Member (Фрагмент #2)", state: "SPLIT-BRAIN!", col: "#f87171" };
      log = "🚨 КРИТИЧНА АВАРІЯ: SPLIT-BRAIN (Chain + MAD вимкнено)!\n• Обидва фрагменти активні з ОДНАКОВОЮ IP-адресою та MAC → дублювання ARP/OSPF/VRRP!";
    }

    nodesEl.innerHTML = nodes.map(n => `
      <div class="vsf-node" style="border-color:${n.col};">
        <div style="font-weight:700;font-size:1rem;">${n.id}</div>
        <div style="color:${n.col};font-size:0.84rem;margin:4px 0;">${n.role}</div>
        <div class="muted" style="font-family:var(--mono);font-size:0.78rem;">${n.state}</div>
      </div>`).join("");
    document.getElementById("vsf-log").textContent = log;
  };

  // --- TAB 2: SNMP & NetEdit ---
  window.simSnmp = function () {
    const out = document.getElementById("snmp-out");
    if (!out) return;
    const v = document.getElementById("snmp-ver").value;
    const op = document.getElementById("snmp-op").value;
    const isNotif = op === "trap" || op === "inform";
    const port = isNotif ? "UDP 162 (Agent → Manager)" : "UDP 161 (Manager → Agent)";
    let warn = v === "v1" && (op === "bulk" || op === "inform")
      ? "\n❌ ПОМИЛКА: GetBulk та Inform з'явилися лише в SNMPv2c / SNMPv3!"
      : "";
    const sec = v === "v3"
      ? "Користувач + SHA автентифікація + AES шифрування (authPriv)"
      : "Community string у ВІДКРИТОМУ тексті (небезпечно!)";
    const cnt = v === "v1" ? "32-бітні лічильники (переповнюються на 1G/10G!)" : "64-бітні лічильники (підходить для 1G/10G/100G)";
    out.textContent = `Версія:    SNMP${v}\nОперація:  ${op.toUpperCase()}\nПорт:      ${port}\nЛічильники:${cnt}\nБезпека:   ${sec}${warn}`;
  };

  const NE = [
    "1. PLAN (Планування): централізоване редагування конфігурацій групи комутаторів AOS-CX в єдиному редакторі зі змінними та підсвіткою синтаксису.",
    "2. VALIDATE (Валідація): автоматична перевірка синтаксису, конфліктів VLAN/OSPF і комплаєнсу ДО застосування на живій мережі.",
    "3. DEPLOY (Розгортання): одночасний координований пуш конфігурації на десятки комутаторів із миттєвим Rollback при збої.",
    "4. AUDIT (Аудит): безперервний контроль configuration drift і візуалізація здоров'я мережі через NAE (Network Analytics Engine)."
  ];
  window.showNetEdit = function (i) {
    const el = document.getElementById("ne-out");
    if (el) el.textContent = NE[i];
  };

  // --- TAB 3: Wi-Fi & PoE (Bug 7 Fixed: strict clamping 1..11 & >= 0) ---
  window.checkWifi = function () {
    const out = document.getElementById("wifi-out");
    if (!out) return;
    const clampCh = id => {
      const el = document.getElementById(id);
      const val = Math.max(1, Math.min(11, parseInt(el.value, 10) || 1));
      el.value = val;
      return val;
    };
    const c = [clampCh("ch1"), clampCh("ch2"), clampCh("ch3")];
    const minD = Math.min(Math.abs(c[0] - c[1]), Math.abs(c[1] - c[2]), Math.abs(c[0] - c[2]));
    out.textContent = minD >= 5
      ? `✅ ОПТИМАЛЬНО! Канали (${c.join(", ")}) не перекриваються (інтервал ≥ 5 каналів; стандарт 2.4 ГГц — 1, 6, 11).\n• Для високої щільності використовуй 5 ГГц (понад 20 неперекривних каналів по 20 МГц).\n• У Lab 7 (SMB): корпоративний VSC → VLAN 50 (WPA2/WPA3-Enterprise 802.1X), гостьовий → ізольований VLAN.`
      : `⚠️ ІНТЕРФЕРЕНЦІЯ! Канали (${c.join(", ")}) перекриваються (мінімальна різниця ${minD} < 5).\n• Рекомендація: встанови неперекривні канали 1, 6 та 11!`;
  };

  window.calcPoe = function () {
    const out = document.getElementById("poe-out");
    if (!out) return;
    const max = Math.max(15, parseFloat(document.getElementById("poe-max").value) || 370);
    const af = Math.max(0, parseInt(document.getElementById("poe-af").value, 10) || 0);
    const at = Math.max(0, parseInt(document.getElementById("poe-at").value, 10) || 0);
    const bt = Math.max(0, parseInt(document.getElementById("poe-bt").value, 10) || 0);
    const total = af * 15.4 + at * 30 + bt * 60;
    const pct = Math.round((total / max) * 100);
    out.textContent =
      `Споживання: ${total.toFixed(1)} Вт / ${max} Вт (${pct}%)\n` +
      (total <= max
        ? `✅ Бюджету PoE достатньо (запас ${(max - total).toFixed(1)} Вт).`
        : `❌ ПЕРЕВИЩЕННЯ БЮДЖЕТУ на ${(total - max).toFixed(1)} Вт! Комутатор вимкне порти з нижчим PoE-пріоритетом (Low < High < Critical)!`);
  };

  // --- TAB 4: 24-QUESTION EXAM TRAINER (Bug 8 Fixed: filter + mistake review) ---
  const ALL_QUESTIONS = [
    { g: "L1-4", t: "Л1", q: "На якому рівні OSI працює комутатор Ethernet та яке ім'я має його PDU?", o: ["L2 (Data Link) · Frame", "L3 (Network) · Packet", "L4 (Transport) · Segment", "L1 (Physical) · Bits"], a: 0, e: "Комутатор L2 оперує кадрами (Frames) та MAC-адресами." },
    { g: "L1-4", t: "Л1", q: "Що робить L2-комутатор, отримавши кадр із невідомою MAC-адресою призначення (Unknown Unicast)?", o: ["Відкидає кадр (Drop)", "Розсилає на всі порти крім вхідного (Flooding)", "Пересилає маршрутизатору", "Надсилає ICMP Unreachable"], a: 1, e: "Unknown Unicast завжди розсилається (Flooding) на всі порти цього ж VLAN крім вхідного." },
    { g: "L1-4", t: "Л2", q: "Що означає команда `trunk 21-22 trk1 lacp` на комутаторі HPE ArubaOS-Switch (ProVision)?", o: ["Налаштовує 802.1Q тегування", "Створює агрегований канал (LAG) LACP із портів 21–22", "Вмикає маршрутизацію IP", "Блокує порти в STP"], a: 1, e: "В Aruba ProVision слово `trunk` означає LAG (агрегацію каналів), на відміну від Cisco!" },
    { g: "L1-4", t: "Л2", q: "Яка команда зберігає поточну конфігурацію в енергонезалежну пам'ять ArubaOS-Switch?", o: ["save config", "write memory", "commit all", "copy flash startup"], a: 1, e: "`write memory` (або `wr`) зберігає running-config у startup-config." },
    { g: "L1-4", t: "Л3", q: "Як у HPE ArubaOS призначити порт 5 для підключення звичайного ПК у VLAN 10?", o: ["vlan 10 → tagged 5", "vlan 10 → untagged 5", "interface 5 → trunk vlan 10", "ip vlan 10 port 5"], a: 1, e: "Кінцеві хости (ПК) отримують нетеговані кадри: `untagged 5`." },
    { g: "L1-4", t: "Л3", q: "Яка команда на маршрутизаторі пересилає broadcast DHCP Discover до DHCP-сервера в іншому VLAN?", o: ["ip dhcp snooping", "ip helper-address <DHCP-IP>", "vlan dhcp-relay", "ip routing"], a: 1, e: "`ip helper-address` перетворює DHCP broadcast на unicast до сервера." },
    { g: "L1-4", t: "Л4", q: "Який комутатор обирається Root Bridge у STP / RSTP / MSTP?", o: ["Із найбільшим Bridge ID", "Із найменшим Bridge ID (Priority + MAC)", "Із найбільшою кількістю портів", "Із найбільшою IP-адресою"], a: 1, e: "Менший Priority (крок 4096), а при рівності — менша MAC-адреса." },
    { g: "L1-4", t: "Л4", q: "Яка головна перевага MSTP (802.1s) порівняно з RSTP (802.1w)?", o: ["Не потребує BPDU", "Дозволяє групувати VLAN в окремі інстанси з різними Root Bridge (балансування)", "Працює на рівні L3", "Замінює LACP"], a: 1, e: "MSTP підтримує кілька дерев (instances) для різних груп VLAN." },
    { g: "L5-7", t: "Л5", q: "Який віртуальний MAC-адрес використовує VRRP для VRID = 10 (0x0A)?", o: ["00-00-0C-07-AC-0A", "00-00-5E-00-01-0A", "FF-FF-FF-FF-FF-0A", "01-80-C2-00-00-0A"], a: 1, e: "Стандарт VRRP (RFC 5798): `00-00-5E-00-01-XX`, де XX = VRID у hex." },
    { g: "L5-7", t: "Л5", q: "Якщо два VRRP-маршрутизатори мають однаковий Priority = 100, хто стане Master?", o: ["Той, у кого менша IP-адреса", "Той, у кого більша первинна IP-адреса", "Обидва стануть Master", "Той, хто завантажився останнім"], a: 1, e: "За RFC 5798 при рівності пріоритетів перемагає маршрутизатор із вищою первинною IP-адресою." },
    { g: "L5-7", t: "Л5", q: "Що потрібно для обміну трафіком між VLAN 10 та VLAN 20?", o: ["Достатньо L2-комутатора з tagged-портом", "Маршрутизатор або L3-комутатор (Inter-VLAN Routing / SVI + `ip routing`)", "Увімкнути STP", "Увімкнути LACP"], a: 1, e: "VLAN — ізольовані L2-домени; зв'язок між ними можливий лише на L3." },
    { g: "L5-7", t: "Л6", q: "Скільки придатних хостів у підмережі з маскою /26?", o: ["64", "62", "30", "126"], a: 1, e: "32 − 26 = 6 біт хоста → 2^6 − 2 = 62 хости." },
    { g: "L5-7", t: "Л6", q: "За яким правилом маршрутизатор обирає маршрут, якщо IP збігається з 10.1.0.0/16 (Static, AD=1) та 10.1.20.0/24 (OSPF, AD=110)?", o: ["Static /16, бо менший AD", "OSPF /24, бо довший префікс (Longest Prefix Match)", "Обидва одночасно", "Відкине пакет"], a: 1, e: "Longest Prefix Match (/24 > /16) ЗАВЖДИ має вищий пріоритет за AD!" },
    { g: "L5-7", t: "Л6", q: "Яка маска підмережі є оптимальною (VLSM) для point-to-point лінку між двома маршрутизаторами?", o: ["/24", "/28", "/30 (2 хости)", "/29 (6 хостів)"], a: 2, e: "Маска /30 (255.255.255.252) дає рівно 2 придатні IP-адреси для P2P-лінку." },
    { g: "L5-7", t: "Л7", q: "Який протокол і яка адміністративна відстань (AD) за замовчуванням у OSPFv2?", o: ["Distance-Vector, AD 120", "Link-State, AD 110", "Path-Vector, AD 20", "Hybrid, AD 90"], a: 1, e: "OSPFv2 — протокол стану каналів (Link-State, Дейкстра), AD = 110." },
    { g: "L5-7", t: "Л7", q: "Яка з умов НЕ є обов'язковою для встановлення сусідства OSPFv2 (стан FULL)?", o: ["Однаковий Area ID", "Однакові таймери Hello/Dead", "Однаковий Router ID", "Однакова маска підмережі"], a: 2, e: "Router ID у сусідів якраз ПОВИННІ бути унікальними (різними)!" },
    { g: "L5-7", t: "Л7", q: "Що станеться з сусідством OSPFv2, якщо на сусідніх інтерфейсах не збігається MTU (1500 vs 1400)?", o: ["Сусідство перейде у FULL", "Застрягне у стані EXSTART / EXCHANGE", "Залишиться в DOWN", "Автоматично змінить Area ID"], a: 1, e: "Hello-пакети пройдуть (2-Way), але обмін DBD-пакетами застрягне в ExStart/Exchange." },
    { g: "L8-9", t: "Л8", q: "Для чого призначений механізм MAD (Multi-Active Detection) у стеку Aruba VSF?", o: ["Для прискорення DHCP", "Для виявлення Split-Brain при розриві VSF-лінку та вимкнення другорядного фрагмента", "Для шифрування SSH", "Для вибору Root Bridge"], a: 1, e: "MAD запобігає одночасній роботі двох активних фрагментів стеку з однаковими IP/MAC." },
    { g: "L8-9", t: "Л8", q: "Яка топологія VSF-стеку запобігає розпаду стеку при обриві одного VSF-кабелю?", o: ["Chain (ланцюжок)", "Ring (кільце)", "Star (зірка)", "Bus (шина)"], a: 1, e: "У топології Ring (кільце) трафік стеку автоматично йде резервним шляхом." },
    { g: "L8-9", t: "Л9", q: "Які порти UDP використовує SNMP для запитів Manager→Agent та сповіщень Trap/Inform?", o: ["TCP 22 і 23", "UDP 161 (запити) і UDP 162 (Trap/Inform)", "UDP 67 і 68", "UDP 514 і 123"], a: 1, e: "SNMP Get/Set використовує UDP 161, а асинхронні Trap/Inform — UDP 162." },
    { g: "L8-9", t: "Л9", q: "Яка версія SNMP забезпечує автентифікацію користувачів і шифрування (authPriv)?", o: ["SNMPv1", "SNMPv2c", "SNMPv3", "RMON1"], a: 2, e: "Тільки SNMPv3 підтримує шифрування (AES/DES) та криптографічну автентифікацію (SHA/MD5)." },
    { g: "L8-9", t: "Л9", q: "Назвіть 4 етапи життєвого циклу конфігурацій у Aruba NetEdit 2.0:", o: ["Discover → Offer → Request → Ack", "Plan → Validate → Deploy → Audit", "Init → 2-Way → ExStart → Full", "Fault → Config → Accounting → Security"], a: 1, e: "Aruba NetEdit 2.0 працює за циклом Plan → Validate → Deploy → Audit." },
    { g: "L8-9", t: "Л9", q: "Який стандартний порт використовує Syslog і який рівень критичності є найвищим?", o: ["UDP 514, рівень 0 (Emergency)", "TCP 22, рівень 7 (Debug)", "UDP 162, рівень 7 (Emergency)", "TCP 443, рівень 1 (Alert)"], a: 0, e: "Syslog використовує UDP 514; рівні 0..7, де 0 = Emergency (найкритичніший)." },
    { g: "L8-9", t: "Lab 7", q: "Які три канали в діапазоні 2.4 ГГц НЕ перекриваються між собою?", o: ["1, 4, 8", "1, 6, 11", "2, 5, 9", "3, 6, 9"], a: 1, e: "У 2.4 ГГц неперекривними є канали 1, 6 та 11 (ширина 20–22 МГц, крок 5 МГц)." }
  ];

  let activeQ = [...ALL_QUESTIONS];
  let qIdx = 0, qCorrect = 0, qAnswered = false, mistakes = [];

  window.restartQuiz = function () {
    const flt = document.getElementById("q-filter")?.value || "ALL";
    activeQ = flt === "ALL" ? [...ALL_QUESTIONS] : ALL_QUESTIONS.filter(x => x.g === flt);
    qIdx = 0; qCorrect = 0; qAnswered = false; mistakes = [];
    renderQ();
  };

  function renderQ() {
    const box = document.getElementById("q-box");
    if (!box) return;
    document.getElementById("q-score").textContent = `Рахунок: ${qCorrect} / ${qIdx + (qAnswered ? 1 : 0)}`;
    document.getElementById("q-bar").style.width = `${(qIdx / Math.max(1, activeQ.length)) * 100}%`;

    if (qIdx >= activeQ.length) {
      const pct = Math.round((qCorrect / activeQ.length) * 100);
      let rev = mistakes.length
        ? `<h3>Розбір помилок (${mistakes.length}):</h3>` + mistakes.map(m =>
            `<div class="log-box" style="margin-bottom:8px;">[${m.t}] ${m.q}\n✅ Правильно: ${m.o[m.a]}\n💡 ${m.e}</div>`).join("")
        : `<div class="log-box" style="color:var(--green);">🏆 Жодної помилки! 100% готовність!</div>`;
      box.innerHTML = `<h3>🎉 Тест завершено! Результат: ${qCorrect} із ${activeQ.length} (${pct}%)</h3><div style="margin-top:10px;">${rev}</div>`;
      document.getElementById("q-bar").style.width = "100%";
      return;
    }

    const cur = activeQ[qIdx];
    box.innerHTML = `
      <div style="margin-bottom:8px;"><span class="badge">${cur.t}</span> <b>Питання ${qIdx + 1} з ${activeQ.length}</b></div>
      <p style="font-size:1rem;margin-bottom:12px;">${cur.q}</p>
      <div id="q-opts">${cur.o.map((opt, i) => `<button class="quiz-opt" onclick="pickOpt(${i}, this)">${String.fromCharCode(65 + i)}. ${opt}</button>`).join("")}</div>
      <div id="q-exp" style="margin-top:10px;"></div>`;
  }

  window.pickOpt = function (i, btn) {
    if (qAnswered) return;
    qAnswered = true;
    const cur = activeQ[qIdx];
    const btns = document.querySelectorAll(".quiz-opt");
    btns[cur.a].classList.add("correct");
    if (i === cur.a) qCorrect++;
    else { btn.classList.add("wrong"); mistakes.push(cur); }
    document.getElementById("q-score").textContent = `Рахунок: ${qCorrect} / ${qIdx + 1}`;
    document.getElementById("q-exp").innerHTML =
      `<div class="log-box">${i === cur.a ? "✅ Вірно! " : "❌ Помилка. "}${cur.e}</div>` +
      `<button class="btn" style="margin-top:10px;" onclick="nextQuizQ()">Наступне питання →</button>`;
  };

  window.nextQuizQ = function () { qIdx++; qAnswered = false; renderQ(); };

  window.initSim3 = function () {
    window.renderVsf();
    window.simSnmp();
    window.showNetEdit(0);
    window.checkWifi();
    window.calcPoe();
    window.restartQuiz();
  };
})();
