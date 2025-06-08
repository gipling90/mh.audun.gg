// === Globale tilstander ===
let lastActivityName = null;
let lastMenuName = null;
let _mhTimerWatcher = null;
let _mhPoliceWatcher = null;
let isRunning = true;
let isTryingFallback = false;
let allActivities = [];

// Last fra localStorage hvis tilgjengelig
const savedActivities = localStorage.getItem("mh_allActivities");
if (savedActivities) {
  try {
    allActivities = JSON.parse(savedActivities);
    console.log("📦 Lastet aktiviteter fra localStorage:", allActivities.length);
  } catch (e) {
    console.warn("⚠️ Kunne ikke lese lagrede aktiviteter");
  }
}


let fallbackPriority = JSON.parse(localStorage.getItem("mh_fallback")) || [];

function createControlPanel() {
  if (document.getElementById("mh-control-panel")) return;

  const panel = document.createElement("div");
  panel.id = "mh-control-panel";
  panel.style = `
    position: fixed;
    top: 12px;
    right: 12px;
    background: rgba(0,0,0,0.85);
    color: #0ff;
    padding: 10px;
    font-size: 12px;
    font-family: monospace;
    border: 1px solid #04415c;
    border-radius: 8px;
    z-index: 9999;
    min-width: 220px;
    max-width: 260px;
  `;

  panel.innerHTML = `
    <div style="margin-bottom: 6px;"><b>🔧 Mafiaens Hevn Auto</b></div>
    <div id="mh-status">Status: <span style="color:orange">Starter...</span></div>
    <div id="mh-activity">Aktivitet: <i>...</i></div>
    <div id="mh-police">Politi: <i>...</i></div>
    <div id="mh-fallback">Fallback: <span style="color:yellow">venter...</span></div>
    <div id="mh-remaining">Gjenstår: <span style="color:#0ff">ukjent</span></div>
    <div id="mh-fallback-selectors" style="margin-top: 8px"></div>
    <div style="margin-top:8px">
      <button id="mh-stop" style="margin-right:5px">⏹ Stopp</button>
      <button id="mh-fly" style="margin-right:5px">✈ Fly nå</button>
      <button id="mh-scan">🔍 Reskan</button>
    </div>
  `;

  document.body.appendChild(panel);

  const stopBtn = document.getElementById("mh-stop");
  const flyBtn = document.getElementById("mh-fly");
  const scanBtn = document.getElementById("mh-scan");

  stopBtn.onclick = () => {
    if (isRunning) {
      clearInterval(_mhTimerWatcher);
      clearInterval(_mhPoliceWatcher);
      updateGuiStatus({ status: "Stoppet" });
      stopBtn.textContent = "▶ Start";
      isRunning = false;
    } else {
      updateGuiStatus({ status: "Starter..." });
      isRunning = true;
      stopBtn.textContent = "⏹ Stopp";

      navigateToMenuWithActiveTimer(() => {
        updateGuiStatus({ status: "Aktiv", activity: lastActivityName });
        _mhTimerWatcher = startAdvancedWatcher();
        _mhPoliceWatcher = startPoliceLevelWatcher();
      });
    }
  };

  flyBtn.onclick = () => {
    if (!isRunning) return;
    updateGuiStatus({ status: "Flyr..." });
    navigateToMenuWithActiveTimer(() => {
      flyToLowPoliceCity(() => {
        navigateToMenuWithActiveTimer(() => {
          _mhTimerWatcher = startAdvancedWatcher();
          _mhPoliceWatcher = startPoliceLevelWatcher();
          resumeLastActivity();
        });
      });
    });
  };

  scanBtn.onclick = () => {
    updateGuiStatus({ status: "Skanner menyer..." });
    scanAllAvailableActivities();
  };

  populateFallbackSelector();
}

function updateFallbackStatus(current, result) {
  const el = document.getElementById("mh-fallback");
  if (!el) return;
  let color = "yellow";
  if (result === "success") color = "lime";
  else if (result === "failed") color = "red";
  else if (result === "testing") color = "orange";
  el.innerHTML = `Fallback: <span style="color:${color}">${current}</span>`;
}

