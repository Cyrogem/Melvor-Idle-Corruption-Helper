// ==UserScript==
// @name         Melvor Idle Corruption Helper
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Automate your RNG
// @author       Cyrogem
// @match        https://*.melvoridle.com/*
// @exclude      https://wiki.melvoridle.com/*
// @grant        none
// ==/UserScript==

const skillSpecificModifiers = [
  40, 95, 103, 104, 107, 108, 132,
]
let allTraitsWanted = {}
let newDesireTrait = -1
let newDesireValue = -1
let newDesireSlot = -1
let newDesireSkill = -1
let iterations = 0
let lostItems = 0
let rolls = 0

let activeModifiers = [];


function CyrogemRollCorruption(){
  if (newDesireSlot < 0){
    window.alert('Please select a slot to roll for')
    return;
  }
  let equipmentSlot = newDesireSlot
  let cost = getRandomModifierCost(equipmentSlot);
  let keepTrying = true
  let mods = {}
  lostItems = 0
  rolls = 0

  // Test to make sure we have the things
  let atLeastOneKey = false
  for(var key in allTraitsWanted) {
    atLeastOneKey = true
    var value = allTraitsWanted[key];
    //console.log(key + ' ' + value)
  }

  if (!atLeastOneKey){
    window.alert('Please have at least one desire')
    return;
  }

  // Re-roll
  for(let i = 0; i < iterations && keepTrying; i++){
    rolls++
    // Will only roll down to 10 left to avoid screwing people over automatically
    //console.log(cost + ' ' + equippedItems[equipmentSlot])
    if (gp >= cost && equippedItems[equipmentSlot] > 0) {
      gp -= cost;
      updateGP();
      let tier = getRandomModifierTier(equipmentSlot);
      let chanceToDestroy = getRandomModifiersDestroyChance(tier);
      // Do we lose the item
      if (rollPercentage(chanceToDestroy)) {
        lostItems++
        let qty = getItemQtyRandomModifier(equippedItems[equipmentSlot]);
        if (qty[0] > 1) {
            if (equipmentSlot === CONSTANTS.equipmentSlot.Quiver && ammo > 1) {
                ammo--;
                equipmentSets[selectedEquipmentSet].ammo--;
                updateAmmo();
            } else
                updateItemInBank(qty[1], equippedItems[equipmentSlot], -1);
        } else {
            equippedItems[equipmentSlot] = 0;
            equipmentSets[selectedEquipmentSet].equipment[equipmentSlot] = 0;
            setEquipmentSet(selectedEquipmentSet);
        }
      } else {
        mods = rollRandomModifiers(tier, "equipment", equipmentSlot);
        keepTrying = !CyrogemCheckCorruption(mods)
      }
    } else {
      rolls--
      break;
    }  
  }
  updateRandomModifierInfo(equipmentSlot);
  updateHTMLRandomMod(equipmentSlot, mods);
  window.alert('We ' + (keepTrying ? 'failed' : 'succeeded') + ' after ' + rolls + ' re-rolls and lost ' + lostItems + ' to the void')
}

function CyrogemCheckCorruption(mods){
  let success = false
  for (let i = 0; i < mods.length && !success; i++) {
    let theMod = mods[i].modifier
    let theValue = mods[i].value
    //console.log(theMod + ' ' + theValue)
    // Is the value a list
    if (theValue.length) {
      // This is a niche event, is this something we are looking for
      // Get it out of it's inner shell
      theValue = theValue[0]
      let theSkillName = skillName[theValue[0]]
      //console.log('skill name = ' + theSkillName)
      // Check if we have this defined as a desire
      if (allTraitsWanted[theMod] !== undefined && allTraitsWanted[theMod][theSkillName] !== undefined){
        // We have it defined, is it high enough of a value
        if (allTraitsWanted[theMod][theSkillName] <= theValue[1]){
          success = true
        }
      }
    }
    else{
      if (allTraitsWanted[theMod] !== undefined && allTraitsWanted[theMod] <= theValue) {
        success = true
      }
    }
  }
  // If we have one of the ones we want, return true
  return success
}

