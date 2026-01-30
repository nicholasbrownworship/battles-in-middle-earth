/**
 * MESBG Army Builder - Warband Edition
 */

let currentArmyData = null;
let warbands = []; // Array of objects: { id, hero: {}, units: [] }

const armySelector = document.getElementById('army-selector');
const heroGrid = document.getElementById('hero-grid');
const warriorGrid = document.getElementById('warrior-grid');
const selectedContainer = document.getElementById('selected-units');
const pointsDisplay = document.getElementById('total-points');

const RANKS = {
    "Legend": 18, "Valor": 15, "Fortitude": 12, "Minor": 6, "Independent": 0
};

async function initApp() {
    try {
        const response = await fetch('./data/armies.json');
        const armyList = await response.json();
        armySelector.innerHTML = '<option value="">-- Choose an Army --</option>';
        armyList.forEach(army => {
            const opt = document.createElement('option');
            opt.value = army.file;
            opt.textContent = army.name;
            armySelector.appendChild(opt);
        });
    } catch (e) { console.error("Manifest error", e); }
}

// --- Warband Management ---

window.addWarband = (heroId) => {
    const heroTemplate = currentArmyData.heroes.find(h => h.id === heroId);
    const newWarband = {
        id: Date.now(),
        hero: { ...JSON.parse(JSON.stringify(heroTemplate)), selectedOptions: [] },
        units: []
    };
    warbands.push(newWarband);
    updateArmyUI();
};

window.addUnitToWarband = (warbandId, unitId) => {
    const warband = warbands.find(w => w.id === warbandId);
    const template = currentArmyData.warriors.find(u => u.id === unitId);
    
    // Check capacity
    const currentCount = warband.units.length;
    const maxCount = RANKS[warband.hero.rank] || 0;
    
    if (currentCount >= maxCount) {
        alert("This hero cannot lead any more warriors!");
        return;
    }

    warband.units.push({
        ...JSON.parse(JSON.stringify(template)),
        instanceId: Date.now() + Math.random(),
        selectedOptions: []
    });
    updateArmyUI();
};

window.toggleWargear = (warbandId, instanceId, optionId, isHero = false) => {
    const warband = warbands.find(w => w.id === warbandId);
    const unit = isHero ? warband.hero : warband.units.find(u => u.instanceId === instanceId);
    
    const idx = unit.selectedOptions.indexOf(optionId);
    if (idx > -1) unit.selectedOptions.splice(idx, 1);
    else unit.selectedOptions.push(optionId);
    
    updateArmyUI();
};

// --- Rendering Logic ---

function updateArmyUI() {
    let grandTotal = 0;
    selectedContainer.innerHTML = '';

    warbands.forEach(wb => {
        const wbEl = document.createElement('div');
        wbEl.className = 'warband-container';
        
        // 1. Calculate Hero
        let heroCost = wb.hero.points;
        wb.hero.selectedOptions.forEach(oid => {
            heroCost += wb.hero.options.find(o => o.id === oid).points;
        });
        grandTotal += heroCost;

        // 2. Group Warriors by Configuration (ID + Options)
        const groups = {};
        wb.units.forEach(u => {
            const configKey = u.id + "|" + u.selectedOptions.sort().join(',');
            if (!groups[configKey]) {
                groups[configKey] = { data: u, count: 0, instances: [] };
            }
            groups[configKey].count++;
            groups[configKey].instances.push(u.instanceId);
        });

        // 3. Build HTML
        wbEl.innerHTML = `
            <div class="warband-header">
                <div class="hero-block">
                    <strong>${wb.hero.name}</strong> (${wb.hero.rank}) - ${heroCost}pts
                    <div class="options-row">${renderOptions(wb, wb.hero, true)}</div>
                </div>
                <div class="warband-stats">${wb.units.length} / ${RANKS[wb.hero.rank] || 0} Warriors</div>
            </div>
            <div class="warband-units">
                ${Object.values(groups).map(group => {
                    let unitTotal = group.data.points;
                    group.data.selectedOptions.forEach(oid => {
                        unitTotal += group.data.options.find(o => o.id === oid).points;
                    });
                    grandTotal += (unitTotal * group.count);

                    return `
                        <div class="unit-stack">
                            <div class="stack-info">
                                <span>${group.count}x ${group.data.name}</span>
                                <span>${unitTotal * group.count} pts</span>
                            </div>
                            <div class="options-row">${renderOptions(wb, group.data, false)}</div>
                            <div class="stack-controls">
                                <button onclick="changeCount(${wb.id}, '${group.data.id}', '${group.data.selectedOptions.join(',')}', -1)">-</button>
                                <button onclick="changeCount(${wb.id}, '${group.data.id}', '${group.data.selectedOptions.join(',')}', 1)">+</button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            <button class="btn-add-mini" onclick="showWarriorPicker(${wb.id})">+ Add Warrior</button>
        `;
        selectedContainer.appendChild(wbEl);
    });

    pointsDisplay.innerText = grandTotal;
}

function renderOptions(wb, unit, isHero) {
    return (unit.options || []).map(opt => `
        <label class="opt-label">
            <input type="checkbox" ${unit.selectedOptions.includes(opt.id) ? 'checked' : ''} 
                onchange="toggleWargear(${wb.id}, ${unit.instanceId || 0}, '${opt.id}', ${isHero})">
            ${opt.name}
        </label>
    `).join('');
}

// Logic for stacking +/- buttons
window.changeCount = (wbId, unitId, optionsStr, delta) => {
    const wb = warbands.find(w => w.id === wbId);
    const options = optionsStr ? optionsStr.split(',') : [];
    
    if (delta > 0) {
        addUnitToWarband(wbId, unitId);
        // Apply the same options to the newly added unit
        const newUnit = wb.units[wb.units.length - 1];
        newUnit.selectedOptions = [...options];
    } else {
        const idx = wb.units.findIndex(u => u.id === unitId && u.selectedOptions.sort().join(',') === options.sort().join(','));
        if (idx > -1) wb.units.splice(idx, 1);
    }
    updateArmyUI();
};

window.showWarriorPicker = (wbId) => {
    // For now, we simple-add a default warrior for the demo
    // You can replace this with a modal window
    const firstWarrior = currentArmyData.warriors[0].id;
    addUnitToWarband(wbId, firstWarrior);
};

// Global Add Hero (Starts a new warband)
window.addUnitToArmy = (id, type) => {
    if (type === 'hero') addWarband(id);
    else alert("Please add a Hero first to start a warband!");
};

function renderCatalog() {
    heroGrid.innerHTML = currentArmyData.heroes.map(hero => `
        <div class="unit-card">
            <img src="${hero.image}">
            <div class="unit-card-body">
                <h4>${hero.name}</h4>
                <small>${hero.rank}</small>
                <button class="btn-add" onclick="addWarband('${hero.id}')">Start Warband</button>
            </div>
        </div>
    `).join('');
}

initApp();