function updateGuiStatus({ status, activity, police }) {
  if (status) document.getElementById("mh-status").innerHTML = `Status: <span style="color:lime">${status}</span>`;
  if (activity) document.getElementById("mh-activity").textContent = `Aktivitet: ${activity}`;
  if (police) document.getElementById("mh-police").textContent = `Politi: ${police}`;
}

function populateFallbackSelector() {
  const container = document.getElementById("mh-fallback-selectors");
  container.innerHTML = "<b>Fallback-prioritet:</b><br/>";
  const updateFallback = () => {
    fallbackPriority = Array.from(container.querySelectorAll("select"))
      .map(s => s.value)
      .filter(v => v);
    localStorage.setItem("mh_fallback", JSON.stringify(fallbackPriority));
    console.log("🎯 Ny fallback-prioritet:", fallbackPriority);
  };
  for (let i = 0; i < 3; i++) {
    const select = document.createElement("select");
    select.style = "width: 100%; display: block; margin-top: 4px;";
    select.onchange = updateFallback;
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "(Velg aktivitet)";
    select.appendChild(defaultOption);
    for (const a of allActivities) {
      const opt = document.createElement("option");
      opt.value = a.name;
      opt.textContent = `${a.menu} → ${a.name}`;
      select.appendChild(opt);
    }
    select.value = fallbackPriority[i] || "";
    container.appendChild(select);
  }
}

// Sett default fallback om ingen finnes lagret
if (!localStorage.getItem("mh_fallback")) {
  const defaultFallback = [
    "lommetyveri → stjel fra turister", "lommetyveri → stjel fra pendlere",
    "lommetyveri → stjel armbåndsur", "lommetyveri → stjel smykker", "lommetyveri → stjel kredittkort",
    "lommetyveri → profesjonell lommetyv", "biltyver → stjel bildekk",
    "biltyver → stjel bildeler", "biltyver → stjel gammel bil", "biltyver → bygg fluktbil",
    "biltyver → stjel luksusbil", "innbrudd → knuse vindu", "innbrudd → knuse vindu",
    "innbrudd → dirke lås", "innbrudd → rane leilighet", "våpen → kjøp kniv",
    "våpen → stjel håndvåpen", "våpen → kjøp ammunisjon",
    "våpen → kjøp skuddsikker vest", "ran → ran person",
    "ran → ran kiosk", "ran → ran bensinstasjon", "ran → ran juvelerbutikk",
    "hvitvasking → vask små beløp",
    "hvitvasking → lag falske fakturaer", "gjeng → rekrutter småkriminell",
    "gjeng → rekrutter småkriminell", "gjeng → tren gjengmedlemmer",
    "verktøy → kjøp brekkjern", "verktøy → kjøp brekkjern", "verktøy → kjøp dirkesett",
    "verktøy → kjøp engangstelefoner", "verktøy → kjøp overvåkingsutstyr",
    "narkotika → kjøp cannabisfrø", "narkotika → kjøp cannabisfrø", "narkotika → dyrk cannabis",
    "cyberkriminalitet → skaff phishing programvare", "etterretning → samle gateinformasjon"
  ];
  localStorage.setItem("mh_fallback", JSON.stringify(defaultFallback));
}