function CyrogemAddDesire(){
  if (newDesireValue === -1 || newDesireValue === '' || newDesireTrait === -1 || (skillSpecificModifiers.includes(newDesireTrait) && newDesireSkill === -1)){
    window.alert('Please Select a Slot, Desired Trait(s), Desired Value(s), and a Desired Skill if aplicable')
    return;
  }

  let newmod = activeModifiers[newDesireTrait]
  // Is this a special case where we need a skill specified
  if(skillSpecificModifiers.includes(newDesireTrait)){
    // Initial setup in case this is our first one
    if (allTraitsWanted[newmod] === undefined){
      allTraitsWanted[newmod] = {}
    }
    // Assign this with the skillName
    allTraitsWanted[newmod][skillName[newDesireSkill]] = newDesireValue
  } else {
    allTraitsWanted[newmod] = newDesireValue
  }

  CyrogemUpdateDesires()
  
  // Debugging
  /*
  for(var key in allTraitsWanted) {
    var value = allTraitsWanted[key];
    if(typeof value === 'object' && value !== null){
      for(var key2 in value){
        console.log(
          'My path is: allTraitsWanted[' + key + '][' + key2 + ']' +
          '\nand I equal ' + allTraitsWanted[key][key2]
        )
      }
    } else {
      console.log(key + ' ' + value)
    }
  }
  */
}

function CyrogemRemoveDesire(trait, skill=null){
  // Easy one first
  //console.log(allTraitsWanted[trait] + ' before')
  if (skill === null){
    delete allTraitsWanted[trait];
  } else {
    var value = allTraitsWanted[trait];
    if(typeof value === 'object' && value !== null){
      delete value[skill];
    }
  }
  //console.log(allTraitsWanted.trait + ' after')
  CyrogemUpdateDesires()
}

function CyrogemUpdateDesires(){
  CyrogemUpdatePrediction()
  //const displayElement = document.getElementById('cyrogem-current-desires')
  let displayHTML = ''
  let atLeastOneTrait = false
  
  //displayElement.innerHTML = 
  displayHTML +=
  '<h5 class="font-w700 font-size-sm text-center text-success m-1 mb-2">Desired Mods. Click to remove one.</h5>'
  // Create a button for every current desire to show and allow it to be clicked to remove said desire
  for(var trait in allTraitsWanted) {
    atLeastOneTrait = true
    let value = allTraitsWanted[trait]
    // Is this a skill specific desire
    if (typeof value === 'object' && value !== null){
      for(var skill in value){
        let indexOfName = skillName.indexOf(skill)
        let theFinalValue = allTraitsWanted[trait][skill]
        //displayElement.innerHTML += '<button type="button" class="btn btn-dark m-1" id="kill-desire-' + trait +'-'+ skill + '" aria-label="">' + printPlayerModifier(trait, [indexOfName, theFinalValue])[0] + '</button>'
        displayHTML += '<button type="button" class="btn btn-dark m-1" id="kill-desire-' + trait +'-'+ skill + '" aria-label="">' + printPlayerModifier(trait, [indexOfName, theFinalValue])[0] + '</button>'
        // let option = document.getElementById('kill-desire-' + trait +'-'+ skill)
        // if(option !== null){
        //   option.addEventListener("click", () => CyrogemRemoveDesire(trait,skill))
        //   console.log(trait + ' ' + skill + ' added listener')
        // }
        //desireHTML += '<a class="dropdown-item" id="kill-desire-' + trait +'-'+ skill + '">' + printPlayerModifier(trait, [skillName.indexof(skill), allTraitsWanted[trait][skill]]) + '</a>'
      }
    } else {
      //displayElement.innerHTML += '<button type="button" class="btn btn-dark m-1" id="kill-desire-' + trait + '" aria-label="">' + printPlayerModifier(trait, value)[0] + '</button>'
      displayHTML += '<button type="button" class="btn btn-dark m-1" id="kill-desire-' + trait + '" aria-label="">' + printPlayerModifier(trait, value)[0] + '</button>'
      //document.getElementById('kill-desire-' + trait).addEventListener("click", () => CyrogemRemoveDesire(trait))
      //desireHTML += '<a class="dropdown-item" id="kill-desire-' + trait + '">' + printPlayerModifier(trait, [skillName.indexof(skill), value]) + '</a>'
    }
  }

  if(!atLeastOneTrait){
    //displayElement.innerHTML += "Choose at least one desire"
    displayHTML += "Choose at least one desire"
  }

  //document.getElementById('cyrogem-current-desires').insertAdjacentHTML('afterbegin', displayHTML)
  document.getElementById('cyrogem-current-desires').innerHTML = displayHTML

  CyrogemSetupEverySingleButtonAgain()
}

