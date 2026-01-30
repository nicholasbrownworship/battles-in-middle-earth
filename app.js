/**
 * MESBG Army Builder - Full Warband Logic
 */

// --- State ---
let currentArmyData = null;
let warbands = []; 

// --- Constants ---
const RANKS = {
    "Legend": 18,
    "Valor": 15,
    "Fortitude": 12,
    "Minor": 6,
    "Independent": 0
};

// --- DOM Elements ---
const armySelector = document.getElementById('army-selector');
const heroGrid = document.getElementById('hero-grid');
const warriorGrid = document.getElementById('warrior-grid');
const selectedContainer = document.getElementById('selected-units');
const pointsDisplay = document.getElementById('total-points');

// --- Initialization ---

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
    } catch (e) {
        console.error("Could not load manifest. Ensure data/armies.json exists.", e);
    }
}

// --- Loading Army Data ---

armySelector.addEventListener('change', async (e) => {
    const fileName = e.target.value;
    if (!fileName) return;

    try {
        const response = await fetch(`./data/${fileName}`);
        currentArmyData = await response.json();
        
        // Reset state for new army
        warbands = [];
        updateArmyUI();
        renderCatalog();
    } catch (e) {
        console.error("Error loading army file:", e);
    }
});

// --- Catalog Rendering ---

function renderCatalog() {
    // Render Heroes
    heroGrid.innerHTML = currentArmyData.heroes.map(hero => `
        <div class="unit-card">
            <div class="image-container">
                <img src="${hero.image}" alt="${hero.name}" onerror="this.src='https://via.placeholder.com/150?text=No+Image'">
                <div class="points-badge">${hero.points} pts</div>
            </div>
            <div class="unit-card-body">
                <h3>${hero.name}</h3>
                <small class="rank-badge">${hero.rank}</small>
                <button class="btn-add" onclick="createNewWarband('${hero.id}')">Start Warband</button>
            </div>
        </div>
    `).join('');

    // Render Warriors
    renderWarriorCatalog();
}

function renderWarriorCatalog() {
    warriorGrid.innerHTML = currentArmyData.warriors.map(warrior => {
        // Create a button for each active warband
        const warbandButtons = warbands.map((wb, index) => `
            <button class="btn-mini-add" onclick="addUnitToWarband(${wb.id}, '${warrior.id}')">
                Add to Warband ${index + 1}
            </button>
        `).join('');

        return `
            <div class="unit-card">
                <div class="image-container">
                    <img src="${warrior.image}" alt="${warrior.name}" onerror="this.src='https://via.placeholder.com/150?text=No+Image'">
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

// --- Core Logic ---

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
    renderWarriorCatalog(); // Refresh buttons on the left
};

window.addUnitToWarband = (warbandId, unitId) => {
    const wb = warbands.find(w => w.id === warbandId);
    const template = currentArmyData.warriors.find(u => u.id === unitId);
    
    const max = RANKS[wb.hero.rank] || 0;
    if (wb.units.length >= max) {
        alert(`${wb.hero.name} cannot lead more than ${max} warriors.`);
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

// --- UI Refresh & Grouping ---

function updateArmyUI() {
    let grandTotal = 0;
    selectedContainer.innerHTML = '';

    warbands.forEach((wb, wbIdx) => {
        const wbDiv = document.createElement('div');
        wbDiv.className = 'warband-container';

        // Hero Calculation
        let heroCost = wb.hero.points;
        wb.hero.selectedOptions.forEach(oid => {
            heroCost += wb.hero.options.find(o => o.id === oid).points;
        });
        grandTotal += heroCost;

        // Smart Grouping for Warriors
        const groups = {};
        wb.units.forEach(u => {
            // Sort options so that [shield, bow] is same as [bow, shield]
            const configKey = u.id + "|" + [...u.selectedOptions].sort().join(',');
            if (!groups[configKey]) {
                groups[configKey] = { data: u, count: 0 };
            }
            groups[configKey].count++;
        });

        const warriorsHtml = Object.values(groups).map(group => {
            let unitCost = group.data.points;
            group.data.selectedOptions.forEach(oid => {
                unitCost += group.data.options.find(o => o.id === oid).points;
            });
            grandTotal += (unitCost * group.count);

            return `
                <div class="unit-stack">
                    <div class="stack-header">
                        <span><strong>${group.count}x</strong> ${group.data.name}</span>
                        <span>${unitCost * group.count} pts</span>
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

    pointsDisplay.innerText = grandTotal;
}

/**
 * MESBG Bow Limit Logic
 */

function calculateBowStats() {
    let totalModels = 0;
    let totalBows = 0;

    warbands.forEach(wb => {
        // Count Hero (Heroes usually don't count toward the limit, 
        // but they DO count as a model in the army total)
        totalModels++;
        if (hasBow(wb.hero)) totalBows++;

        // Count Warriors
        wb.units.forEach(unit => {
            totalModels++;
            if (hasBow(unit)) totalBows++;
        });
    });

    const bowLimit = Math.ceil(totalModels / 3);
    return { totalModels, totalBows, bowLimit };
}

// Helper to check if a unit has a bow (either innate or selected)
function hasBow(unit) {
    // 1. Check if "Bow" is in the selected options IDs
    const hasSelectedBow = unit.selectedOptions.some(optId => 
        optId.toLowerCase().includes('bow') || optId.toLowerCase().includes('great_bow')
    );

    // 2. Check if the unit has a "natural" bow (defined in your JSON)
    const hasInnateBow = unit.innateWargear && unit.innateWargear.includes('bow');

    return hasSelectedBow || hasInnateBow;
}

// Updated UI Update Function (Partial)
function updateArmyUI() {
    // ... [existing grandTotal logic] ...

    const stats = calculateBowStats();
    
    // Create a warning color if over the limit
    const bowColor = stats.totalBows > stats.bowLimit ? '#ef4444' : '#eab308';

    // Inject this into your header or a specific stats bar
    document.getElementById('army-stats-bar').innerHTML = `
        <div class="stat-item">Models: <strong>${stats.totalModels}</strong></div>
        <div class="stat-item" style="color: ${bowColor}">
            Bows: <strong>${stats.totalBows} / ${stats.bowLimit}</strong>
            ${stats.totalBows > stats.bowLimit ? ' <small>(OVER LIMIT)</small>' : ''}
        </div>
    `;

    // ... [rest of the UI rendering] ...
}

// --- Helper Functions for Grouped Units ---

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
    
    // Find one unit in the stack to modify
    const unit = wb.units.find(u => u.id === unitId && u.selectedOptions.sort().join(',') === currentOpts.sort().join(','));
    
    if (unit) {
        const idx = unit.selectedOptions.indexOf(toggleOptId);
        if (idx > -1) unit.selectedOptions.splice(idx, 1);
        else unit.selectedOptions.push(toggleOptId);
    }
    updateArmyUI();
};

initApp();