async function scanAllAvailableActivities() {
  const allButtons = Array.from(document.querySelectorAll("button"));
  const excludedMenus = [
    "mine ting", "flyplass", "oppdrag", "blackjack",
    "hesteveddeløp", "lagre innstillinger", "statistikk", "innstillinger", "start", "stopp"
  ];
  
  const menuButtons = allButtons.filter(btn => {
    const span = btn.querySelector("span");
    const text = (span ? span.textContent : btn.textContent || "").trim().toLowerCase();
  
    return (
      text.length > 0 &&
      !excludedMenus.includes(text) &&
      !text.includes("reis") &&
      !btn.closest("#mh-control-panel")
    );

  })
  localStorage.setItem("mh_allActivities", JSON.stringify(allActivities));

  

  const results = [];

  for (const btn of menuButtons) {
    const span = btn.querySelector("span");
    const menuName = span ? span.textContent.trim() : btn.textContent.trim();

    btn.click();
    console.log(`📂 Åpner meny: ${menuName}`);
    await new Promise(res => setTimeout(res, 1500));

    const cards = Array.from(document.querySelectorAll("div.border"));
    for (const card of cards) {
      const titleEl = card.querySelector("div.font-bold");
      const startBtn = Array.from(card.querySelectorAll("button"))
        .find(b => b.textContent.trim().toLowerCase() === "start");

      if (titleEl && startBtn) {
        const activityName = titleEl.textContent.trim().toLowerCase();
        results.push({
          menu: menuName.toLowerCase(),
          name: activityName,
          startBtn
        });
      }
    }
  }

// Fjern duplikater basert på kombinasjonen "menu → name"
const uniqueResults = [];
const seenKeys = new Set();

for (const r of results) {
  const key = `${r.menu}→${r.name}`;
  if (!seenKeys.has(key)) {
    seenKeys.add(key);
    uniqueResults.push(r);
  }
}

allActivities = uniqueResults;
console.log("✅ Funn:", uniqueResults.map(r => `${r.menu} → ${r.name}`));
populateFallbackSelector();
}

function getAvailableActivities() {
  const results = [];
  const cards = Array.from(document.querySelectorAll("div.border"));
  for (const card of cards) {
    const titleEl = card.querySelector("div.font-bold");
    const startBtn = Array.from(card.querySelectorAll("button"))
      .find(b => b.textContent.trim().toLowerCase() === "start");

    if (titleEl && startBtn) {
      const activityName = titleEl.textContent.trim().toLowerCase();
      results.push({
        name: activityName,
        startBtn
      });
    }
  }
  return results;
}



function tryFallbackActivities(index = 0) {
  // 🔒 Ikke gjør noe hvis en aktivitet kjører (timer er synlig og blå)
  const timer = findCountdownTimer();
  if (timer) {
    console.log("⏳ Aktivitet er allerede aktiv – hopper over fallback.");
    return;
  }

  // 🛡️ Beskytt mot gjentatt fallbackforsøk
  if (!isTryingFallback) {
    isTryingFallback = true;
    setTimeout(() => isTryingFallback = false, 10000); // beskytt i 10 sekunder
  }

  if (index >= fallbackPriority.length) {
    updateFallbackStatus("Ingen tilgjengelige", "failed");
    console.warn("❌ Ingen fallback-aktiviteter kunne startes.");
    return;
  }

  const wantedName = fallbackPriority[index];
  updateFallbackStatus(wantedName, "testing");

  const match = allActivities.find(a => a.name === wantedName);
  if (!match) {
    console.warn(`❌ Fant ikke '${wantedName}' i allActivities – prøver neste`);
    tryFallbackActivities(index + 1);
    return;
  }

  const navigated = clickMenuItemWithText(match.menu);
  if (!navigated) {
    console.warn(`⚠️ Klarte ikke å navigere til meny: ${match.menu}`);
    tryFallbackActivities(index + 1);
    return;
  }

  setTimeout(() => {
    const activitiesNow = getAvailableActivities();
    const found = activitiesNow.find(a => a.name === wantedName);

    if (!found) {
      console.warn(`❌ Fant ikke '${wantedName}' etter navigering – prøver neste`);
      tryFallbackActivities(index + 1);
      return;
    }

    console.log(`✅ Klikker på '${found.name}'`);
    found.startBtn.click();

    // ⏳ Vent og bekreft at aktivitet faktisk starter
    let attempts = 0;
    const verifyStarted = setInterval(() => {
      detectCurrentActivity();
      const current = (lastActivityName || "").trim().toLowerCase();
      const target = wantedName.trim().toLowerCase();

      if (current === target) {
        clearInterval(verifyStarted);
        console.log(`✅ Aktivitet '${wantedName}' bekreftet startet.`);
        updateFallbackStatus(found.name, "success");
        updateGuiStatus({ status: "Fallback: Aktiv", activity: found.name });
      } else if (++attempts >= 6) { // 6 forsøk à 500ms = 3s
        clearInterval(verifyStarted);
        console.warn(`⚠️ '${wantedName}' startet ikke – prøver neste.`);
        tryFallbackActivities(index + 1);
      }
    }, 500);
  }, 1500);
}




