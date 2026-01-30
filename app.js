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
    if (!fileName) return;

    try {
        const response = await fetch(`./data/${fileName}`);
        currentArmyData = await response.json();
        renderCatalog();
    } catch (err) {
        console.error("Error loading army JSON:", err);
    }
});

// 2. Render Units to the Screen
function renderCatalog() {
    heroGrid.innerHTML = currentArmyData.heroes.map(hero => createCard(hero, 'hero')).join('');
    warriorGrid.innerHTML = currentArmyData.warriors.map(warrior => createCard(warrior, 'warrior')).join('');
}

function createCard(unit, type) {
    return `
        <div class="unit-card">
            <img src="${unit.image}" alt="${unit.name}">
            <div class="unit-card-body">
                <h3>${unit.name}</h3>
                <p>${unit.points} pts</p>
                <button class="btn-add" onclick="addUnit('${unit.id}', '${type}')">Add to List</button>
            </div>
        </div>
    `;
}

// 3. Add to List Logic
window.addUnit = (id, type) => {
    const source = type === 'hero' ? currentArmyData.heroes : currentArmyData.warriors;
    const unit = source.find(u => u.id === id);
    
    mySelectedUnits.push({
        ...unit,
        instanceId: Date.now() + Math.random()
    });
    
    updateArmyUI();
};

window.removeUnit = (instanceId) => {
    mySelectedUnits = mySelectedUnits.filter(u => u.instanceId !== instanceId);
    updateArmyUI();
};

function updateArmyUI() {
    selectedContainer.innerHTML = mySelectedUnits.map(unit => `
        <div class="selected-unit-item">
            <div>
                <strong>${unit.name}</strong><br>
                <small>${unit.points} pts</small>
            </div>
            <button onclick="removeUnit(${unit.instanceId})" style="background:none; color:red; border:none; cursor:pointer; font-size:1.2rem;">&times;</button>
        </div>
    `).join('');

    const total = mySelectedUnits.reduce((sum, u) => sum + u.points, 0);
    pointsDisplay.innerText = total;
}

document.getElementById('clear-btn').addEventListener('click', () => {
    mySelectedUnits = [];
    updateArmyUI();
});