function CyrogemUpdatePrediction(){
  let predictionHTML = ''
  // Assemble info only needed here
  let costPerRoll = newDesireSlot >= 0 ? getRandomModifierCost(newDesireSlot) : 0
  let tierOfRoll = newDesireSlot >= 0 ? getRandomModifierTier(newDesireSlot) : 0
  let maxValue = getRandomModifierMaxValue(tierOfRoll) - 1
  let items = newDesireSlot >= 0 ? getItemQtyRandomModifier(equippedItems[newDesireSlot])[0] : 0
  let predictedNumberOfActualRolls = iterations
  let rollsUntilNoItems = tierOfRoll <= 0 ? 0 : Math.floor(items / (getRandomModifiersDestroyChance(tierOfRoll) / 100))

  // Find our limiting factor, either attempts, items, or gold
  if (rollsUntilNoItems < predictedNumberOfActualRolls){
    predictedNumberOfActualRolls = rollsUntilNoItems
  }
  if (gp / costPerRoll < predictedNumberOfActualRolls){
    predictedNumberOfActualRolls = Math.floor(gp / costPerRoll)
  }

  // Calculate odds
  let oddsOfGettingWhatYouWant = 0.0

  for(var trait in allTraitsWanted){
    let value = allTraitsWanted[trait]
    // It's not simple we need to take value into account
    if(typeof value === 'object' && value !== null){
      for(var skill in value){
        oddsOfGettingWhatYouWant += Math.max((((maxValue - allTraitsWanted[trait][skill]) / maxValue) / skillName.length) / activeModifiers.length, 0)
      }
    } else {
      oddsOfGettingWhatYouWant += Math.max(((maxValue - allTraitsWanted[trait]) / maxValue) / activeModifiers.length, 0)
    }
  }
  let oddsOfFailure = 1.0 - oddsOfGettingWhatYouWant

  let finalSuccessChance = 1 - Math.pow(oddsOfFailure, predictedNumberOfActualRolls)
  const headerOpen = '<h5 class="font-w400 font-size-sm text-center text-combat-smoke m-1 mb-2">'
  // Time to assemble the information to the user
  predictionHTML += '<h3 class="font-w600 font-size-sm text-center text-danger m-1 mb-2">Corruption Prediction</h3>' + 
  headerOpen + 'Predicted rolls accounting for gold and item loss: <span class="font-w600 text-warning">' + predictedNumberOfActualRolls + '</span></h5>' +
  headerOpen + 'Chance of success in those rolls: ' + CyrogemRollChanceColor(finalSuccessChance) + '</h5>' +
  headerOpen + 'Predicted Max Cost: <img src="assets/media/main/coins.svg" class="skill-icon-xs mr-2">' + (costPerRoll * predictedNumberOfActualRolls) + '</h5>' +
  headerOpen + '50% success rate achieved at: <span class="font-w600 text-warning">' + CyrogemRollsForFiftyPercent(oddsOfFailure) + '</h5>'

  //document.getElementById('cyrogem-predictive-display').insertAdjacentHTML('beforeend', predictionHTML)
  document.getElementById('cyrogem-predictive-display').innerHTML = predictionHTML
}

function CyrogemRollsForFiftyPercent(failChancePerRoll){
  if(failChancePerRoll < 0.0 || failChancePerRoll >= 1.0){
    return 'Never</span>';
  } else {
    let loops = 1
    let failChance = failChancePerRoll
    while (loops < 10000 && failChance > 0.5){
      loops++
      failChance = failChance * failChancePerRoll
    }
    if (failChance > 0.5){
      return 'Too Many</span>';
    } else {
      let value = loops + ' rolls</span>'
      return value;
    }
  }
}