// === Verktøy ===
function findCountdownTimer() {
  return Array.from(document.querySelectorAll("div.text-xs"))
    .find(el => {
      const text = el.textContent.trim().toLowerCase();
      const isBlue = getComputedStyle(el).color === 'rgb(7, 124, 174)';
      const matches = /^(\d+m\s*)?(\d+s)$/.test(text);
      return matches && isBlue;
    });
}

function clickStartInBlock(timerEl) {
  const block = timerEl.closest("div.border");
  if (!block) return;
  const startBtn = Array.from(block.querySelectorAll("button"))
    .find(btn => btn.textContent.trim().toLowerCase() === "start");
  if (startBtn) startBtn.click();
}

function clickFallback() {
    console.log("🔄 Starter fallback: Forsøker å finne 'Stjel kredittkort'");
  
    const navigated = clickMenuItemWithText("Lommetyveri");
    if (!navigated) {
      console.warn("⚠️ Klarte ikke å navigere til 'Lommetyveri'");
      return;
    }
  
    setTimeout(() => {
      const btn = Array.from(document.querySelectorAll("button"))
        .find(b => b.textContent.trim().toLowerCase() === "start" &&
                   b.closest("div.border")?.innerText.toLowerCase().includes("stjel kredittkort"));
  
      if (btn) {
        console.log("✅ Fallback: Starter 'Stjel kredittkort'");
        btn.click();
        updateGuiStatus({ status: "Fallback: Stjeler kort", activity: "stjel kredittkort" });
      } else {
        console.warn("❌ Finner ikke 'Stjel kredittkort' etter navigering");
      }
    }, 1500);
  }
  

  function clickMenuItemWithText(text) {
    const allButtons = Array.from(document.querySelectorAll("button"));
    const match = allButtons.find(btn => {
      const btnText = btn.textContent.trim().toLowerCase();
      return btnText === text.toLowerCase();
    });
    if (match) {
      match.click();
      return true;
    }
    return false;
  }
  

  // === Naviger til meny med aktiv timer
  function navigateToMenuWithActiveTimer(callback) {
    if (isTryingFallback) {
      console.warn("⏳ Hopper over navigering pga aktiv fallback.");
      if (callback) callback(false);
      return;
    }
  
    const menuButtons = Array.from(document.querySelectorAll("button")).filter(btn => {
      const span = btn.querySelector("span");
      const timer = btn.querySelector("div.text-xs");
      return span && timer && /^\d+m\s*\d+s$|^\d+s$/.test(timer.textContent.trim());
    });
  
    if (menuButtons.length === 0) {
      console.warn("❌ Fant ingen meny med aktiv timer – starter fallback");
      isTryingFallback = true;
      tryFallbackActivities(0);
      setTimeout(() => { isTryingFallback = false; }, 10000);
      if (callback) callback(false);
      return;
    }
  
    const activeBtn = menuButtons[0];
    const menuName = activeBtn.querySelector("span")?.textContent.trim();
  
    if (!menuName) {
      console.warn("❌ Kunne ikke hente meny-navn");
      isTryingFallback = true;
      tryFallbackActivities(0);
      setTimeout(() => { isTryingFallback = false; }, 10000);
      if (callback) callback(false);
      return;
    }
  
    const clicked = clickMenuItemWithText(menuName);
    if (!clicked) {
      console.warn("⚠️ Klarte ikke å navigere til meny:", menuName);
      isTryingFallback = true;
      tryFallbackActivities(0);
      setTimeout(() => { isTryingFallback = false; }, 10000);
      if (callback) callback(false);
      return;
    }
  
    console.log("🧭 Navigerer til meny med aktiv timer:", menuName);
  
    setTimeout(() => {
      detectCurrentActivity();
      if (!lastActivityName) {
        console.warn("⚠️ Klarte ikke å lagre aktivitet – fallback");
        isTryingFallback = true;
        tryFallbackActivities(0);
        setTimeout(() => { isTryingFallback = false; }, 10000);
        if (callback) callback(false);
        return;
      }
      if (callback) callback(true);
    }, 2000);
  }
  

