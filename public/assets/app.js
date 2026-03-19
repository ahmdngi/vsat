const state = {
  authenticated: false,
  operator: "",
  status: null,
  profile: null,
  terminals: [],
  modemProfiles: [],
  blockingZones: [],
  networkPorts: [],
  configuredVessel: null,
  upstreamNav: null,
  wan: null,
  logs: { events: [], commands: [] },
  currentView: "overview",
};

const els = {
  accessMode: document.getElementById("access-mode"),
  antennaForm: document.getElementById("antenna-form"),
  antennaStatus: document.getElementById("antenna-status"),
  agc: document.getElementById("agc"),
  ber: document.getElementById("ber"),
  blockingZoneBody: document.getElementById("blocking-zone-body"),
  cNo: document.getElementById("cNo"),
  carrierLock: document.getElementById("carrier-lock"),
  carrierState: document.getElementById("carrier-state"),
  clock: document.getElementById("clock"),
  commandBody: document.getElementById("command-body"),
  configuredVesselImo: document.getElementById("configured-vessel-imo"),
  configuredVesselName: document.getElementById("configured-vessel-name"),
  connectionBanner: document.getElementById("connection-banner"),
  consoleCommand: document.getElementById("console-command"),
  consoleForm: document.getElementById("console-form"),
  consoleOutput: document.getElementById("console-output"),
  eventsBody: document.getElementById("events-body"),
  firmware: document.getElementById("firmware"),
  gps: document.getElementById("gps"),
  heading: document.getElementById("heading"),
  loginCard: document.getElementById("login-card"),
  loginForm: document.getElementById("login-form"),
  loginStatus: document.getElementById("login-status"),
  managementIp: document.getElementById("management-ip"),
  modemProfileBody: document.getElementById("modem-profile-body"),
  networkPortBody: document.getElementById("network-port-body"),
  logoutButton: document.getElementById("logout-button"),
  overviewManagementIp: document.getElementById("overview-management-ip"),
  networkForm: document.getElementById("network-form"),
  networkStatus: document.getElementById("network-status"),
  pageTitle: document.getElementById("page-title"),
  pitch: document.getElementById("pitch"),
  posOk: document.getElementById("pos-ok"),
  profileName: document.getElementById("profileName"),
  roll: document.getElementById("roll"),
  rxDbm: document.getElementById("rxDbm"),
  satelliteName: document.getElementById("satelliteName"),
  servicePort: document.getElementById("service-port"),
  softwareVersion: document.getElementById("software-version"),
  spectralInversion: document.getElementById("spectral-inversion"),
  terminalBody: document.getElementById("terminal-body"),
  trackingMode: document.getElementById("trackingMode"),
  txMute: document.getElementById("tx-mute"),
  txDbm: document.getElementById("txDbm"),
  uploadFile: document.getElementById("upload-file"),
  uploadForm: document.getElementById("upload-form"),
  uploadStatus: document.getElementById("upload-status"),
  uptime: document.getElementById("uptime"),
  vesselImo: document.getElementById("vessel-imo"),
  vesselName: document.getElementById("vessel-name"),
};

document.querySelectorAll(".nav-link").forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

els.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(els.loginForm);
  const response = await fetchJson("/api/login", {
    method: "POST",
    body: JSON.stringify({
      username: form.get("username"),
      password: form.get("password"),
    }),
  });

  if (!response.ok) {
    els.loginStatus.textContent = "Invalid credentials. Try admin/1234 or service/service.";
    return;
  }

  els.loginStatus.textContent = "Login successful. Operator privileges granted.";
  await refresh();
});

els.logoutButton.addEventListener("click", async () => {
  await fetchJson("/api/logout", { method: "POST" });
  els.loginStatus.textContent = "Logged out. Guest access restored.";
  await refresh();
});

els.antennaForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(els.antennaForm);
  const response = await fetchJson("/api/config/antenna", {
    method: "POST",
    body: JSON.stringify({
      profileName: form.get("profileName"),
      satelliteName: form.get("satelliteName"),
      trackingMode: form.get("trackingMode"),
    }),
  });

  els.antennaStatus.textContent = response.ok
    ? "Antenna configuration updated."
    : "Login required for configuration changes.";
  await refresh();
});

