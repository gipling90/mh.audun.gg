# 🕶️ Mafiaens Hevn AutoScript

Et ikke-persistent browser-automatiseringsscript for [mh.audun.gg](https://mh.audun.gg), utviklet for å automatisere aktiviteter, overvåke politi og bruke fallback-handlinger når nødvendig.

> ⚠️ Dette skriptet må **limes inn i konsollen** hver gang siden lastes på nytt — *eller installeres som et Tampermonkey-script!*

---

## ✨ Funksjoner

- Automatisk gjenkjenning og fortsettelse av aktiv aktivitet
- Automatisk fallback til alternative handlinger ved problemer
- Overvåkning og automatisk bytte ved høyt politinivå
- GUI-panelet med status, kontroll og fallback-prioritet
- Visualisering av gjenværende tid (sykluser → minutter/timer/dager)
- Mulighet til å skanne tilgjengelige aktiviteter og lagre i `localStorage`
- **Støtte for Tampermonkey – gjør scriptet persistent og automatisk**

---

## 🧑‍💻 Bruk via Konsoll (manuelt)

1. Åpne [mh.audun.gg](https://mh.audun.gg) i en Chromium-basert nettleser (f.eks. Chrome, Brave, Edge).
2. Trykk `F12` eller høyreklikk → `Inspiser` → gå til "Console"-fanen.
3. Lim inn hele scriptet og trykk `Enter`.
4. Et kontrollpanel vises øverst til høyre (eller under menyen).

---

## 🧩 Bruk via Tampermonkey (automatisk)

1. Installer Tampermonkey:
   - [Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
2. Gå til `https://mh.audun.gg`.
3. Klikk på Tampermonkey-ikonet → `Opprett nytt script`.
4. Lim inn hele Mafiaens Hevn AutoScript og lagre (`Ctrl+S`).
5. Scriptet vil nå kjøre automatisk hver gang du åpner siden.

> 💡 Alternativt kan du lenke scriptet til `@include` i metadata hvis du vil laste det fra et GitHub raw-URL.

---

## 🧭 Kontrollpanelet

| Element        | Beskrivelse |
|----------------|-------------|
| **Status**     | Viser om scriptet er aktivt, stoppet eller starter |
| **Aktivitet**  | Nåværende eller sist lagrede aktivitet |
| **Politi**     | Nåværende politinivå i byen |
| **Fallback**   | Viser hvilken fallback som testes eller er aktiv |
| **Gjenstår**   | Tid igjen før aktiviteten stopper (basert på sykluser) |
| **Stopp/Start**| Stopper eller starter scriptet manuelt |
| **Fly nå**     | Tvinger bytte til by med lavt politinivå |
| **Reskan**     | Leser meny og tilgjengelige aktiviteter på nytt |
| **Fallback-prioritet** | 3 dropdowns for å definere hvilke handlinger som skal testes ved feil |

---

## 🧠 Hvordan fungerer fallback?

1. Hvis en aktivitet feiler, vil scriptet forsøke neste i fallback-listen.
2. Disse fallback-aktivitetene kan konfigureres i kontrollpanelet (lagres i `localStorage`).
3. Om politinivået blir for høyt, bytter scriptet automatisk by før det gjenopptar aktivitet.

---

## 🛠 Teknisk oversikt

- **Automatisert klikking:** Basert på knappetekst og DOM-søk
- **Statusgjenkjenning:** Analyserer fremdriftsindikator og nedtelling
- **Fallbacklogikk:** Går gjennom prioritert liste og forsøker start
- **Persistent fallback/data:** Lokal lagring via `localStorage`
- **GUI:** Generert via JS og festet til DOM-en under meny-panelet

---

## 📦 For utviklere

Du kan bygge videre på scriptet ved å:

- Kalle `scanAllAvailableActivities()` for å oppdatere fallback-valg
- Justere fallback-rutinen via `localStorage.setItem("mh_fallback", [...])`
- Tilpasse GUI direkte i `createControlPanel()`-funksjonen

---

## ⚠️ Ansvarsfraskrivelse

Dette scriptet er kun for læring, eksperimentering og personlig bruk. Ikke bruk det i strid med nettstedets vilkår. Utvikleren tar ikke ansvar for misbruk.