// === Deteksjon og lagring av aktiv aktivitet
function detectCurrentActivity() {
  const bars = Array.from(document.querySelectorAll("div[style*='transform: scaleX']"));

  const activeBar = bars.find(el => {
    const transform = el.style.transform;
    const match = transform.match(/scaleX\(([\d.]+)\)/);
    return match && parseFloat(match[1]) > 0;
  });

  if (!activeBar) return;

  const activeCard = activeBar.closest("div.border.rounded-sm");
  if (!activeCard) return;

  const title = activeCard.querySelector("div.font-bold");
  if (title) {
    lastActivityName = title.textContent.trim().toLowerCase();
    updateGuiStatus({ activity: lastActivityName });
    console.log("💾 Lagret aktivitet:", lastActivityName);
  }

  const activeMenu = Array.from(document.querySelectorAll("button")).find(btn => {
    const span = btn.querySelector("span");
    const seconds = btn.querySelector("div.text-xs");
    return span && seconds && /^\d+s$/.test(seconds.textContent.trim());
  });

  if (activeMenu) {
    const menuText = activeMenu.querySelector("span")?.textContent.trim();
    if (menuText) {
      lastMenuName = menuText;
      console.log("💾 Lagret meny:", lastMenuName);
    }
  }
}

// === Gjenoppta sist lagrede aktivitet
function resumeLastActivity() {
  if (!lastActivityName || !lastMenuName) {
    console.warn("❌ Mangler lagret aktivitet eller menyvalg.");
    tryFallbackActivities(0);
    return;
  }

  const navigated = clickMenuItemWithText(lastMenuName);
  if (!navigated) {
    console.warn("⚠️ Klarte ikke å gå tilbake til meny:", lastMenuName);
    tryFallbackActivities(0);
    return;
  }

  setTimeout(() => {
    const allCards = Array.from(document.querySelectorAll("div.border.rounded-sm"));

    for (const card of allCards) {
      const cardTitle = card.querySelector("div.font-bold");
      if (!cardTitle) continue;

      const cardText = cardTitle.textContent.trim().toLowerCase();
      if (cardText === lastActivityName) {
        const startBtn = Array.from(card.querySelectorAll("button"))
          .find(b => b.textContent.trim().toLowerCase() === "start");
        if (startBtn) {
          console.log("🔁 Gjenopptar aktivitet:", lastActivityName);
          startBtn.click();
          updateGuiStatus({ status: "Aktiv" });
          return;
        }
      }
    }

    console.warn("⚠️ Kunne ikke finne aktivitet:", lastActivityName);
    tryFallbackActivities(0);
  }, 2000);
}

function flyToLowPoliceCity(callbackAfterFlight) {
  navigateToMenuWithActiveTimer(() => {
    const navigated = clickMenuItemWithText("Flyplass");
    if (!navigated) return;

    // Vent til bylisten er klar
    const checkForCityList = setInterval(() => {
      const cityList = Array.from(document.querySelectorAll("div.grid.grid-cols-3.cursor-pointer"));
      if (cityList.length === 0) return;

      clearInterval(checkForCityList);
      console.log("📋 Byliste funnet – prøver å finne by med lavt politinivå");

      const targetRow = cityList.find(row => {
        const level = row.querySelector("div.text-center.text-green-500");
        return level && level.textContent.trim().toLowerCase() === "lav";
      });

      if (!targetRow) {
        console.warn("❌ Ingen by med lavt politinivå.");
        return;
      }

      const radio = targetRow.querySelector("input[type='radio']");
      if (!radio) {
        console.warn("❌ Fant rad, men ingen radioknapp.");
        return;
      }

      radio.click();
      console.log("✈️ Valgte by med lav politinivå:", targetRow.innerText.split("\n")[0]);

      setTimeout(() => {
        const reisBtn = Array.from(document.querySelectorAll("button"))
          .find(b => b.textContent.trim().toLowerCase() === "reis");

        if (reisBtn) {
          reisBtn.click();
          console.log("🛫 Reiseknapp trykket");

          setTimeout(() => {
            if (callbackAfterFlight) callbackAfterFlight();
          }, 4000);
        } else {
          console.warn("❌ Reis-knapp ikke funnet.");
        }
      }, 800);
    }, 500); // sjekk hvert halve sekund
  });
}



