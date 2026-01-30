/**
 * MESBG Army Builder - Logic Engine
 * Handles dynamic JSON loading, unique unit instances, and wargear point calculation.
 */

// --- State Management ---
let currentArmyData = null;
let mySelectedUnits = [];

// --- DOM Elements ---
const armySelector = document.getElementById('army-selector');
const heroGrid = document.getElementById('hero-grid');
const warriorGrid = document.getElementById('warrior-grid');
const selectedContainer = document.getElementById('selected-units');
const pointsDisplay = document.getElementById('total-points');
const clearBtn = document.getElementById('clear-btn');

// --- Initialization ---

/**
 * Loads the army manifest and populates the dropdown menu automatically.
 */
async function initApp() {
    try {
        const response = await fetch('./data/armies.json');
        if (!response.ok) throw new Error('Could not find armies.json manifest');
        
        const armyList = await response.json();

        // Clear "Loading" state and populate
        armySelector.innerHTML = '<option value="">-- Choose an Army List --</option>';
        armyList.forEach(army => {
            const option = document.createElement('option');
            option.value = army.file;
            option.textContent = army.name;
            armySelector.appendChild(option);
        });
    } catch (err) {
        console.error("Initialization error:", err);
        armySelector.innerHTML = '<option value="">Error loading army list</option>';
    }
}

// --- Event Listeners ---

// Handle changing the army selection
armySelector.addEventListener('change', async (e) => {
    const fileName = e.target.value;
    if (!fileName) {
        clearCatalog();
        return;
    }

    try {
        const response = await fetch(`./data/${fileName}`);
        if (!response.ok) throw new Error(`Could not load ${fileName}`);
        
        currentArmyData = await response.json();
        renderCatalog();
    } catch (err) {
        console.error("Fetch error:", err);
        alert("Error loading the selected army file.");
    }
});

// Clear the entire list
clearBtn.addEventListener('click', () => {
    if (mySelectedUnits.length > 0 && confirm("Discard your current army list?")) {
        mySelectedUnits = [];
        updateArmyUI();
    }
});

// --- Core Functions ---

function clearCatalog() {
    heroGrid.innerHTML = '';
    warriorGrid.innerHTML = '';
}

/**
 * Renders the available units (Heroes and Warriors) with images and "Add" buttons.
 */
function renderCatalog() {
    heroGrid.innerHTML = currentArmyData.heroes.map(hero => createUnitCard(hero, 'hero')).join('');
    warriorGrid.innerHTML = currentArmyData.warriors.map(warrior => createUnitCard(warrior, 'warrior')).join('');
}

function createUnitCard(unit, type) {
    return `
        <div class="unit-card">
            <div class="image-container">
                <img src="${unit.image}" alt="${unit.name}" onerror="this.src='https://via.placeholder.com/150?text=No+Image'">
                <div class="points-badge">${unit.points} pts</div>
            </div>
            <div class="unit-card-body">
                <h3>${unit.name}</h3>
                <button class="btn-add" onclick="addUnitToArmy('${unit.id}', '${type}')">Add to Warband</button>
            </div>
        </div>
    `;
}

/**
 * Adds a new instance of a unit to the user's current army.
 */
window.addUnitToArmy = (id, type) => {
    const source = type === 'hero' ? currentArmyData.heroes : currentArmyData.warriors;
    const template = source.find(u => u.id === id);

    if (!template) return;

    // Create unique instance so checkboxes only affect THIS specific model
    const newInstance = {
        ...JSON.parse(JSON.stringify(template)), // Deep copy to prevent template pollution
        instanceId: Date.now() + Math.random(),
        selectedOptions: []
    };

    mySelectedUnits.push(newInstance);
    updateArmyUI();
};

/**
 * Removes a specific instance of a unit from the list.
 */
window.removeUnit = (instanceId) => {
    mySelectedUnits = mySelectedUnits.filter(u => u.instanceId !== instanceId);
    updateArmyUI();
};

/**
 * Toggles wargear on or off for a specific unit instance.
 */
window.toggleOption = (instanceId, optionId) => {
    const unit = mySelectedUnits.find(u => u.instanceId === instanceId);
    if (!unit) return;

    const optIndex = unit.selectedOptions.indexOf(optionId);
    if (optIndex > -1) {
        unit.selectedOptions.splice(optIndex, 1);
    } else {
        unit.selectedOptions.push(optionId);
    }
    updateArmyUI();
};

/**
 * Updates the right-hand sidebar and recalculates the total points.
 */
function updateArmyUI() {
    let grandTotal = 0;

    selectedContainer.innerHTML = mySelectedUnits.map(unit => {
        let unitTotal = unit.points;
        
        // Calculate points and build HTML for options
        const optionsHtml = (unit.options || []).map(opt => {
            const isChecked = unit.selectedOptions.includes(opt.id);
            if (isChecked) unitTotal += opt.points;

            return `
                <label class="wargear-checkbox">
                    <input type="checkbox" 
                        ${isChecked ? 'checked' : ''} 
                        onchange="toggleOption(${unit.instanceId}, '${opt.id}')">
                    <span>${opt.name} (+${opt.points})</span>
                </label>
            `;
        }).join('');

        grandTotal += unitTotal;

        return `
            <div class="selected-unit-item">
                <div class="selected-unit-header">
                    <span class="unit-name">${unit.name}</span>
                    <span class="unit-cost">${unitTotal} pts</span>
                </div>
                <div class="options-container">
                    ${optionsHtml}
                </div>
                <button class="remove-btn" onclick="removeUnit(${unit.instanceId})">Remove</button>
            </div>
        `;
    }).join('');

    pointsDisplay.innerText = grandTotal;
}

// Start the app
initApp();