els.networkForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(els.networkForm);
  const response = await fetchJson("/api/config/network", {
    method: "POST",
    body: JSON.stringify({
      targetIp: form.get("targetIp"),
      mask: form.get("mask"),
      gateway: form.get("gateway"),
    }),
  });

  els.networkStatus.textContent = response.ok
    ? "LAN settings applied successfully."
    : "Login required for network configuration.";
  await refresh();
});

els.consoleForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const command = els.consoleCommand.value.trim();
  if (!command) {
    return;
  }

  const response = await fetchJson("/api/command", {
    method: "POST",
    body: JSON.stringify({ command }),
  });

  if (response.ok) {
    els.consoleOutput.textContent = response.output.join("\n");
    els.consoleCommand.value = "";
  } else {
    els.consoleOutput.textContent = "authentication required";
  }

  await refresh();
});

els.uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  els.uploadStatus.classList.remove("success", "error");
  const file = els.uploadFile.files?.[0];
  if (!file) {
    els.uploadStatus.textContent = "Select a package file first.";
    els.uploadStatus.classList.add("error");
    return;
  }

  const response = await fetchJson("/api/upload", {
    method: "POST",
    body: JSON.stringify({
      filename: file.name,
      size: file.size,
      mime: file.type || "application/octet-stream",
    }),
  });

  els.uploadStatus.textContent = response.ok
    ? response.message
    : "Authentication file upload failed.";
  els.uploadStatus.classList.add(response.ok ? "success" : "error");

  if (response.ok) {
    els.uploadFile.value = "";
  }

  await refresh();
});

function switchView(view) {
  state.currentView = view;
  document.querySelectorAll(".nav-link").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  document.querySelectorAll(".view").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.viewPanel === view);
  });
  els.pageTitle.textContent = ({
    overview: "Dashboard",
    antenna: "Antenna Control",
    network: "Settings",
    events: "Alarm Log",
    console: "Service",
  })[view];
  document.getElementById("breadcrumb-view").textContent = ({
    overview: "Dashboard",
    antenna: "Antenna",
    network: "Settings",
    events: "Alarms",
    console: "Service",
  })[view];
}

async function refresh() {
  if (window.location.protocol === "file:") {
    els.connectionBanner.hidden = false;
    return;
  }

  const response = await fetchJson("/api/status");
  if (!response.httpOk) {
    els.connectionBanner.hidden = false;
    return;
  }

  els.connectionBanner.hidden = true;
  state.authenticated = response.authenticated;
  state.operator = response.operator;
  state.status = response.status;
  state.profile = response.profile;
  state.terminals = response.terminals;
  state.configuredVessel = response.configuredVessel;
  state.upstreamNav = response.upstreamNav;
  state.wan = response.wan;
  state.modemProfiles = response.modemProfiles || [];
  state.blockingZones = response.blockingZones || [];
  state.networkPorts = response.networkPorts || [];
  state.logs = response.logs;
  render();
}