// === Politi-overvåkning
function startPoliceLevelWatcher() {
  return setInterval(() => {
    const blocks = Array.from(document.querySelectorAll("div.flex.flex-col.leading-none.gap-2"));
    const policeBlock = blocks.find(block => {
      const title = block.querySelector("span");
      return title && title.textContent.trim().toLowerCase() === "politi";
    });

    if (!policeBlock) return;

    const value = policeBlock.querySelectorAll("span")[1];
    if (!value) return;

    const level = value.textContent.trim().toLowerCase();
    updateGuiStatus({ police: level });

    if (level !== "lav") {
      console.log("🚨 Politinivå for høyt – reiser");
      clearInterval(_mhTimerWatcher);
      flyToLowPoliceCity(() => {
        navigateToMenuWithActiveTimer(() => {
          _mhTimerWatcher = startAdvancedWatcher();
          _mhPoliceWatcher = startPoliceLevelWatcher();
          resumeLastActivity();
        });
      });
    }
  }, 10000);
}

// === Beregnser gjenstående tid for gjeldene aktivete
function updateRemainingCycles() {
  const allBlocks = Array.from(document.querySelectorAll("div.border.rounded-sm"));

  for (const block of allBlocks) {
    const cycleInfo = Array.from(block.querySelectorAll("div.text-xs"))
      .find(div => div.textContent.includes("sykluser igjen"));

    if (!cycleInfo) continue;

    const match = cycleInfo.textContent.match(/(\d+)\s+sykluser/);
    if (!match) continue;

    const cycles = parseInt(match[1]);
    const totalSeconds = cycles * 10;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    let text = "";
    if (hours > 0) text += `${hours}t `;
    if (minutes > 0 || hours > 0) text += `${minutes}m `;
    text += `${seconds}s`;

    const ui = document.getElementById("mh-remaining");
    if (ui) {
      let color = "#0ff";
      if (totalSeconds < 600) color = "red";
      else if (totalSeconds < 1800) color = "orange";
      else if (totalSeconds < 3600) color = "yellow";
      ui.innerHTML = `Gjenstår: <span style="color:${color}">${text}</span>`;
    }

    return; // fant aktiv blokk – stopp
  }

  // fallback
  const ui = document.getElementById("mh-remaining");
  if (ui) {
    ui.innerHTML = `Gjenstår: <span style="color:gray">ukjent</span>`;
  }
}


// === Timer-overvåkning
function startAdvancedWatcher() {
  let lastSeen = Date.now();
  let lastValue = null;

  updateRemainingCycles();

  return setInterval(() => {
    const timerEl = findCountdownTimer();
    
    if (timerEl) {
      const val = timerEl.textContent.trim();
      if (val !== lastValue) {
        lastValue = val;
        lastSeen = Date.now();
      }

      if (val === "1s" || val === "0s") {
        clickStartInBlock(timerEl);
      }
    } else {
      const elapsed = (Date.now() - lastSeen) / 1000;

      if (elapsed > 3) {
        if (lastActivityName) {
          console.log("⛔️ Timer forsvunnet – nullstiller aktivitet:", lastActivityName);
          lastActivityName = null;
          updateGuiStatus({ status: "Inaktiv", activity: "Ingen" });
        }

        console.log("🕓 Ingen timer og ingen aktivitet – starter fallback");
        tryFallbackActivities(0);
        lastSeen = Date.now();
      }
    }

    updateRemainingCycles();
  }, 10000);
}



// === Start script
createControlPanel();
navigateToMenuWithActiveTimer(() => {
  _mhTimerWatcher = startAdvancedWatcher();
  _mhPoliceWatcher = startPoliceLevelWatcher();
  updateGuiStatus({ status: "Aktiv" });
// scanAllAvailableActivities();
});