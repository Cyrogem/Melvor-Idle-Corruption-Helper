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


let allTraitsWanted = {}
let newDesireTrait = -1
let newDesireValue = -1
let newDesireSlot = -1
let iterations = 0
let lostItems = 0
let rolls = 0

let activeModifiers = [];


function CyrogemRollCorruption(){
  if (newDesireSlot === -1 || newDesireValue === -1 || newDesireTrait === -1){// || allTraitsWanted === {}) {
    window.alert('invalid roll conditions')
    return;
  }
  
  let equipmentSlot = newDesireSlot
  let cost = getRandomModifierCost(equipmentSlot);
  let keepTrying = true
  let mods = {}
  lostItems = 0
  rolls = 0
  let newmod = activeModifiers[newDesireTrait]
  allTraitsWanted[newmod] = newDesireValue

  for(var key in allTraitsWanted) {
    var value = allTraitsWanted[key];
    console.log(key)
    // do something with "key" and "value" variables
  }
  // Re-roll
  for(let i = 0; i < iterations && keepTrying; i++){
    rolls++
    // Will only roll down to 10 left to avoid screwing people over automatically
    //console.log(cost + ' ' + equippedItems[equipmentSlot])
    if (gp >= cost && equippedItems[equipmentSlot] > 10) {
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
        keepTrying = !CheckCorruption(mods)
      }
    } else {
      rolls--
      break;
    }  
  }
  updateRandomModifierInfo(equipmentSlot);
  updateHTMLRandomMod(equipmentSlot, mods);
  window.alert('We ' + (keepTrying ? 'failed' : 'succeeded') + ' after ' + rolls + ' re-rolls')
}
function CheckCorruption(mods){
  let success = false
  for (let i = 0; i < mods.length && !success; i++) {
    let theMod = mods[i].modifier
    console.log(mods[i].modifier + ' ' + mods[i].value)
    if (mods[i].value.length) {
      if (allTraitsWanted[mods[i].modifier] !== undefined && allTraitsWanted[mods[i].modifier] <= mods[i].value[0]){
        success = true
      }
    }
    else{
      let theMod = mods[i].modifier
      if (allTraitsWanted[mods[i].modifier] !== undefined && allTraitsWanted[mods[i].modifier] <= mods[i].value) {
        success = true
      }
    }
  }
  // If we have one of the ones we want, return true
  return success
}
function CyrogemMaxCost(){
  let info = 'Max Cost: ' + '<img src="assets/media/main/coins.svg" class="skill-icon-xs mr-2">'
}
function CyrogemDesiredTrait(index){
  newDesireTrait = index
  document.getElementById('cyrogem-desire-display-span').textContent = activeModifiers[newDesireTrait]
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
}

function CyrogemLoadCorruptionHelper () {
  let bannedModifiers = ["golbinRaidWaveSkipCostReduction", "golbinRaidIncreasedMinimumFood", "golbinRaidIncreasedMaximumAmmo", "golbinRaidIncreasedMaximumRunes", "golbinRaidPrayerUnlocked", "golbinRaidIncreasedPrayerLevel", "golbinRaidIncreasedPrayerPointsStart", "golbinRaidIncreasedPrayerPointsWave", "golbinRaidPassiveSlotUnlocked", "golbinRaidIncreasedStartingRuneCount", "golbinRaidStartingWeapon", "freeBonfires", "autoSlayerUnlocked", "increasedEquipmentSets", "dungeonEquipmentSwapping", "increasedTreeCutLimit", "increasedAttackRolls", "decreasedAttackRolls", "increasedBankSpaceShop", "decreasedBankSpaceShop", "increasedGPFromSales", "decreasedGPFromSales", ];
  activeModifiers = [];
  for (let i = 0; i < Object.keys(playerModifiersTemplate).length; i++) {
    if (!bannedModifiers.includes(Object.keys(playerModifiersTemplate)[i]))
    activeModifiers.push(Object.keys(playerModifiersTemplate)[i]);
  }
  
  // Setup Desire Dropdown
  let playerDesiresHTML = 
  '<div class="block block-rounded block-link-pop border-top border-info border-4x row no-gutters"><div class="col-3">' +
  '<div class="dropdown"><button type="button" class="btn btn-secondary dropdown-toggle mt-2" id="cyrogem-desire-dropdown" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">Desired Attribute</button>' +
  '<div class="dropdown-menu font-size-sm" aria-labelledby="cyrogem-desire-dropdown">'
  for (let i = 0; i < activeModifiers.length; i++){
    if (activeModifiers[i].includes('decrease') || activeModifiers[i].includes('aprilFools')) continue;
    playerDesiresHTML += '<a class="dropdown-item" id="cyrogemDesiredTrait' + i + '" style="text-transform: capitalize;">' + activeModifiers[i] + '</a>'
  }
  playerDesiresHTML += '</div></div>' +
  '<span class="font-w400 font-size-sm text-combat-smoke ml-2">Desire: <span id="cyrogem-desire-display-span" style="text-transform: capitalize;">Select One</span></span>'
  
  // What value do you want
  playerDesiresHTML += '<div class="col-12"><input type="number" class="form-control m-1" id="cyrogem-desire-value" placeholder="0"></div>' +
  '<span class="font-w400 font-size-sm text-combat-smoke ml-2">Minimum: <span id="cyrogem-desire-display-value">0</span></span>'
  
  // What slot are we changing
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

  // Close the column div
  playerDesiresHTML += '</div>'

  // Next column
  playerDesiresHTML += '<div class="col-3">' +
  '<div class="col-12"><input type="number" class="form-control m-1" id="cyrogem-iterations" placeholder="0"></div>' +
  '<span class="font-w400 font-size-sm text-combat-smoke ml-2">Try how many times<br>(Assuming you can afford it): <span id="cyrogem-iterations-display">0</span></span>'

  // Close the column div
  playerDesiresHTML += '</div>'

  // Next column
  playerDesiresHTML += '<div class="col-6">' +
  '<div class="col-12"><button type="button" class="swal2-confirm swal2-styled" id="cyrogem-roll-button" aria-label="" style="display: inline-block; border-left-color: rgb(48, 133, 214); border-right-color: rgb(48, 133, 214);">Roll For It</button></div>'
  
  // Close the column div
  playerDesiresHTML += '</div>'
  
  // Close the box div
  playerDesiresHTML += '</div>'
  
  playerDesiresHTML += document.getElementById('aprilfools2021-container').innerHTML
  document.getElementById('aprilfools2021-container').innerHTML = playerDesiresHTML
  
  // Setup trait links
  for(let i = 0; i < activeModifiers.length; i++){
    //console.log(i)
    let option = document.getElementById('cyrogemDesiredTrait' + i)
    if(option !== null){
      option.addEventListener("click", () => CyrogemDesiredTrait(i))
    }
  }
  // Setup slot links
  for(let i = 0; i <= 10; i++){
    //console.log(i)
    document.getElementById('cyrogemSelectSlot' + i).addEventListener("click", () => CyrogemSelectSlot(i))
  }
  // Setup value link
  document.getElementById('cyrogem-desire-value').addEventListener("input", () => CyrogemDesiredValue())
  // Setup quantity link
  document.getElementById('cyrogem-iterations').addEventListener("input", () => CyrogemDesiredTries())
  // Setup button
  document.getElementById('cyrogem-roll-button').addEventListener("click", () => CyrogemRollCorruption())
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