function CyrogemRollChanceColor(successChance){
  let textMod = ''
  if(successChance <= 0.33){
    textMod = 'text-danger'
  } else if (successChance <= 0.66){
    textMod = 'text-warning'
  } else {
    textMod = 'text-success'
  }
  let output = '<span class="font-w600 ' + textMod + '">' + (Math.round(successChance * 10000) / 100) + '%</span>'
  return output;
}

function CyrogemDesiredTrait(index){
  newDesireTrait = index
  document.getElementById('cyrogem-desire-display-span').textContent = activeModifiers[newDesireTrait]
  // Does this target specific skills
  if (skillSpecificModifiers.includes(newDesireTrait)){
    console.log('more info needed')
    document.getElementById('cyrogem-desire-extra').className = ""
  } else {
    document.getElementById('cyrogem-desire-extra').className = "d-none"
  }
}

function CyrogemDesiredSkill(index){
  console.log(index)
  newDesireSkill = index
  document.getElementById('cyrogem-desire-extra-span').textContent = skillName[newDesireSkill]
}

function CyrogemDesiredValue(){
  const valueHTML = document.getElementById('cyrogem-desire-value')
  newDesireValue = valueHTML.value
  document.getElementById('cyrogem-desire-display-value').textContent = newDesireValue
}

function CyrogemDesiredTries(){
  const valueHTML = document.getElementById('cyrogem-iterations')
  iterations = valueHTML.value
  document.getElementById('cyrogem-iterations-display').textContent = iterations
  CyrogemUpdatePrediction()
}

function CyrogemSelectSlot(slot){
  newDesireSlot = slot
  let slotName = 'Slot'
  switch(slot){
    case 0: slotName = 'Helmet'; break;
    case 1: slotName = 'Body'; break;
    case 2: slotName = 'Legs'; break;
    case 3: slotName = 'Boots'; break;
    case 4: slotName = 'Weapon'; break;
    case 5: slotName = 'Shield'; break;
    case 6: slotName = 'Amulet'; break;
    case 7: slotName = 'Ring'; break;
    case 8: slotName = 'Gloves'; break;
    case 9: slotName = 'Quiver'; break;
    case 10: slotName = 'Cape'; break;
  }
  document.getElementById('cyrogem-desire-slot-span').textContent = slotName
  CyrogemUpdatePrediction()
}

