/**
 * MESBG Army Builder - Full Integrated Logic
 * Features: Warbands, Smart Stacking, Bow Limits, Army Rules, 
 * GitHub Compatibility, and Dynamic Image Fallbacks.
 */

// --- 1. Global State ---
let currentArmyData = null;
let warbands = []; 

// --- 2. MESBG Constants ---
const RANKS = {
    "Legend": 18,
    "Valor": 15,
    "Fortitude": 12,
    "Minor": 6,
    "Independent": 0
};

// --- 3. DOM Elements ---
const armySelector = document.getElementById('army-selector');
const heroGrid = document.getElementById('hero-grid');
const warriorGrid = document.getElementById('warrior-grid');
const selectedContainer = document.getElementById('selected-units');

// --- 4. Initialization & Data Fetching ---

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    try {
        const response = await fetch(`data/armies.json?t=${Date.now()}`);
        if (!response.ok) throw new Error("Manifest not found");
        const armyList = await response.json();
        
        armySelector.innerHTML = '<option value="">-- Choose an Army --</option>';
        armyList.forEach(army => {
            const opt = document.createElement('option');
            opt.value = army.file;
            opt.textContent = army.name;
            armySelector.appendChild(opt);
        });
        console.log("App Initialized: Armies Loaded");
    } catch (e) {
        console.error("Initialization error:", e);
        if(armySelector) armySelector.innerHTML = '<option>Error loading armies.json</option>';
    }
}

armySelector.addEventListener('change', async (e) => {
    const fileName = e.target.value;
    if (!fileName) return;

    try {
        const response = await fetch(`data/${fileName}?t=${Date.now()}`);
        if (!response.ok) throw new Error(`Could not load ${fileName}`);
        currentArmyData = await response.json();
        
        warbands = [];
        updateArmyUI();
        renderCatalog();
    } catch (e) {
        console.error("Load Error:", e);
        alert(`Failed to load ${fileName}. Check file case-sensitivity and JSON syntax!`);
    }
});

// --- 5. Catalog Rendering ---

function renderCatalog() {
    if (!currentArmyData) return;

    // Render Hero Cards
    heroGrid.innerHTML = currentArmyData.heroes.map(hero => `
        <div class="unit-card">
            <div class="image-container">
                <img src="${hero.image}" alt="${hero.name}" 
                     onerror="this.onerror=null; this.src='https://placehold.co/150x150/1a202c/ffd700?text=${hero.name.replace(/ /g, '+')}';">
                <div class="points-badge">${hero.points} pts</div>
            </div>
            <div class="unit-card-body">
                <h3>${hero.name}</h3>
                <small class="rank-badge">${hero.rank}</small>
                <button class="btn-add" onclick="createNewWarband('${hero.id}')">Start Warband</button>
            </div>
        </div>
    `).join('');

    renderWarriorCatalog();
}

