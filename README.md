# STL Analyzer & Ruler (3D Měření a Úprava Velikosti)

Webová aplikace inspirovaná analytickými CAD nástroji (jako např. [stl-splitter.com/analyze](https://www.stl-splitter.com/analyze)), která umožňuje detailní rozměrovou analýzu 3D modelů (STL), přesné měření vzdáleností pomocí 3D pravítka s magnetickým přichytáváním k vrcholům a následnou úpravu velikosti objektu s možností exportu do nového binárního STL souboru.

---

## 🚀 Hlavní funkce

### 1. 📏 3D Pravítko a měření rozměrů
- **Měření libovolných dvou bodů**: Kliknutím vyberete 1. a 2. bod na povrchu modelu.
- **Magnetické přichytávání (Vertex & Surface Snap)**: Kurzor se automaticky přichytává k přesným vrcholům trojúhelníkové sítě modelu pro maximální CAD přesnost (0.01 mm).
- **Detailní rozpad kót**:
  - Přímá euklidovská 3D vzdálenost
  - Projekce do jednotlivých os: $\Delta X$ (šířka), $\Delta Y$ (hloubka), $\Delta Z$ (výška)
- **Správa kót**: Možnost měření pojmenovat, skrývat/zobrazovat, mazat nebo barevně rozlišovat.
- **3D štítky přímo ve scéně**: Interaktivní vektorové kóty promítané do 3D prostoru.

### 2. ⚖️ Úprava velikosti a transformace modelu
- **Zadání přesných rozměrů (mm)**: Změna cílové šířky (X), hloubky (Y) nebo výšky (Z).
- **Zámek poměru stran**: Rovnoměrné (uniformní) škálování nebo nezávislá změna rozměru v jedné ose.
- **Škálování přímo podle naměřené kóty**: Naměříte např. otvor o průměru 18.5 mm, zadáte, že má mít přesně 20.0 mm, a aplikace automaticky přepočítá a zvětší celý model na požadovaný rozměr.
- **Procentuální změna velikosti**: Rychlé předvolby (50 %, 75 %, 125 %, 150 %, 200 %) a převodník mezi palci a milimetry ($\times 25.4$).
- **Rotace a usazení**: Otočení o 90° kolem os X, Y, Z, položení na podložku ($Z=0$) a vycentrování na střed.
- **Export do STL**: Stažení modifikovaného modelu jako optimalizovaného binárního STL pro 3D slicer (PrusaSlicer, Bambu Studio, OrcaSlicer, Cura).

### 3. 🔍 Geometrická analýza modelu (ve stylu stl-splitter.com/analyze)
- **Celkové rozměry ohraničení (Bounding Box)** s vizuálními 3D kótami podél hran.
- **Objem modelu ($V$)**: Přesný výpočet v $\text{cm}^3$ a $\text{mm}^3$ (pomocí integrace orientovaných čtyřstěnů).
- **Plocha povrchu ($S$)**: V $\text{cm}^2$ a $\text{mm}^2$.
- **Kalkulátor hmotnosti a ceny filamentu pro 3D tisk**:
  - Volba materiálu (PLA, PETG, ABS, TPU, Resin, Hliník, Ocel)
  - Nastavení procenta výplně (Infill 10–100 %)
  - Výpočet odhadované váhy ve gramech a ceny výtisku v Kč.
- **Kontrola integrity sítě (Mesh Health)**:
  - Kontrola vodotěsnosti (2-manifold closed mesh check)
  - Počet trojúhelníků a vrcholů
  - Velikost souboru

### 4. 📦 Rychlé testování a ukázkové modely
Aplikace obsahuje vestavěné technické součástky připravené k okamžitému vyzkoušení:
- **Kalibrační kostka (20×20×20 mm)**: S osazením a čepem.
- **Mechanická konzole s osazením (60×40×35 mm)**.
- **Příruba s osazením (Ø 50 mm)**.

Můžete také kdykoliv přetáhnout (Drag & Drop) jakýkoliv vlastní `.stl` soubor odkudkoliv z počítače.

---

## 🛠️ Spuštění aplikace

Projekt běží na **Vite + React + TypeScript + Three.js + Tailwind CSS**:

```bash
# Přejděte do složky projektu
cd stl-analyzer-measurer

# Spuštění vývojového serveru
npm run dev
```

Aplikace se otevře na adrese: `http://localhost:5173/`

### Sestavení pro produkci (Build)
```bash
npm run build
```
Vytvoří optimalizovaný balíček ve složce `dist/`.