function CyrogemLoadCorruptionHelper () {
  let bannedModifiers = ["golbinRaidWaveSkipCostReduction", "golbinRaidIncreasedMinimumFood", "golbinRaidIncreasedMaximumAmmo", "golbinRaidIncreasedMaximumRunes", "golbinRaidPrayerUnlocked", "golbinRaidIncreasedPrayerLevel", "golbinRaidIncreasedPrayerPointsStart", "golbinRaidIncreasedPrayerPointsWave", "golbinRaidPassiveSlotUnlocked", "golbinRaidIncreasedStartingRuneCount", "golbinRaidStartingWeapon", "freeBonfires", "autoSlayerUnlocked", "increasedEquipmentSets", "dungeonEquipmentSwapping", "increasedTreeCutLimit", "increasedAttackRolls", "decreasedAttackRolls", "increasedBankSpaceShop", "decreasedBankSpaceShop", "increasedGPFromSales", "decreasedGPFromSales", ];
  activeModifiers = [];
  for (let i = 0; i < Object.keys(playerModifiersTemplate).length; i++) {
    if (!bannedModifiers.includes(Object.keys(playerModifiersTemplate)[i]))
    activeModifiers.push(Object.keys(playerModifiersTemplate)[i]);
  }
  
  // Setup the entire block
  let playerDesiresHTML = 
  '<div class="block block-rounded block-link-pop border-top border-info border-4x row no-gutters">'


  // First Column
  playerDesiresHTML +=
  '<div class="col-sm-6 col-lg-4"><div class=block-content>'
  // Setup Desire Dropdown
  playerDesiresHTML +=
  '<div class="dropdown"><button type="button" class="btn btn-secondary dropdown-toggle mt-2" id="cyrogem-desire-dropdown" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">Desired Attribute</button>' +
  '<div class="dropdown-menu font-size-sm" aria-labelledby="cyrogem-desire-dropdown">'
  for (let i = 0; i < activeModifiers.length; i++){
    if (activeModifiers[i].includes('decrease') || activeModifiers[i].includes('aprilFools')) continue;
    playerDesiresHTML += '<a class="dropdown-item" id="cyrogemDesiredTrait' + i + '" style="text-transform: capitalize;">' + activeModifiers[i] + '</a>'
  }
  playerDesiresHTML += '</div></div>' +
  '<span class="font-w400 font-size-sm text-combat-smoke ml-2">Desire: <span id="cyrogem-desire-display-span" style="text-transform: capitalize;">Select One</span></span>'
  // Oh god we have to add another check for specific skill ones like "increasedSmithingMasteryXP"
  playerDesiresHTML +=
  '<div class="d-none" id="cyrogem-desire-extra">' +
  // We need a new dropdown for all the skills
  '<div class="dropdown"><button type="button" class="btn btn-secondary dropdown-toggle mt-2" id="cyrogem-desire-extra-dropdown" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">Skill</button>' +
  '<div class="dropdown-menu font-size-sm" aria-labelledby="cyrogem-desire-extra-dropdown">'
  for (let i = 0; i < skillName.length; i++){
    playerDesiresHTML += '<a class="dropdown-item" id="cyrogemDesiredSkill' + i + '" style="text-transform: capitalize;">' + skillName[i] + '</a>'
  }
  playerDesiresHTML += '</div></div>' +
  '<span class="font-w400 font-size-sm text-combat-smoke ml-2">Target Skill: <span id="cyrogem-desire-extra-span" style="text-transform: capitalize;">Select One</span></span>' +
  '</div>'

  // What value do you want
  playerDesiresHTML += '<div class="col-12"><input type="number" class="form-control m-1" id="cyrogem-desire-value" placeholder="0"></div>' +
  '<span class="font-w400 font-size-sm text-combat-smoke ml-2">Minimum Level: <span id="cyrogem-desire-display-value">Enter above</span></span>'
  
  // What slot are we changing
  playerDesiresHTML +=
  '<div class="col-12"><button type="button" class="swal2-confirm swal2-styled" id="cyrogem-add-desire" aria-label="" style="display: inline-block; border-left-color: rgb(48, 133, 214); border-right-color: rgb(48, 133, 214);">Add Desire</button></div>'
  
  // Close the content block and column div
  playerDesiresHTML += '</div></div>'
  

  // Second column
  playerDesiresHTML += '<div class="col-sm-3"><div class=block-content>' +
  '<div class="col-12"><input type="number" class="form-control m-1" id="cyrogem-iterations" placeholder="0"></div>' +
  '<span class="font-w400 font-size-sm text-combat-smoke ml-2">Try how many times<br>(Assuming you can afford it): <span id="cyrogem-iterations-display">0</span></span>'
  
  playerDesiresHTML += '<div class="dropdown"><button type="button" class="btn btn-secondary dropdown-toggle mt-2" id="cyrogem-slot-dropdown" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" onclick="">' +
  'Slot to Roll For</button><div class="dropdown-menu font-size-sm" aria-labelledby="cyrogem-slot-dropdown">' +
  '<a class="dropdown-item" id="cyrogemSelectSlot0">Helmet</a>' +
  '<a class="dropdown-item" id="cyrogemSelectSlot1">Body</a>' +
  '<a class="dropdown-item" id="cyrogemSelectSlot2">Legs</a>' +
  '<a class="dropdown-item" id="cyrogemSelectSlot3">Boots</a>' +
  '<a class="dropdown-item" id="cyrogemSelectSlot4">Weapon</a>' +
  '<a class="dropdown-item" id="cyrogemSelectSlot5">Shield</a>' +
  '<a class="dropdown-item" id="cyrogemSelectSlot6">Amulet</a>' +
  '<a class="dropdown-item" id="cyrogemSelectSlot7">Ring</a>' +
  '<a class="dropdown-item" id="cyrogemSelectSlot8">Gloves</a>' +
  '<a class="dropdown-item" id="cyrogemSelectSlot9">Quiver</a>' +
  '<a class="dropdown-item" id="cyrogemSelectSlot10">Cape</a>' +
  '</div></div>'+
  '<span class="font-w400 font-size-sm text-combat-smoke ml-2">Slot: <span id="cyrogem-desire-slot-span">Select One</span></span>'

  // Close the block and column div
  playerDesiresHTML += '</div></div>'


  // Third column
  playerDesiresHTML += '<div class="col-md-5"><div class=block-content>'

  // Display current wishes 
  playerDesiresHTML += '<div class="text-center" id="cyrogem-current-desires"></div>'

  // Close the block and column div
  playerDesiresHTML += '</div></div>'


  // NEW ROW
  playerDesiresHTML += '<div class="col-12"><div class="block-content text-center">'

  // Display aggregate info
  playerDesiresHTML += '<div class="col-md-10" id="cyrogem-predictive-display"></div>' +
  '<div class="col-md-2">' + // Button to roll
  '<button type="button" class="swal2-confirm swal2-styled" id="cyrogem-roll-button" aria-label="" style="display: inline-block; border-left-color: rgb(48, 133, 214); border-right-color: rgb(48, 133, 214);">Roll For It</button></div>'
  // Close the column, row, and box div
  playerDesiresHTML += '</div></div></div>'
  
  //document.getElementById('aprilfools2021-container').insertAdjacentHTML('afterbegin', playerDesiresHTML) 
  playerDesiresHTML += document.getElementById('aprilfools2021-container').innerHTML
  document.getElementById('aprilfools2021-container').innerHTML = playerDesiresHTML

  CyrogemUpdateDesires()
}

