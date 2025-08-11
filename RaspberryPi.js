const snmp = require("net-snmp");
const axios = require("axios");

const host = "192.168.0.1";
const community = "public";
const apiUrl = "https://4ze4aw4r92.execute-api.eu-central-1.amazonaws.com/prod/PoEData-N";

const session = snmp.createSession(host, community);

const baseOids = {
  voltage: "1.3.6.1.4.1.11863.6.56.1.1.2.1.1.9",
  current: "1.3.6.1.4.1.11863.6.56.1.1.2.1.1.8",
  power:   "1.3.6.1.4.1.11863.6.56.1.1.2.1.1.7"
};

// تابع گرفتن زمان به فرمت CEST شبیه ISO
function getTimestampCEST() {
  return new Date().toLocaleString("sv-SE", {
    timeZone: "Europe/Berlin",
    hour12: false
  }).replace(" ", "T");
}

function leseWerte(port) {
  const oids = [
    `${baseOids.voltage}.${port}`,
    `${baseOids.current}.${port}`,
    `${baseOids.power}.${port}`
  ];

  session.get(oids, async (error, antwort) => {
    if (error) {
      console.error(`❌ Fehler bei Port ${port}:`, error.message);
      return;
    }

    const spannung = antwort[0]?.value / 10 || 0; // V
    const strom    = antwort[1]?.value || 0;      // mA یا A
    const leistung = antwort[2]?.value / 10 || 0; // W

    const daten = {
      timestamp: getTimestampCEST(),
      port,
      spannung: spannung.toFixed(1),
      strom,
      leistung: leistung.toFixed(1)
    };

    console.log(`📡 Port ${port}:`, daten);

    try {
      const res = await axios.post(apiUrl, daten, {
        headers: { "Content-Type": "application/json" }
      });
      console.log("✅ Daten gesendet. HTTP Status:", res.status);
    } catch (err) {
      console.error("❌ Fehler beim Senden zur API:", err.message);
    }
  });
}

function allePortsLesen() {
  for (let port = 1; port <= 8; port++) {
    leseWerte(port);
  }
}

// اولین بار فوراً

allePortsLesen();

// بعد هر 30 ثانیه
setInterval(allePortsLesen, 30 * 1000);