function renderWarriorCatalog() {
    if (!currentArmyData) return;

    warriorGrid.innerHTML = currentArmyData.warriors.map(warrior => {
        const warbandButtons = warbands.map((wb, index) => `
            <button class="btn-mini-add" onclick="addUnitToWarband(${wb.id}, '${warrior.id}')">
                Add to Warband ${index + 1}
            </button>
        `).join('');

        return `
            <div class="unit-card">
                <div class="image-container">
                    <img src="${warrior.image}" alt="${warrior.name}" 
                         onerror="this.onerror=null; this.src='https://placehold.co/150x150/1a202c/ffd700?text=${warrior.name.replace(/ /g, '+')}';">
                    <div class="points-badge">${warrior.points} pts</div>
                </div>
                <div class="unit-card-body">
                    <h3>${warrior.name}</h3>
                    <div class="warband-selector-list">
                        ${warbandButtons || '<small style="color:gray">Add a Hero first</small>'}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// --- 6. Core Logic Functions ---

window.createNewWarband = (heroId) => {
    const template = currentArmyData.heroes.find(h => h.id === heroId);
    const newWarband = {
        id: Date.now(),
        hero: { 
            ...JSON.parse(JSON.stringify(template)), 
            instanceId: Date.now() + 1,
            selectedOptions: [] 
        },
        units: []
    };
    warbands.push(newWarband);
    updateArmyUI();
    renderWarriorCatalog();
};

window.addUnitToWarband = (warbandId, unitId) => {
    const wb = warbands.find(w => w.id === warbandId);
    const template = currentArmyData.warriors.find(u => u.id === unitId);
    
    const maxCapacity = RANKS[wb.hero.rank] || 0;
    if (wb.units.length >= maxCapacity) {
        alert(`${wb.hero.name} cannot lead more than ${maxCapacity} warriors.`);
        return;
    }

    wb.units.push({
        ...JSON.parse(JSON.stringify(template)),
        instanceId: Date.now() + Math.random(),
        selectedOptions: []
    });
    updateArmyUI();
};

window.toggleWargear = (warbandId, instanceId, optionId, isHero) => {
    const wb = warbands.find(w => w.id === warbandId);
    const unit = isHero ? wb.hero : wb.units.find(u => u.instanceId === instanceId);
    
    const idx = unit.selectedOptions.indexOf(optionId);
    if (idx > -1) unit.selectedOptions.splice(idx, 1);
    else unit.selectedOptions.push(optionId);
    
    updateArmyUI();
};

window.removeWarband = (wbId) => {
    warbands = warbands.filter(w => w.id !== wbId);
    updateArmyUI();
    renderWarriorCatalog();
};

// --- 7. UI Update (Rules, Stacking, Bows) ---

function updateArmyUI() {
    let grandTotal = 0;
    let totalModels = 0;
    let totalBows = 0;
    
    selectedContainer.innerHTML = '';

    // Render Army Rule Box
    if (currentArmyData) {
        const ruleDiv = document.createElement('div');
        ruleDiv.className = 'army-rule-box';
        
        const displayTitle = currentArmyData.armyName || currentArmyData.name || "Army List";
        const displayRule = currentArmyData.armyRule 
            ? currentArmyData.armyRule.replace(/\n/g, '<br>') 
            : "No specific army rules found.";

        ruleDiv.innerHTML = `
            <div class="rule-header">${displayTitle}</div>
            <div class="rule-content">${displayRule}</div>
        `;
        selectedContainer.appendChild(ruleDiv);
    }

    warbands.forEach((wb, wbIdx) => {
        const wbDiv = document.createElement('div');
        wbDiv.className = 'warband-container';

        // Hero Logic
        totalModels++;
        let heroCost = wb.hero.points;
        wb.hero.selectedOptions.forEach(oid => {
            const opt = wb.hero.options.find(o => o.id === oid);
            if (opt) heroCost += opt.points;
        });
        if (hasBow(wb.hero)) totalBows++;
        grandTotal += heroCost;

        // Grouping/Stacking Logic
        const groups = {};
        wb.units.forEach(u => {
            const configKey = u.id + "|" + [...u.selectedOptions].sort().join(',');
            if (!groups[configKey]) {
                groups[configKey] = { data: u, count: 0 };
            }
            groups[configKey].count++;
        });

        const warriorsHtml = Object.values(groups).map(group => {
            totalModels += group.count;
            let unitCostPerModel = group.data.points;
            group.data.selectedOptions.forEach(oid => {
                const opt = group.data.options.find(o => o.id === oid);
                if (opt) unitCostPerModel += opt.points;
            });
            
            if (hasBow(group.data)) totalBows += group.count;
            grandTotal += (unitCostPerModel * group.count);

            return `
                <div class="unit-stack">
                    <div class="stack-header">
                        <span><strong>${group.count}x</strong> ${group.data.name}</span>
                        <span>${unitCostPerModel * group.count} pts</span>
                    </div>
                    <div class="options-row">
                        ${(group.data.options || []).map(opt => `
                            <label class="opt-label">
                                <input type="checkbox" ${group.data.selectedOptions.includes(opt.id) ? 'checked' : ''} 
                                    onchange="modifyStackGear(${wb.id}, '${group.data.id}', '${group.data.selectedOptions.join(',')}', '${opt.id}')">
                                ${opt.name}
                            </label>
                        `).join('')}
                    </div>
                    <div class="stack-controls">
                        <button onclick="adjustCount(${wb.id}, '${group.data.id}', '${group.data.selectedOptions.join(',')}', -1)">-</button>
                        <button onclick="adjustCount(${wb.id}, '${group.data.id}', '${group.data.selectedOptions.join(',')}', 1)">+</button>
                    </div>
                </div>
            `;
        }).join('');

        wbDiv.innerHTML = `
            <div class="warband-header">
                <h3>Warband ${wbIdx + 1}: ${wb.hero.name}</h3>
                <button class="btn-text-red" onclick="removeWarband(${wb.id})">Delete</button>
            </div>
            <div class="hero-options">
                ${(wb.hero.options || []).map(opt => `
                    <label class="opt-label">
                        <input type="checkbox" ${wb.hero.selectedOptions.includes(opt.id) ? 'checked' : ''} 
                            onchange="toggleWargear(${wb.id}, ${wb.hero.instanceId}, '${opt.id}', true)">
                        ${opt.name} (+${opt.points})
                    </label>
                `).join('')}
            </div>
            <div class="warband-summary">${wb.units.length} / ${RANKS[wb.hero.rank]} Warriors</div>
            <div class="warband-list">${warriorsHtml}</div>
        `;
        selectedContainer.appendChild(wbDiv);
    });

    renderStatsBar(grandTotal, totalModels, totalBows);
}

function renderStatsBar(points, models, bows) {
    const bowLimit = Math.ceil(models / 3);
    const isOverLimit = bows > bowLimit;
    const statsBar = document.getElementById('army-stats-bar');
    
    if (statsBar) {
        statsBar.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">Points</span>
                <span class="stat-value">${points}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Models</span>
                <span class="stat-value">${models}</span>
            </div>
            <div class="stat-item" style="color: ${isOverLimit ? '#ef4444' : '#f59e0b'}">
                <span class="stat-label">Bows</span>
                <span class="stat-value">${bows} / ${bowLimit}</span>
            </div>
        `;
    }
}

// --- 8. Helper Functions ---

function hasBow(unit) {
    const hasSelectedBow = unit.selectedOptions && unit.selectedOptions.some(optId => 
        optId.toLowerCase().includes('bow') || optId.toLowerCase().includes('great_bow')
    );
    const hasInnateBow = unit.innateWargear && unit.innateWargear.includes('bow');
    return hasSelectedBow || hasInnateBow;
}

window.adjustCount = (wbId, unitId, optionsStr, delta) => {
    const wb = warbands.find(w => w.id === wbId);
    const options = optionsStr ? optionsStr.split(',') : [];
    if (delta > 0) {
        addUnitToWarband(wbId, unitId);
        wb.units[wb.units.length - 1].selectedOptions = [...options];
    } else {
        const idx = wb.units.findIndex(u => u.id === unitId && u.selectedOptions.sort().join(',') === options.sort().join(','));
        if (idx > -1) wb.units.splice(idx, 1);
    }
    updateArmyUI();
};

window.modifyStackGear = (wbId, unitId, currentOptionsStr, toggleOptId) => {
    const wb = warbands.find(w => w.id === wbId);
    const currentOpts = currentOptionsStr ? currentOptionsStr.split(',') : [];
    const unit = wb.units.find(u => u.id === unitId && u.selectedOptions.sort().join(',') === currentOpts.sort().join(','));
    if (unit) {
        const idx = unit.selectedOptions.indexOf(toggleOptId);
        if (idx > -1) unit.selectedOptions.splice(idx, 1);
        else unit.selectedOptions.push(toggleOptId);
    }
    updateArmyUI();
};