function CyrogemSetupEverySingleButtonAgain(){
  // Setup trait links
  for(let i = 0; i < activeModifiers.length; i++){
    //console.log(i)
    let option = document.getElementById('cyrogemDesiredTrait' + i)
    if(option !== null){
      option.addEventListener("click", () => CyrogemDesiredTrait(i))
    }
  }
  // Setup skill links
  for(let i = 0; i < skillName.length; i++){
    let option = document.getElementById('cyrogemDesiredSkill' + i)
    if(option !== null){
      option.addEventListener("click", () =>  CyrogemDesiredSkill(i))
    }
  }
  // Setup slot links
  for(let i = 0; i <= 10; i++){
    //console.log(i)
    document.getElementById('cyrogemSelectSlot' + i).addEventListener("click", () => CyrogemSelectSlot(i))
  }
  // Setup value link
  document.getElementById('cyrogem-desire-value').addEventListener("input", () => CyrogemDesiredValue())
  document.getElementById('cyrogem-desire-value').addEventListener("change", () => CyrogemDesiredValue())
  // Setup quantity link
  document.getElementById('cyrogem-iterations').addEventListener("input", () => CyrogemDesiredTries())
  // Setup roll button
  document.getElementById('cyrogem-roll-button').addEventListener("click", () => CyrogemRollCorruption())
  // Setup desire button
  document.getElementById('cyrogem-add-desire').addEventListener("click", () => CyrogemAddDesire())

  // Setup buttons
  for(var trait in allTraitsWanted){
    let value = allTraitsWanted[trait]
    if(typeof value === 'object' && value !== null){
      for(var skill in value){
        document.getElementById('kill-desire-' + trait +'-'+ skill).addEventListener("click", () => CyrogemRemoveDesire(trait,skill))
      }
    } else {
      document.getElementById('kill-desire-' + trait).addEventListener("click", () => CyrogemRemoveDesire(trait))
    }
  }
}

(function () {
  function loadScript() {
      //console.log(window.isLoaded + ' ' + !window.currentlyCatchingUp);// + ' ' + (typeof unsafeWindow !== 'undefined') ? ' ' + unsafeWindow.isLoaded + ' ' + !unsafeWindow.currentlyCatchingUp : '')
      if ((window.isLoaded && !window.currentlyCatchingUp)
          || (typeof unsafeWindow !== 'undefined' && unsafeWindow.isLoaded && !unsafeWindow.currentlyCatchingUp)) {
          // Only load script after game has opened
          clearInterval(scriptLoader);
          CyrogemLoadCorruptionHelper();
      }
  }

  const scriptLoader = setInterval(loadScript, 200);
})();

