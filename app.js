// State management
let currentArmyData = null;
let mySelectedUnits = [];

// DOM Elements
const armySelector = document.getElementById('army-selector');
const heroGrid = document.getElementById('hero-grid');
const warriorGrid = document.getElementById('warrior-grid');
const selectedContainer = document.getElementById('selected-units');
const pointsDisplay = document.getElementById('total-points');

// 1. Fetch JSON based on selection
armySelector.addEventListener('change', async (e) => {
    const fileName = e.target.value;
    if (!fileName) {
        clearDisplay();
        return;
    }

    try {
        const response = await fetch(`./data/${fileName}`);
        if (!response.ok) throw new Error('Network response was not ok');
        currentArmyData = await response.json();
        renderCatalog();
    } catch (err) {
        console.error("Error loading army JSON:", err);
        alert("Could not load the army list. Make sure the JSON file exists in the /data folder.");
    }
});

function clearDisplay() {
    heroGrid.innerHTML = '';
    warriorGrid.innerHTML = '';
}

// 2. Render Units to the Catalog (Left Side)
function renderCatalog() {
    heroGrid.innerHTML = currentArmyData.heroes.map(hero => createCard(hero, 'hero')).join('');
    warriorGrid.innerHTML = currentArmyData.warriors.map(warrior => createCard(warrior, 'warrior')).join('');
}

function createCard(unit, type) {
    return `
        <div class="unit-card">
            <div class="image-container">
                <img src="${unit.image}" alt="${unit.name}" loading="lazy">
                <div class="points-badge">${unit.points} pts</div>
            </div>
            <div class="unit-card-body">
                <h3>${unit.name}</h3>
                <button class="btn-add" onclick="addUnit('${unit.id}', '${type}')">Add to List</button>
            </div>
        </div>
    `;
}

// 3. Army List Logic
window.addUnit = (id, type) => {
    const source = type === 'hero' ? currentArmyData.heroes : currentArmyData.warriors;
    const unitTemplate = source.find(u => u.id === id);
    
    // Create a unique instance of the unit
    const newInstance = {
        ...unitTemplate,
        instanceId: Date.now() + Math.random(), // Unique ID for this specific model
        selectedOptions: [] // Array to hold IDs of selected wargear
    };
    
    mySelectedUnits.push(newInstance);
    updateArmyUI();
};

window.removeUnit = (instanceId) => {
    mySelectedUnits = mySelectedUnits.filter(u => u.instanceId !== instanceId);
    updateArmyUI();
};

window.toggleOption = (instanceId, optionId) => {
    const unit = mySelectedUnits.find(u => u.instanceId === instanceId);
    if (!unit) return;

    const index = unit.selectedOptions.indexOf(optionId);
    if (index > -1) {
        unit.selectedOptions.splice(index, 1);
    } else {
        unit.selectedOptions.push(optionId);
    }
    updateArmyUI();
};

// 4. Update the Sidebar UI
function updateArmyUI() {
    let grandTotal = 0;

    selectedContainer.innerHTML = mySelectedUnits.map(unit => {
        // Calculate this specific unit's total cost
        let unitCost = unit.points;
        const optionsHtml = (unit.options || []).map(opt => {
            const isChecked = unit.selectedOptions.includes(opt.id);
            if (isChecked) unitCost += opt.points;
            
            return `
                <label class="wargear-checkbox">
                    <input type="checkbox" 
                        ${isChecked ? 'checked' : ''} 
                        onchange="toggleOption(${unit.instanceId}, '${opt.id}')">
                    <span>${opt.name} (+${opt.points})</span>
                </label>
            `;
        }).join('');

        grandTotal += unitCost;

        return `
            <div class="selected-unit-item">
                <div class="selected-unit-header">
                    <span class="unit-name">${unit.name}</span>
                    <span class="unit-cost">${unitCost} pts</span>
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

document.getElementById('clear-btn').addEventListener('click', () => {
    if(confirm("Are you sure you want to clear your entire list?")) {
        mySelectedUnits = [];
        updateArmyUI();
    }
});