function render() {
  const scrapedName = state.upstreamNav?.status === "live" ? state.upstreamNav.vesselName : "";
  const configuredName = state.configuredVessel?.shipName || "";
  const configuredImo = state.configuredVessel?.imo || "";
  const vesselName = scrapedName || configuredName;
  const serialNumber = state.profile?.serialNumber || "S900-4821-0391";
  els.vesselName.textContent = "SAILOR 900 VSAT Ka";
  els.vesselImo.textContent = `SN: ${serialNumber}`;
  els.configuredVesselName.textContent = vesselName || "Unavailable";
  els.configuredVesselImo.textContent = configuredImo || "Unavailable";
  els.accessMode.textContent = state.authenticated ? `Operator: ${state.operator}` : "Guest";
  els.loginStatus.textContent = state.authenticated
    ? "Operator session active. Configuration controls are enabled."
    : "Use operator credentials to unlock configuration controls.";
  els.managementIp.textContent = state.wan?.targetIp || "192.168.0.1";
  els.overviewManagementIp.textContent = state.wan?.targetIp || "192.168.0.1";
  els.softwareVersion.textContent = state.profile?.firmware || "v2.4.3";
  els.servicePort.textContent = state.wan?.servicePort || "LAN port 3";
  els.logoutButton.hidden = !state.authenticated;
  els.loginCard.classList.toggle("collapsed", state.authenticated);
  els.loginCard.style.display = state.authenticated ? "none" : "grid";

  els.rxDbm.textContent = `${state.status.rxDbm} dBm`;
  els.txDbm.textContent = `${state.status.txDbm} dBm`;
  els.cNo.textContent = `${state.status.cNo} dB`;
  els.ber.textContent = state.status.ber;
  els.gps.textContent = state.status.gps;
  els.heading.textContent = `${state.status.heading} deg`;
  els.pitch.textContent = `${state.status.pitch} deg`;
  els.roll.textContent = `${state.status.roll} deg`;
  els.carrierState.textContent = state.terminals[0]?.status || "Tracking";
  els.agc.textContent = `${state.status.agc ?? "-"} %`;
  els.spectralInversion.textContent = state.status.spectralInversion || "-";
  els.carrierLock.textContent = state.status.carrier || "-";
  els.txMute.textContent = state.status.txMute || "-";
  els.posOk.textContent = state.status.posOk || "-";

  els.profileName.textContent = state.profile.profileName;
  els.satelliteName.textContent = state.profile.satelliteName;
  els.trackingMode.textContent = state.profile.trackingMode;
  els.firmware.textContent = state.profile.firmware;
  els.uptime.textContent = `${state.profile.uptimeHours} h`;

  els.antennaForm.profileName.value = state.profile.profileName;
  els.antennaForm.satelliteName.value = state.profile.satelliteName;
  els.antennaForm.trackingMode.value = state.profile.trackingMode;

  els.networkForm.targetIp.value = state.wan.targetIp;
  els.networkForm.mask.value = state.wan.mask;
  els.networkForm.gateway.value = state.wan.gateway;

  els.terminalBody.innerHTML = state.terminals.map((terminal) => `
    <tr>
      <td>${escapeHtml(terminal.name)}</td>
      <td>${escapeHtml(terminal.status)}</td>
      <td>${escapeHtml(String(terminal.temperature))} °C</td>
      <td>${escapeHtml(String(terminal.azimuth))}°</td>
      <td>${escapeHtml(String(terminal.elevation))}°</td>
    </tr>
  `).join("");

  els.modemProfileBody.innerHTML = state.modemProfiles.map((profile) => `
    <tr>
      <td>${escapeHtml(profile.name)}</td>
      <td>${escapeHtml(profile.txFrequency)}</td>
      <td>${escapeHtml(profile.rxFrequency)}</td>
      <td>${escapeHtml(profile.symbolRate)}</td>
      <td>${escapeHtml(profile.network)}</td>
      <td>${profile.active ? "Active" : "Standby"}</td>
    </tr>
  `).join("");

  els.blockingZoneBody.innerHTML = state.blockingZones.map((zone) => `
    <tr>
      <td>${escapeHtml(zone.name)}</td>
      <td>${escapeHtml(zone.start)} deg</td>
      <td>${escapeHtml(zone.stop)} deg</td>
      <td>${escapeHtml(zone.type)}</td>
      <td>${escapeHtml(zone.status)}</td>
    </tr>
  `).join("");

  els.networkPortBody.innerHTML = state.networkPorts.map((port) => `
    <tr>
      <td>${escapeHtml(port.port)}</td>
      <td>${escapeHtml(port.role)}</td>
      <td>${escapeHtml(port.ip)}</td>
      <td>${escapeHtml(port.status)}</td>
    </tr>
  `).join("");

  els.eventsBody.innerHTML = state.logs.events.map((event) => `
    <tr>
      <td class="mono">${escapeHtml(event.ts)}</td>
      <td><span class="severity ${escapeHtml(event.level)}">${escapeHtml(event.level)}</span></td>
      <td class="mono">${escapeHtml(event.code)}</td>
      <td>${escapeHtml(event.message)}</td>
    </tr>
  `).join("");

  els.commandBody.innerHTML = state.logs.commands.map((entry) => `
    <tr>
      <td class="mono">${escapeHtml(entry.ts)}</td>
      <td>${escapeHtml(entry.operator)}</td>
      <td>${escapeHtml(entry.action)}</td>
      <td>${escapeHtml(entry.detail)}</td>
    </tr>
  `).join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  try {
    const payload = await response.json();
    if (payload && typeof payload === "object") {
      payload.httpOk = response.ok;
    }
    return payload;
  } catch {
    return { ok: false, httpOk: false };
  }
}

function updateClock() {
  els.clock.textContent = new Date().toLocaleString("en-GB", {
    hour12: false,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC",
  }) + " UTC";
}

updateClock();
setInterval(updateClock, 1000);
switchView("overview");
refresh();
setInterval(refresh, 5000);