/*
function rollRandomModifiers(count=3, key, equipmentSlot=0) {
  if (key === "equipment") {
    if (randomModifiers.equipment[equipmentSlot] === undefined)
    randomModifiers.equipment[equipmentSlot] = {};
    deleteKeysFromObject(randomModifiers.equipment[equipmentSlot]);
  }
  let bannedModifiers = ["golbinRaidWaveSkipCostReduction", "golbinRaidIncreasedMinimumFood", "golbinRaidIncreasedMaximumAmmo", "golbinRaidIncreasedMaximumRunes", "golbinRaidPrayerUnlocked", "golbinRaidIncreasedPrayerLevel", "golbinRaidIncreasedPrayerPointsStart", "golbinRaidIncreasedPrayerPointsWave", "golbinRaidPassiveSlotUnlocked", "golbinRaidIncreasedStartingRuneCount", "golbinRaidStartingWeapon", "freeBonfires", "autoSlayerUnlocked", "increasedEquipmentSets", "dungeonEquipmentSwapping", "increasedTreeCutLimit", "increasedAttackRolls", "decreasedAttackRolls", "increasedBankSpaceShop", "decreasedBankSpaceShop", "increasedGPFromSales", "decreasedGPFromSales", ];
  let activeModifiers = [];
  for (let i = 0; i < Object.keys(playerModifiersTemplate).length; i++) {
    if (!bannedModifiers.includes(Object.keys(playerModifiersTemplate)[i]))
        activeModifiers.push(Object.keys(playerModifiersTemplate)[i]);
  }
  let rng = [];
  for (let i = 0; i < count; i++) {
      let rngMod = Math.floor(Math.random() * activeModifiers.length);
      let value;
      let maxValue = getRandomModifierMaxValue(count);
      if (playerModifiersTemplate[activeModifiers[rngMod]].length)
      // ------------ value is skill index 0, value index 1 ----------------------------------------------------------------------------------------------------------------------
          value = [[Math.floor(Math.random() * 21), Math.floor(Math.random() * maxValue)]];
      else
          value = Math.floor(Math.random() * maxValue);
      if ((activeModifiers[rngMod] === "increasedMaxHitFlat" || activeModifiers[rngMod] === "increasedMaxHitpoints") && value > 10)
          value = 10;
      if ((activeModifiers[rngMod] === "decreasedMaxHitFlat" || activeModifiers[rngMod] === "decreasedMaxHitpoints") && value > 10)
          value = 10;
      rng.push({
          modifier: activeModifiers[rngMod],
          value: value
      });
      if (key === "equipment")
          randomModifiers.equipment[equipmentSlot][activeModifiers[rngMod]] = value;
  }
  return rng;
}

function getEquipmentCorruption2(equipmentSlot) {
  let cost = getRandomModifierCost(equipmentSlot);
  if (gp >= cost && equippedItems[equipmentSlot] > 0) {
      gp -= cost;
      updateGP();
      let tier = getRandomModifierTier(equipmentSlot);
      let chanceToDestroy = getRandomModifiersDestroyChance(tier);
      if (rollPercentage(chanceToDestroy)) {
          let qty = getItemQtyRandomModifier(equippedItems[equipmentSlot]);
          if (qty[0] > 1) {
              if (equipmentSlot === CONSTANTS.equipmentSlot.Quiver && ammo > 1) {
                  ammo--;
                  equipmentSets[selectedEquipmentSet].ammo--;
                  updateAmmo();
              } else
                  updateItemInBank(qty[1], equippedItems[equipmentSlot], -1);
          } else {
              equippedItems[equipmentSlot] = 0;
              equipmentSets[selectedEquipmentSet].equipment[equipmentSlot] = 0;
              setEquipmentSet(selectedEquipmentSet);
          }
          updateRandomModifierInfo(equipmentSlot);
          notifyPlayer(CONSTANTS.skill.Attack, "Your item was destroyed :(", "danger");
      } else {
          let mods = rollRandomModifiers(tier, "equipment", equipmentSlot);
          updateHTMLRandomMod(equipmentSlot, mods);
      }
  }
}
function loadCorruption() {
  for (let i = 0; i < Object.keys(randomModifiers.equipment).length; i++) {
      let html = `<h5 class="font-w600 font-size-sm mb-2">Current Modifiers:</h5>`;
      for (let j = 0; j < Object.keys(randomModifiers.equipment[Object.keys(randomModifiers.equipment)[i]]).length; j++) {
          let modifier = printPlayerModifier(Object.keys(randomModifiers.equipment[Object.keys(randomModifiers.equipment)[i]])[j], randomModifiers.equipment[Object.keys(randomModifiers.equipment)[i]][Object.keys(randomModifiers.equipment[Object.keys(randomModifiers.equipment)[i]])[j]]);
          html += `<h5 class="font-w400 font-size-sm mb-1 ${modifier[1]}">${modifier[0]}</h5>`;
      }
      $("#corruption-equipment-slot-" + Object.keys(randomModifiers.equipment)[i]).html(html);
  }
}
function updateHTMLRandomMod(equipmentSlot, mods) {
  let html = `<h5 class="font-w600 font-size-sm mb-2">Current Modifiers:</h5>`;
  for (let i = 0; i < mods.length; i++) {
      if (mods[i].value.length)
          modifier = printPlayerModifier(mods[i].modifier, mods[i].value[0]);
      else
          modifier = printPlayerModifier(mods[i].modifier, mods[i].value);
      html += `<h5 class="font-w400 font-size-sm mb-1 ${modifier[1]}">${modifier[0]}</h5>`;
  }
  $("#corruption-equipment-slot-" + equipmentSlot).html(html);
  updatePlayerStats();
}
function getRandomModifiersDestroyChance(tier) {
  let chance = 0;
  if (tier >= 4)
      chance = 10;
  else if (tier >= 3)
      chance = 20;
  else if (tier >= 2)
      chance = 30;
  else if (tier >= 1)
      chance = 40;
  return chance;
}
function getRandomModifierMaxValue(tier) {
  let value = 0;
  if (tier >= 4)
      value = 100;
  else if (tier >= 3)
      value = 76;
  else if (tier >= 2)
      value = 51;
  else if (tier >= 1)
      value = 31;
  return value;
}
function getRandomModifierCost(equipmentSlot) {
  let cost = 0;
  if (equippedItems[equipmentSlot] <= 0)
      return cost;
  cost = items[equippedItems[equipmentSlot]].sellsFor;
  return cost;
}
function getRandomModifierTier(equipmentSlot) {
  let tier = 0;
  if (equippedItems[equipmentSlot] <= 0)
      return tier;
  if (items[equippedItems[equipmentSlot]].sellsFor >= 400000)
      tier = 4;
  else if (items[equippedItems[equipmentSlot]].sellsFor >= 10000)
      tier = 3;
  else if (items[equippedItems[equipmentSlot]].sellsFor >= 200)
      tier = 2;
  else
      tier = 1;
  return tier;
}
function updateRandomModifierInfo(equipmentSlot) {
  if (equippedItems[equipmentSlot] > 0) {
      let cost = getRandomModifierCost(equipmentSlot);
      let tier = getRandomModifierTier(equipmentSlot);
      let qty = getItemQtyRandomModifier(equippedItems[equipmentSlot]);
      $("#corruption-equipment-slot-" + equipmentSlot + "-img").attr("src", items[equippedItems[equipmentSlot]].media);
      $("#corruption-equipment-slot-" + equipmentSlot + "-info").html(`Qty: ${qty[0]} | Tier: ${tier}<br>Cost: <img src="assets/media/main/coins.svg" class="skill-icon-xs mr-2">${numberWithCommas(cost)}`);
  } else {
      $("#corruption-equipment-slot-" + equipmentSlot + "-img").attr("src", "assets/media/bank/" + emptyGear[equipmentSlot] + ".svg");
      $("#corruption-equipment-slot-" + equipmentSlot + "-info").html(`Equip an item pls`);
  }
}
function getItemQtyRandomModifier(itemID) {
  let qty = 1;
  let bankID = getBankId(itemID);
  if (bankID >= 0)
      qty += bank[bankID].qty;
  if (items[itemID].equipmentSlot === CONSTANTS.equipmentSlot.Quiver)
      qty += ammo - 1;
  return [qty, bankID];
}
function deleteKeysFromObject(object) {
  Object.keys(object).forEach((el)=>{
      delete object[el];
  }
  );
}

*/
